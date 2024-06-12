import log from 'loglevel';
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
declare module '@sqlite.org/sqlite-wasm' {
  export function sqlite3Worker1Promiser(...args: any): any
}

type Sqlite3Worker = (type: string, args: { [key: string]: any }) => any;
import WorkerScript from './my.worker.js'

let DBWorker: Worker;
let sqlite3Promiser: Sqlite3Worker;
export const initSQLite3 = async () => {
  try {
    log.trace('Loading and initializing SQLite3 module...');

    const promiser: Sqlite3Worker = await new Promise((resolve) => {
      sqlite3Worker1Promiser({
        onready: (_promiser: Sqlite3Worker) => resolve(_promiser),
        worker: () => {
          log.trace("new run worker", WorkerScript)
          //@ts-ignore
          DBWorker = WorkerScript();
          return DBWorker
        },
        onerror: (...args: any) => log.error('worker1 promiser error', ...args),
      });
    });

    log.trace('Done initializing. Running demo...');

    const configResponse = await promiser('config-get', {});
    sqlite3Promiser = promiser
    log.trace('Running SQLite3 version', configResponse.result.version.libVersion);


    // Your SQLite code here.
  } catch (err: any) {
    if (!(err instanceof Error)) {
      err = new Error(err.result.message);
    }
    log.error(err.name, err.message);
  }
};



export const createDB = async (filename: string) => {
  if (!sqlite3Promiser) {
    log.error("db not init")
    return
  }
  const openResponse = await sqlite3Promiser('open', {
    // filename: 'file:mydb.sqlite3?vfs=opfs',
    filename: filename,
  });
  const { dbId } = openResponse;
  log.trace("create db:", openResponse)
}

export const closeDB = async () => {
  if (!sqlite3Promiser) {
    log.error("db not init")
    return
  }
  const closeResponse = await sqlite3Promiser('close', {});
  const { dbId } = closeResponse;
  log.trace("close db:", closeResponse)
  if (DBWorker) {
    DBWorker.terminate()
  }
}

export const testDB = async () => {
  if (!sqlite3Promiser) {
    log.error("db not init")
    return
  }

  // await sqlite3Promiser('exec', { sql: 'CREATE TABLE IF NOT EXISTS t(a,b)' });
  // log.trace('Creating a table...');

  // log.trace('Insert some data using exec()...');
  // for (let i = 20; i <= 25; ++i) {
  //   await sqlite3Promiser('exec', {
  //     sql: 'INSERT INTO t(a,b) VALUES (?,?)',
  //     bind: [i, i * 2],
  //   });
  // }

  log.trace('Query data with exec()');
  let res: number[] = []
  await sqlite3Promiser('exec', {
    sql: 'SELECT a,b FROM t ORDER BY a LIMIT ?', //"SELECT strftime('%s', 'now') AS epoch",
    bind: [2],
    callback: (result: any) => {
      if (!result.row) {
        return;
      }
      res.push(result.row)
      log.trace(result.row);
    },
  });
  log.trace(`SELECT a FROM t ORDER BY a LIMIT 3 result:${res}`)

}


export class Statement {
  sql: string;
  promise: Sqlite3Worker;
  constructor(sql: string, promise: Sqlite3Worker) {
    this.sql = sql
    this.promise = promise
  }
  public async run(...args: (string | number | null)[]) {
    // arguments.callee.caller
    log.trace("SQL exec", this.sql, args)
    let res = await this.promise('exec', { sql: this.sql, bind: args });
    log.trace("SQL this result:", res)
    return res;
  }

  public async get(...args: (string | number | null)[]) {
    log.trace("SQL get", this.sql, args)
    let res: any[] = []
    await this.promise('exec', {
      sql: this.sql,
      bind: args,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row)
        log.trace(result.row);
      },
    });
    if (res.length >= 1)
      return res[0];
    return;
  }

  public async all(...args: (string | number | null)[]) {
    log.trace("SQL all", this.sql, args)
    let res: any[] = []
    let r = await this.promise('exec', {
      sql: this.sql,
      bind: args,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row[0])
        log.trace(result.row);
      },
    });
    log.trace("SQL all result:", r)
    return res
  }

}

export class DatabaseManager {
  // private static instance: ConversationChain | null = null;
  private static instance: DatabaseManager;
  private promise: Sqlite3Worker;

  private constructor(promise: Sqlite3Worker) {
    this.promise = promise
  }
  public prepare(sql: string) {
    return new Statement(sql, this.promise)
  }
  public async transaction(statesments: Statement[]) {
    if (!statesments) {
      return
    }

    let transSql = "BEGIN IMMEDIATE TRANSACTION; "
    if (statesments.length > 0) {
      // first strip(";"), then concat all sql in sqls array
      statesments.forEach(((statement) => {
        statement.sql
        transSql += statement.sql.replace(/;\s*/, "") + "; ";
      }))
    }

    transSql += "COMMIT;"
    log.trace("SQL transaction", transSql)
    let res = await this.promise('exec', { sql: transSql });
    return res

  }

  public async exec(sql: string) {
    log.trace("SQL exec", sql)
    let res = await this.promise('exec', { sql: sql });
    log.trace("SQL this result:", res)
    return res;
  }

  public async get(sql: string) {
    log.trace("SQL get", sql)
    let res: any[] = []
    await this.promise('exec', {
      sql: sql,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row)
        log.trace(result.row);
      },
    });
    if (res.length >= 1)
      return res[0];
    return;

  }

  public async all(sql: string) {
    log.trace("SQL all", sql)
    let res: any[] = []
    let r = await this.promise('exec', {
      sql: sql,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row[0])
        log.trace(result.row);
      },
    });
    log.trace("SQL all result:", r)
    return res
  }


  // public async transaction(sqls: string[]) {
  //   let transSql = "BEGIN IMMEDIATE TRANSACTION; "
  //   if (sqls.length > 0) {
  //     // first strip(";"), then concat all sql in sqls array
  //     sqls.forEach((sql) => {
  //       transSql += sql.replace(/;\s*/, "") + "; ";
  //     });
  //   }
  //   transSql += "COMMIT;"
  //   log.trace("SQL transaction",transSql)
  //   return await this.exec(transSql)
  // }

  public static getInstance() {

    if (!this.instance) {
      this.instance = new DatabaseManager(sqlite3Promiser);
    }
    return this.instance!;
  }
}
