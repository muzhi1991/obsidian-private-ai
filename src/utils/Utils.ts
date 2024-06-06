// @ts-nocheck
import {
  MarkdownRenderer, TFolder, TFile
} from 'obsidian';
import { plugin } from '../store'
import { get } from 'svelte/store'
import type PrivateAIPlugin from 'src/main';

export const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));


export const renderMarkdown = (node: HTMLElement, content: string) => {
  console.debug("node", node, node.innerHTML)
  function render(text: string) {
    const myPlugin: PrivateAIPlugin = get(plugin);
    node.innerHTML = "";
    MarkdownRenderer.render(myPlugin.app, text, node, "chat.md", myPlugin);
    let pElement = node.querySelector('p');
    if (pElement) {
      // pElement.style.padding = '1px';
      pElement.style.margin = '0em';
    }

  }
  render(content)
  return {
    update: (newContent: string) => {
      console.debug("use update", newContent, content)
      if (newContent != content) {
        content = newContent
        render(newContent)
      }
    },
    // destroy: () => {}
  }
};



export function Object_assign(target: any, ...sources: Array<any>) {
  sources.forEach(source => {
    if (source)
      Object.keys(source).forEach(key => {
        const s_val = source[key]
        const t_val = target[key]
        target[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
          ? Object_assign(t_val, s_val)
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

export function iterAllMdFiles(folder: TFolder) {
  let mdFiles: TFile[] = []
  for (const f of folder.children) {
    if (f instanceof TFolder) {
      let files = iterAllMdFiles(f);
      mdFiles.push(...files)
    } else if (f instanceof TFile) {
      if (f.extension == 'md') {
        mdFiles.push(f)
      }
    }
  }
  return mdFiles
}

export function escape_single_quote(s:string) {
  // convert singe quote to double quote
  return s.replace(/'/g, "''");
}

let log = console.log;
let warn = console.warn;
export const demo1 = function(sqlite3){
  const capi = sqlite3.capi/*C-style API*/,
        oo = sqlite3.oo1/*high-level OO API*/;
  console.log("opfs support :",oo.OpfsDb,sqlite3.capi.sqlite3_vfs_find("opfs"));
  log("sqlite3 version",capi.sqlite3_libversion(), capi.sqlite3_sourceid());
  const db = new oo.DB("/mydb.sqlite3",'ct');
  log("transient db =",db.filename);
  /**
     Never(!) rely on garbage collection to clean up DBs and
     (especially) prepared statements. Always wrap their lifetimes
     in a try/finally construct, as demonstrated below. By and
     large, client code can entirely avoid lifetime-related
     complications of prepared statement objects by using the
     DB.exec() method for SQL execution.
  */
  try {
    log("show tables...");
    db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      callback: function (row) {
        log("row ", ++this.counter, "=", row);
      }.bind({ counter: 0 })
    });
    
    log("Create a table...");
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

    log("Insert some data using exec()...");
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

    log("Insert using a prepared statement...");
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

    log("Query data with exec() using rowMode 'array'...");
    db.exec({
      sql: "select a from t order by a limit 3",
      rowMode: 'array', // 'array' (default), 'object', or 'stmt'
      callback: function(row){
        log("row ",++this.counter,"=",row);
      }.bind({counter: 0})
    });

    log("Query data with exec() using rowMode 'object'...");
    db.exec({
      sql: "select a as aa, b as bb from t order by aa limit 3",
      rowMode: 'object',
      callback: function(row){
        log("row ",++this.counter,"=",JSON.stringify(row));
      }.bind({counter: 0})
    });

    log("Query data with exec() using rowMode 'stmt'...");
    db.exec({
      sql: "select a from t order by a limit 3",
      rowMode: 'stmt',
      callback: function(row){
        log("row ",++this.counter,"get(0) =",row.get(0));
      }.bind({counter: 0})
    });

    log("Query data with exec() using rowMode INTEGER (result column index)...");
    db.exec({
      sql: "select a, b from t order by a limit 3",
      rowMode: 1, // === result column 1
      callback: function(row){
        log("row ",++this.counter,"b =",row);
      }.bind({counter: 0})
    });

    log("Query data with exec() using rowMode $COLNAME (result column name)...");
    db.exec({
      sql: "select a a, b from t order by a limit 3",
      rowMode: '$a',
      callback: function(value){
        log("row ",++this.counter,"a =",value);
      }.bind({counter: 0})
    });

    log("Query data with exec() without a callback...");
    let resultRows = [];
    db.exec({
      sql: "select a, b from t order by a limit 3",
      rowMode: 'object',
      resultRows: resultRows
    });
    log("Result rows:",JSON.stringify(resultRows,undefined,2));

    log("Create a scalar UDF...");
    db.createFunction({
      name: 'twice',
      xFunc: function(pCx, arg){ // note the call arg count
        return arg + arg;
      }
    });
    log("Run scalar UDF and collect result column names...");
    let columnNames = [];
    db.exec({
      sql: "select a, twice(a), twice(''||a) from t order by a desc limit 3",
      columnNames: columnNames,
      rowMode: 'stmt',
      callback: function(row){
        log("a =",row.get(0), "twice(a) =", row.get(1),
            "twice(''||a) =",row.get(2));
      }
    });
    log("Result column names:",columnNames);

    try{
      log("The following use of the twice() UDF will",
          "fail because of incorrect arg count...");
      db.exec("select twice(1,2,3)");
    }catch(e){
      warn("Got expected exception:",e.message);
    }

    try {
      db.transaction( function(D) {
        D.exec("delete from t");
        log("In transaction: count(*) from t =",db.selectValue("select count(*) from t"));
        throw new sqlite3.SQLite3Error("Demonstrating transaction() rollback");
      });
    }catch(e){
      if(e instanceof sqlite3.SQLite3Error){
        log("Got expected exception from db.transaction():",e.message);
        log("count(*) from t =",db.selectValue("select count(*) from t"));
      }else{
        throw e;
      }
    }

    try {
      db.savepoint( function(D) {
        D.exec("delete from t");
        log("In savepoint: count(*) from t =",db.selectValue("select count(*) from t"));
        D.savepoint(function(DD){
          const rows = [];
          DD.exec({
            sql: ["insert into t(a,b) values(99,100);",
                  "select count(*) from t"],
            rowMode: 0,
            resultRows: rows
          });
          log("In nested savepoint. Row count =",rows[0]);
          throw new sqlite3.SQLite3Error("Demonstrating nested savepoint() rollback");
        })
      });
    }catch(e){
      if(e instanceof sqlite3.SQLite3Error){
        log("Got expected exception from nested db.savepoint():",e.message);
        log("count(*) from t =",db.selectValue("select count(*) from t"));
      }else{
        throw e;
      }
    }
  }finally{
    db.close();
  }

  log("That's all, folks!");

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

