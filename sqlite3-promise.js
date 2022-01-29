const sqlite3 = require('sqlite3').verbose();
const md5 = require('md5');
let log = require('./log.js');
let Log = new log();

let arrDBSQLITE3 = {};

function SQLite3Promise () {

}

SQLite3Promise.prototype.open = function (dbName) {
  //console.log("Construct", this.dbName);
  let dbNameHash = md5(dbName);
  if(typeof arrDBSQLITE3[dbNameHash] === "undefined" || arrDBSQLITE3[dbNameHash] === false) {
    return new Promise(function(resolve, reject) {
      arrDBSQLITE3[dbNameHash] = new sqlite3.Database(dbName,
          function(err) {
              if(err) {
                Log.make("error", "SQLITE3", err.message);
                resolve(false);
              }
              else {;
                Log.make("info", "SQLITE3", "open() " + dbName);
                resolve(true);
              }
          }
      )
    });
  }
  else {
    return new Promise(function(resolve, reject) {
      resolve(true);
    });
  }
}

SQLite3Promise.prototype.serialize = function (dbName) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash].serialize(function(err) {
      if(err) {
        Log.make("error", "SQLITE3", err.message + " " + dbName);
        reject(false);
      }
      else {
        Log.make("info", "SQLITE3", "serialize() " + dbName);
        resolve(true);
      }
    });
  });
}

// any query: insert/delete/update
SQLite3Promise.prototype.run = function(dbName, query, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash].run(query, params,
        function(err)  {
          if(err) {
            Log.make("error", "SQLITE3", err + " " + dbName);
            resolve(false);
          }
          else {
            Log.make("info", "SQLITE3", "run() " + dbName);
            resolve(true);
          }
    })
  })
}

  // first row read
SQLite3Promise.prototype.get = function (dbName, query, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash].get(query, params, function(err, row)  {
        if(err) {
          Log.make("error", "SQLITE3", err.message + " " + dbName);
          reject(false);
        }
        else {
          Log.make("info", "SQLITE3", "get() " + dbName);
            resolve(row)
        }
    })
  })
}

// set of rows read
SQLite3Promise.prototype.all = function (dbName, query, params = []) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    arrDBSQLITE3[dbNameHash].all(query, params, function(err, rows)  {
        if(err) {
          Log.make("error", "SQLITE3", err.message + " " + dbName);
          reject(false);
        }
        else {
          Log.make("info", "SQLITE3", "all() " + dbName);
          resolve(rows)
        }
    })
  })
}

// each row returned one by one
SQLite3Promise.prototype.each = function (dbName, query, params, action) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
    if(params == undefined) params=[]
    var db = arrDBSQLITE3[dbNameHash]
    db.serialize(function() {
      db.each(query, params, function(err, row)  {
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
}

SQLite3Promise.prototype.close = function (dbName) {
  let dbNameHash = md5(dbName);
  return new Promise(function(resolve, reject) {
      arrDBSQLITE3[dbNameHash].close(function(err, row)  {
          if(err) {
            Log.make("error", "SQLITE3", err.message + " " + dbName);
            reject(false)
          }
          else {
            Log.make("info", "SQLITE3", "close() " + dbName);
            resolve(true)
          }
          arrDBSQLITE3[dbNameHash] = false;
      });
  });
}
module.exports = SQLite3Promise;
