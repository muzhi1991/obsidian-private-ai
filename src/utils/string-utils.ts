// @ts-nocheck
import log from 'loglevel';
export function ObjectAssign(target: any, ...sources: Array<any>) {
  sources.forEach(source => {
    if (source)
      Object.keys(source).forEach(key => {
        const s_val = source[key]
        const t_val = target[key]
        target[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
          ? ObjectAssign(t_val, s_val)
          : s_val
      })
  })
  return target
}

export function deepEqual(obj1: any, obj2: any, exclude: string[] = []): boolean {
  if (obj1 === obj2) {
    return true; // If both variables reference the same object
  }
  if (
    typeof obj1 !== 'object' || obj1 === null ||
    typeof obj2 !== 'object' || obj2 === null
  ) {
    return false; // If one of them is not an object or is null
  }
  const keys1 = Object.keys(obj1).filter(key => !exclude.includes(key));;
  const keys2 = Object.keys(obj2).filter(key => !exclude.includes(key));;

  if (keys1.length !== keys2.length) {
    return false; // If they don't have the same number of keys
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false; // If the key is only in `obj1` but not in `obj2`
    }

    // Recursively compare the value for each key
    if (!deepEqual(obj1[key], obj2[key], exclude)) {
      return false;
    }
  }

  return true;
}


export function escapeSingleQuote(s:string) {
  // convert singe quote to double quote
  return s.replace(/'/g, "''");
}


export const demo1 = function(sqlite3){
  const capi = sqlite3.capi/*C-style API*/,
        oo = sqlite3.oo1/*high-level OO API*/;
  log.log("opfs support :",oo.OpfsDb,sqlite3.capi.sqlite3_vfs_find("opfs"));
  log.log("sqlite3 version",capi.sqlite3_libversion(), capi.sqlite3_sourceid());
  const db = new oo.DB("/mydb.sqlite3",'ct');
  log.log("transient db =",db.filename);
  /**
     Never(!) rely on garbage collection to clean up DBs and
     (especially) prepared statements. Always wrap their lifetimes
     in a try/finally construct, as demonstrated below. By and
     large, client code can entirely avoid lifetime-related
     complications of prepared statement objects by using the
     DB.exec() method for SQL execution.
  */
  try {
    log.log("show tables...");
    db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      callback: function (row) {
        log.log("row ", ++this.counter, "=", row);
      }.bind({ counter: 0 })
    });
    
    log.log("Create a table...");
    db.exec("CREATE TABLE IF NOT EXISTS t(a,b)");
    return
    //Equivalent:
    db.exec({
      sql:"CREATE TABLE IF NOT EXISTS t(a,b)"
      // ... numerous other options ... 
    });
    // SQL can be either a string or a byte array
    // or an array of strings which get concatenated
    // together as-is (so be sure to end each statement
    // with a semicolon).

    log.log("Insert some data using exec()...");
    let i;
    for( i = 20; i <= 25; ++i ){
      db.exec({
        sql: "insert into t(a,b) values (?,?)",
        // bind by parameter index...
        bind: [i, i*2]
      });
      db.exec({
        sql: "insert into t(a,b) values ($a,$b)",
        // bind by parameter name...
        bind: {$a: i * 10, $b: i * 20}
      });
    }    

    log.log("Insert using a prepared statement...");
    let q = db.prepare([
      // SQL may be a string or array of strings
      // (concatenated w/o separators).
      "insert into t(a,b) ",
      "values(?,?)"
    ]);
    try {
      for( i = 100; i < 103; ++i ){
        q.bind( [i, i*2] ).step();
        q.reset();
      }
      // Equivalent...
      for( i = 103; i <= 105; ++i ){
        q.bind(1, i).bind(2, i*2).stepReset();
      }
    }finally{
      q.finalize();
    }

    log.log("Query data with exec() using rowMode 'array'...");
    db.exec({
      sql: "select a from t order by a limit 3",
      rowMode: 'array', // 'array' (default), 'object', or 'stmt'
      callback: function(row){
        log.log("row ",++this.counter,"=",row);
      }.bind({counter: 0})
    });

    log.log("Query data with exec() using rowMode 'object'...");
    db.exec({
      sql: "select a as aa, b as bb from t order by aa limit 3",
      rowMode: 'object',
      callback: function(row){
        log.log("row ",++this.counter,"=",JSON.stringify(row));
      }.bind({counter: 0})
    });

    log.log("Query data with exec() using rowMode 'stmt'...");
    db.exec({
      sql: "select a from t order by a limit 3",
      rowMode: 'stmt',
      callback: function(row){
        log.log("row ",++this.counter,"get(0) =",row.get(0));
      }.bind({counter: 0})
    });

    log.log("Query data with exec() using rowMode INTEGER (result column index)...");
    db.exec({
      sql: "select a, b from t order by a limit 3",
      rowMode: 1, // === result column 1
      callback: function(row){
        log.log("row ",++this.counter,"b =",row);
      }.bind({counter: 0})
    });

    log.log("Query data with exec() using rowMode $COLNAME (result column name)...");
    db.exec({
      sql: "select a a, b from t order by a limit 3",
      rowMode: '$a',
      callback: function(value){
        log.log("row ",++this.counter,"a =",value);
      }.bind({counter: 0})
    });

    log.log("Query data with exec() without a callback...");
    let resultRows = [];
    db.exec({
      sql: "select a, b from t order by a limit 3",
      rowMode: 'object',
      resultRows: resultRows
    });
    log.log("Result rows:",JSON.stringify(resultRows,undefined,2));

    log.log("Create a scalar UDF...");
    db.createFunction({
      name: 'twice',
      xFunc: function(pCx, arg){ // note the call arg count
        return arg + arg;
      }
    });
    log.log("Run scalar UDF and collect result column names...");
    let columnNames = [];
    db.exec({
      sql: "select a, twice(a), twice(''||a) from t order by a desc limit 3",
      columnNames: columnNames,
      rowMode: 'stmt',
      callback: function(row){
        log.log("a =",row.get(0), "twice(a) =", row.get(1),
            "twice(''||a) =",row.get(2));
      }
    });
    log.log("Result column names:",columnNames);

    try{
      log.log("The following use of the twice() UDF will",
          "fail because of incorrect arg count...");
      db.exec("select twice(1,2,3)");
    }catch(e){
      log.warn("Got expected exception:",e.message);
    }

    try {
      db.transaction( function(D) {
        D.exec("delete from t");
        log.log("In transaction: count(*) from t =",db.selectValue("select count(*) from t"));
        throw new sqlite3.SQLite3Error("Demonstrating transaction() rollback");
      });
    }catch(e){
      if(e instanceof sqlite3.SQLite3Error){
        log.log("Got expected exception from db.transaction():",e.message);
        log.log("count(*) from t =",db.selectValue("select count(*) from t"));
      }else{
        throw e;
      }
    }

    try {
      db.savepoint( function(D) {
        D.exec("delete from t");
        log.log("In savepoint: count(*) from t =",db.selectValue("select count(*) from t"));
        D.savepoint(function(DD){
          const rows = [];
          DD.exec({
            sql: ["insert into t(a,b) values(99,100);",
                  "select count(*) from t"],
            rowMode: 0,
            resultRows: rows
          });
          log.log("In nested savepoint. Row count =",rows[0]);
          throw new sqlite3.SQLite3Error("Demonstrating nested savepoint() rollback");
        })
      });
    }catch(e){
      if(e instanceof sqlite3.SQLite3Error){
        log.log("Got expected exception from nested db.savepoint():",e.message);
        log.log("count(*) from t =",db.selectValue("select count(*) from t"));
      }else{
        throw e;
      }
    }
  }finally{
    db.close();
  }

  log.log("That's all, folks!");

  /**
     Some of the features of the OO API not demonstrated above...

     - get change count (total or statement-local, 32- or 64-bit)
     - get a DB's file name

     Misc. Stmt features:

     - Various forms of bind()
     - clearBindings()
     - reset()
     - Various forms of step()
     - Variants of get() for explicit type treatment/conversion,
       e.g. getInt(), getFloat(), getBlob(), getJSON()
     - getColumnName(ndx), getColumnNames()
     - getParamIndex(name)
  */
}

