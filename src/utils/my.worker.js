/*
  2022-05-23

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This is a JS Worker file for the main sqlite3 api. It loads
  sqlite3.js, initializes the module, and postMessage()'s a message
  after the module is initialized:

  {type: 'sqlite3-api', result: 'worker1-ready'}

  This seemingly superfluous level of indirection is necessary when
  loading sqlite3.js via a Worker. Instantiating a worker with new
  Worker("sqlite.js") will not (cannot) call sqlite3InitModule() to
  initialize the module due to a timing/order-of-operations conflict
  (and that symbol is not exported in a way that a Worker loading it
  that way can see it).  Thus JS code wanting to load the sqlite3
  Worker-specific API needs to pass _this_ file (or equivalent) to the
  Worker constructor and then listen for an event in the form shown
  above in order to know when the module has completed initialization.

  This file accepts a URL arguments to adjust how it loads sqlite3.js:

  - `sqlite3.dir`, if set, treats the given directory name as the
    directory from which `sqlite3.js` will be loaded.
*/


import { default as sqlite3InitModule } from 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs';
import sqlite3Wasm from 'node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm'

const OPFS_POOL_NAME='private-ai-opfs'

sqlite3InitModule({ 'wasmBinary': sqlite3Wasm, 'locateFile': function (path, prefix) { return '' } }).then((sqlite3) => {
  console.log("opfs:", sqlite3.capi.sqlite3_vfs_find("opfs"), sqlite3.oo1.OpfsDb)
 
  
  sqlite3.initWorker2API = function (poolUtil) {
    'use strict';
    const toss = (...args) => {
      throw new Error(args.join(' '));
    };
    if (!(globalThis.WorkerGlobalScope instanceof Function)) {
      toss('initWorker2API() must be run from a Worker thread.');
    }
    const sqlite3 = this.sqlite3 || toss('Missing this.sqlite3 object.');
    const DB = poolUtil.OpfsSAHPoolDb //sqlite3.oo1.DB;
    console.log("!!sqlite3",sqlite3)

    const getDbId = function (db) {
      let id = wState.idMap.get(db);
      if (id) return id;
      id = 'db#' + ++wState.idSeq + '@' + db.pointer;

      wState.idMap.set(db, id);
      return id;
    };

    const wState = {
      dbList: [],

      idSeq: 0,

      idMap: new WeakMap(),

      xfer: [],
      open: function (opt) {
        console.log("!!!!","now open db:",DB,opt)
        const db = new DB(opt);
        this.dbs[getDbId(db)] = db;
        if (this.dbList.indexOf(db) < 0) this.dbList.push(db);
        return db;
      },
      close: function (db, alsoUnlink) {
        if (db) {
          delete this.dbs[getDbId(db)];
          const filename = db.filename;
          console.log("!!close",sqlite3.wasm)
          console.log(sqlite3.wasm.exports)

          const pVfs = sqlite3.wasm.exports.sqlite3__wasm_db_vfs(db.pointer, 0);
          db.close();
          const ddNdx = this.dbList.indexOf(db);
          if (ddNdx >= 0) this.dbList.splice(ddNdx, 1);
          if (alsoUnlink && filename && pVfs) {
            sqlite3.wasm.exports.sqlite3__wasm_vfs_unlink(pVfs, filename);
          }
        }
        // if(globalThis.PoolUtil){
        //   console.log("close PoolUtil",globalThis.PoolUtil )
        //   globalThis.PoolUtil.removeVfs()
        // }
      },

      post: function (msg, xferList) {
        if (xferList && xferList.length) {
          globalThis.postMessage(msg, Array.from(xferList));
          xferList.length = 0;
        } else {
          globalThis.postMessage(msg);
        }
      },

      dbs: Object.create(null),

      getDb: function (id, require = true) {
        return (
          this.dbs[id] ||
          (require ? toss('Unknown (or closed) DB ID:', id) : undefined)
        );
      },
    };

    const affirmDbOpen = function (db = wState.dbList[0]) {
      return db && db.pointer ? db : toss('DB is not opened.');
    };

    const getMsgDb = function (msgData, affirmExists = true) {
      const db = wState.getDb(msgData.dbId, false) || wState.dbList[0];
      return affirmExists ? affirmDbOpen(db) : db;
    };

    const getDefaultDbId = function () {
      return wState.dbList[0] && getDbId(wState.dbList[0]);
    };

    const isSpecialDbFilename = (n) => {
      return '' === n || ':' === n[0];
    };

    const wMsgHandler = {
      open: function (ev) {
        const oargs = Object.create(null),
          args = ev.args || Object.create(null);
        if (args.simulateError) {
          toss('Throwing because of simulateError flag.');
        }
        const rc = Object.create(null);
        oargs.vfs = args.vfs;
        oargs.filename = args.filename || '';
        const db = wState.open(oargs);
        rc.filename = db.filename;
        rc.persistent = !!sqlite3.capi.sqlite3_js_db_uses_vfs(
          db.pointer,
          'opfs',
        );
        rc.dbId = getDbId(db);
        rc.vfs = db.dbVfsName();
        return rc;
      },

      close: function (ev) {
        const db = getMsgDb(ev, false);
        const response = {
          filename: db && db.filename,
        };
        if (db) {
          const doUnlink =
            ev.args && 'object' === typeof ev.args
              ? !!ev.args.unlink
              : false;
          wState.close(db, doUnlink);
        }
        return response;
      },

      exec: function (ev) {
        const rc =
          'string' === typeof ev.args
            ? { sql: ev.args }
            : ev.args || Object.create(null);
        if ('stmt' === rc.rowMode) {
          toss(
            "Invalid rowMode for 'exec': stmt mode",
            'does not work in the Worker API.',
          );
        } else if (!rc.sql) {
          toss("'exec' requires input SQL.");
        }
        const db = getMsgDb(ev);
        if (rc.callback || Array.isArray(rc.resultRows)) {
          db._blobXfer = wState.xfer;
        }
        const theCallback = rc.callback;
        let rowNumber = 0;
        const hadColNames = !!rc.columnNames;
        if ('string' === typeof theCallback) {
          if (!hadColNames) rc.columnNames = [];

          rc.callback = function (row, stmt) {
            wState.post(
              {
                type: theCallback,
                columnNames: rc.columnNames,
                rowNumber: ++rowNumber,
                row: row,
              },
              wState.xfer,
            );
          };
        }
        try {
          const changeCount = !!rc.countChanges
            ? db.changes(true, 64 === rc.countChanges)
            : undefined;
          db.exec(rc);
          if (undefined !== changeCount) {
            rc.changeCount =
              db.changes(true, 64 === rc.countChanges) - changeCount;
          }
          if (rc.callback instanceof Function) {
            rc.callback = theCallback;

            wState.post({
              type: theCallback,
              columnNames: rc.columnNames,
              rowNumber: null,
              row: undefined,
            });
          }
        } finally {
          delete db._blobXfer;
          if (rc.callback) rc.callback = theCallback;
        }
        return rc;
      },

      'config-get': function () {
        const rc = Object.create(null),
          src = sqlite3.config;
        ['bigIntEnabled'].forEach(function (k) {
          if (Object.getOwnPropertyDescriptor(src, k)) rc[k] = src[k];
        });
        rc.version = sqlite3.version;
        rc.vfsList = sqlite3.capi.sqlite3_js_vfs_list();
        rc.opfsEnabled = !!sqlite3.opfs;
        return rc;
      },

      export: function (ev) {
        const db = getMsgDb(ev);
        const response = {
          byteArray: sqlite3.capi.sqlite3_js_db_export(db.pointer),
          filename: db.filename,
          mimetype: 'application/x-sqlite3',
        };
        wState.xfer.push(response.byteArray.buffer);
        return response;
      },

      toss: function (ev) {
        toss('Testing worker exception');
      },

      'opfs-tree': async function (ev) {
        if (!sqlite3.opfs) toss('OPFS support is unavailable.');
        const response = await sqlite3.opfs.treeList();
        return response;
      },
    };

    globalThis.onmessage = async function (ev) {
      ev = ev.data;
      let result,
        dbId = ev.dbId,
        evType = ev.type;
      const arrivalTime = performance.now();
      try {
        if (
          wMsgHandler.hasOwnProperty(evType) &&
          wMsgHandler[evType] instanceof Function
        ) {
          result = await wMsgHandler[evType](ev);
        } else {
          toss('Unknown db worker message type:', ev.type);
        }
      } catch (err) {
        evType = 'error';
        result = {
          operation: ev.type,
          message: err.message,
          errorClass: err.name,
          input: ev,
        };
        if (err.stack) {
          result.stack =
            'string' === typeof err.stack
              ? err.stack.split(/\n\s*/)
              : err.stack;
        }
        if (0)
          sqlite3.config.warn(
            'Worker is propagating an exception to main thread.',
            'Reporting it _here_ for the stack trace:',
            err,
            result,
          );
      }
      if (!dbId) {
        dbId = result.dbId || getDefaultDbId();
      }

      wState.post(
        {
          type: evType,
          dbId: dbId,
          messageId: ev.messageId,
          workerReceivedTime: arrivalTime,
          workerRespondTime: performance.now(),
          departureTime: ev.departureTime,

          result: result,
        },
        wState.xfer,
      );
    };
    globalThis.postMessage({
      type: 'sqlite3-api',
      result: 'worker1-ready',
    });
  }.bind({ sqlite3 });

  //  sqlite3.initWorker1API()
  sqlite3.installOpfsSAHPoolVfs({name:OPFS_POOL_NAME}).then((poolUtil) => {
    // poolUtil contains utilities for managing the pool, described below.
    // VFS "opfs-sahpool" is now available, and poolUtil.OpfsSAHPoolDb
    // is a subclass of sqlite3.oo1.DB to simplify usage with
    // the oo1 API.
    // const db = new PoolUtil.OpfsSAHPoolDb('/my_test_db');
    console.debug("installOpfsSAHPoolVfs: create poolUtil")
    sqlite3.initWorker2API(poolUtil)
    globalThis.PoolUtil=poolUtil

  }).catch(function (err) {
    console.error("installOpfsSAHPoolVfs:", err);
  });
});
// sqlite3InitModule().then((sqlite3) => sqlite3.initWorker1API());
export default {}
