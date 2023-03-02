//------------------------------------------------------------------------------
//SQL queries
//------------------------------------------------------------------------------
const queries = require("./queries.js");
//------------------------------------------------------------------------------
//SQLITE3 driver
//------------------------------------------------------------------------------
const sqlite3 = require('sqlite3').verbose();
//------------------------------------------------------------------------------
//MD5 to store DB file name in list
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//Array to store all opened SQLITE DB descriptors
//------------------------------------------------------------------------------
let arrDBSQLITE3 = {};
//------------------------------------------------------------------------------
//Init SQLITE3 Promise Wrapper
//------------------------------------------------------------------------------
function SQLite3Promise () {

};

SQLite3Promise.prototype.open = function (dbName) {
  let dbNameHash = md5(dbName);
  if(typeof arrDBSQLITE3[dbNameHash] === "undefined") {
    //Create DB entry in list
    arrDBSQLITE3[dbNameHash] = {
      name: dbName,
      time: Math.floor(Date.now() / 1000),
      state: "inprogress",
      db: false
    }
  }
  if(arrDBSQLITE3[dbNameHash]['state'] != "open") {
    return new Promise(function(resolve, reject) {
      arrDBSQLITE3[dbNameHash]['db'] = new sqlite3.Database(dbName,
          function(err) {
              if(err) {
                Log.error("SQLITE3", err.message);
                resolve(false);
              }
              else {
                Log.info("SQLITE3", "open() " + dbName);
                arrDBSQLITE3[dbNameHash]['state'] = "open";
                arrDBSQLITE3[dbNameHash]['time'] = Math.floor(Date.now() / 1000);
                resolve(true);
              }
          }
      )
    });
  }
  else {
    return new Promise(function(resolve, reject) {
      arrDBSQLITE3[dbNameHash]['time'] = Math.floor(Date.now() / 1000);
      resolve(true);
    });
  }
};

SQLite3Promise.prototype.serialize = function (dbName) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash]['db'].serialize(function(err) {
      if(err) {
        Log.error("SQLITE3", err.message + " " + dbName);
        reject(false);
      }
      else {
        Log.info("SQLITE3", "serialize() " + dbName);
        resolve(true);
      }
    });
  });
};

// any query: insert/delete/update
SQLite3Promise.prototype.run = function(dbName, key, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    let sql = queries[key] ? queries[key] : key;
    arrDBSQLITE3[dbNameHash]['db'].run(sql, params,
      function(err, result) {
        if(err) {
          Log.error("SQLITE3", err + " " + dbName);
          resolve(false);
        }
        else {
          Log.info("SQLITE3", "run() " + dbName);
          this.lastID > 0 ? resolve(this.lastID) : resolve(true);
        }
    })
  })
};

// first row read
SQLite3Promise.prototype.get = function (dbName, key, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    let sql = queries[key] ? queries[key] : key;
    arrDBSQLITE3[dbNameHash]['db'].get(sql, params, function(err, row)  {
        if(err) {
          Log.error("SQLITE3", err.message + " " + dbName);
          resolve(false);
        }
        else {
          Log.info("SQLITE3", "get() " + dbName);
          resolve(row);
        }
    })
  })
};

// set of rows read
SQLite3Promise.prototype.all = function (dbName, key, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    let sql = queries[key] ? queries[key] : key;
    arrDBSQLITE3[dbNameHash]['db'].all(sql, params, function(err, rows)  {
        if(err) {
          Log.error("SQLITE3", err.message + " " + dbName);
          resolve(false);
        }
        else {
          Log.info("SQLITE3", "all() " + dbName);
          resolve(rows)
        }
    })
  })
};

// each row returned one by one
SQLite3Promise.prototype.each = function (dbName, key, params, action) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    if(params == undefined) params=[]
    var db = arrDBSQLITE3[dbNameHash]['db'];
    db.serialize(function() {
      let sql = queries[key] ? queries[key] : key;
      db.each(sql, params, function(err, row)  {
          if(err) reject("Read error: " + err.message )
          else {
            if(row) {
              action(row)
            }
          }
      })
      db.get("", function(err, row)  {
          resolve(true)
      })
    })
  })
};

SQLite3Promise.prototype.close = function (dbName) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash]['db'].close(function(err, row)  {
        if(err) {
          Log.error("SQLITE3", err.message + " " + dbName);
          resolve(false)
        }
        else {
          Log.info("SQLITE3", "close() " + dbName);
          resolve(true)
        }
        arrDBSQLITE3[dbNameHash]['state'] = "closed";
    });
  });
};

let sqLiteDB = new SQLite3Promise();

(async() => {
  //Run neverended cycle
  while(true) {
    //Go throught DB list
    for (let [key, value] of Object.entries(arrDBSQLITE3)) {
      //Check last DB query time
      let dbTimeOpen = Math.floor(Date.now() / 1000) - value.time;
      //If last query time more then iddle time settings
      if(dbTimeOpen > config.db.OpenTime && arrDBSQLITE3[key]['state'] == "open") {
        //Close DB
        let result = await sqLiteDB.close(value.name);
        //If DB closed
        if(result) {
          //Make log
          Log.info("DB", "CLOSE -> " + value.name);
        }
        //If some error during closing DB
        else {
          //Make log
          Log.error("DB", "CLOSE -> " + value.name);
        }
        //Set DB close state
        arrDBSQLITE3[key]['state'] = "closed";
      }
    }
    //Run function each 5 seconds
    await wait(5000);
  }
})();

module.exports = sqLiteDB;
