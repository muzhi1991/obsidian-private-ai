// eslint-disable-next-line import/no-extraneous-dependencies

import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
// import "@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-worker1-bundler-friendly.mjs"
declare module '@sqlite.org/sqlite-wasm' {
  export function sqlite3Worker1Promiser(...args: any): any
}

type Sqlite3Worker = (type: string, args: { [key: string]: any }) => any;
import WorkerScript from './my.worker.js'

let DBWorker: Worker;
const log = console.log;
const error = console.error;
let sqlite3Promiser: Sqlite3Worker;
export const initSQLite3 = async () => {
  try {
    log('Loading and initializing SQLite3 module...');

    const promiser: Sqlite3Worker = await new Promise((resolve) => {
      sqlite3Worker1Promiser({
        onready: (_promiser: Sqlite3Worker) => resolve(_promiser),
        worker: () => {
          console.debug("new run worker", WorkerScript)
          //@ts-ignore
          DBWorker = WorkerScript();
          return DBWorker
        },
        onerror: (...args: any) => console.error('worker1 promiser error', ...args),
      });
    });

    log('Done initializing. Running demo...');

    const configResponse = await promiser('config-get', {});
    sqlite3Promiser = promiser
    log('Running SQLite3 version', configResponse.result.version.libVersion);


    // Your SQLite code here.
  } catch (err: any) {
    if (!(err instanceof Error)) {
      err = new Error(err.result.message);
    }
    error(err.name, err.message);
  }
};



export const createDB = async (filename: string) => {
  if (!sqlite3Promiser) {
    console.error("db not init")
    return
  }
  const openResponse = await sqlite3Promiser('open', {
    // filename: 'file:mydb.sqlite3?vfs=opfs',
    filename: filename,
  });
  const { dbId } = openResponse;
  console.debug("create db:", openResponse)
}

export const closeDB = async () => {
  if (!sqlite3Promiser) {
    console.error("db not init")
    return
  }
  const closeResponse = await sqlite3Promiser('close', {});
  const { dbId } = closeResponse;
  console.debug("close db:", closeResponse)
  if (DBWorker) {
    DBWorker.terminate()
  }
}

export const testDB = async () => {
  if (!sqlite3Promiser) {
    console.error("db not init")
    return
  }

  // await sqlite3Promiser('exec', { sql: 'CREATE TABLE IF NOT EXISTS t(a,b)' });
  // console.log('Creating a table...');

  // console.log('Insert some data using exec()...');
  // for (let i = 20; i <= 25; ++i) {
  //   await sqlite3Promiser('exec', {
  //     sql: 'INSERT INTO t(a,b) VALUES (?,?)',
  //     bind: [i, i * 2],
  //   });
  // }

  console.log('Query data with exec()');
  let res: number[] = []
  await sqlite3Promiser('exec', {
    sql: 'SELECT a,b FROM t ORDER BY a LIMIT ?', //"SELECT strftime('%s', 'now') AS epoch",
    bind:  [2],
    callback: (result: any) => {
      if (!result.row) {
        return;
      }
      res.push(result.row)
      console.log(result.row);
    },
  });
  console.log(`SELECT a FROM t ORDER BY a LIMIT 3 result:${res}`)

}


// export let initSQL=(async () => {
//   // try {
//     console.log('Loading and initializing SQLite3 module...!');

//     const promiser:any = await new Promise((resolve) => {
//       const _promiser = sqlite3Worker1Promiser({
//         onready: () => {
//           resolve(_promiser);
//         },
//       });
//     });

//     console.log('Done initializing. Running demo...');

//     let response;

//     response = await promiser('config-get', {});
//     console.log('Running SQLite3 version', response.result.version.libVersion);

//     response = await promiser('open', {
//       filename: 'file:worker-promiser.sqlite3?vfs=opfs',
//     });
//     const { dbId } = response;
//     console.log(
//       'OPFS is available, created persisted database at',
//       response.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
//     );

//     await promiser('exec', { dbId, sql: 'CREATE TABLE IF NOT EXISTS t(a,b)' });
//     console.log('Creating a table...');

//     console.log('Insert some data using exec()...');
//     for (let i = 20; i <= 25; ++i) {
//       await promiser('exec', {
//         dbId,
//         sql: 'INSERT INTO t(a,b) VALUES (?,?)',
//         bind: [i, i * 2],
//       });
//     }

//     console.log('Query data with exec()');
//     await promiser('exec', {
//       dbId,
//       sql: 'SELECT a FROM t ORDER BY a LIMIT 3',
//       callback: (result:any) => {
//         if (!result.row) {
//           return;
//         }
//         console.log(result.row);
//       },
//     });

//     await promiser('close', { dbId });
//   // } catch (err:any) {
//   //   if (!(err instanceof Error)) {
//   //     err = new Error(err.result.message);
//   //   }
//   //   console.error(err.name, err.message);
//   // }
// });

////////////////////////////////////////////////////
// const log = console.log;
// const error = console.error;


// export const initializeSQLite = async () => {
//   try {
//     log('Loading and initializing SQLite3 module...');

//     const promiser:any = await new Promise((resolve) => {
//       const _promiser = sqlite3Worker1Promiser({
//         onready: () => resolve(_promiser),
//       });
//     });

//     log('Done initializing. Running demo...');

//     const configResponse = await promiser('config-get', {});
//     log('Running SQLite3 version', configResponse.result.version.libVersion);

//     const openResponse = await promiser('open', {
//       filename: 'file:mydb.sqlite3?vfs=opfs',
//     });
//     const { dbId } = openResponse;
//     log(
//       'OPFS is available, created persisted database at',
//       openResponse.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
//     );
//     // Your SQLite code here.
//   } catch (err:any) {
//     if (!(err instanceof Error)) {
//       err = new Error(err.result.message);
//     }
//     error(err.name, err.message);
//   }
// };

// initializeSQLite();

export class Statement {
  sql: string;
  promise: Sqlite3Worker;
  constructor(sql:string,promise:Sqlite3Worker){
    this.sql=sql
    this.promise = promise
  }
  public async run(...args: (string | number| null)[]) {
    // arguments.callee.caller
    console.debug("SQL exec",this.sql,args)
    let res= await this.promise('exec', { sql: this.sql, bind: args });
    console.debug("SQL this result:",res)
    return res;
  }

  public async get(...args: (string | number| null)[]) {
    console.debug("SQL get",this.sql,args)
    let res: any[] = []
    await this.promise('exec', {
      sql: this.sql,
      bind:args,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row)
        console.debug(result.row);
      },
    });
    if (res.length >= 1)
      return res[0];
    return;
  }

  public async all(...args: (string | number| null)[]) {
    console.debug("SQL all", this.sql,args)
    let res: any[] = []
    let r=await this.promise('exec', {
      sql: this.sql,
      bind: args,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row[0])
        console.debug(result.row);
      },
    });
    console.debug("SQL all result:",r)
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
  public prepare(sql:string){
    return new Statement(sql, this.promise)
  }
  public async transaction(statesments:Statement[]){
    if (!statesments){
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
      console.debug("SQL transaction",transSql)
      let res= await this.promise('exec', { sql: transSql });
      return res
  
  }

  public async exec(sql: string) {
    console.debug("SQL exec",sql)
    let res= await this.promise('exec', { sql: sql });
    console.debug("SQL this result:",res)
    return res;
  }

  public async get(sql: string) {
    console.debug("SQL get",sql)
    let res: any[] = []
    await this.promise('exec', {
      sql: sql,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row)
        console.debug(result.row);
      },
    });
    if (res.length >= 1)
      return res[0];
    return;

  }

  public async all(sql: string) {
    console.debug("SQL all", sql)
    let res: any[] = []
    let r=await this.promise('exec', {
      sql: sql,
      callback: (result: any) => {
        if (!result.row) {
          return;
        }
        res.push(result.row[0])
        console.debug(result.row);
      },
    });
    console.debug("SQL all result:",r)
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
  //   console.log("SQL transaction",transSql)
  //   return await this.exec(transSql)
  // }

  public static getInstance() {

    if (!this.instance) {
      this.instance = new DatabaseManager(sqlite3Promiser);
    }
    return this.instance!;
  }
}
