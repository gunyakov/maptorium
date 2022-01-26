const sqlite3 = require('sqlite3').verbose();
let Promise = require("bluebird");
let log = require('./log.js');
let Log = new log();
let db;
let opened = false;
exports.db = db;
exports.opened = opened;

exports.open=function(path) {
  if(!opened) {
    return new Promise(function(resolve, reject) {
    this.db = new sqlite3.Database(path,
      function(err) {
          if(err) {
            this.opened = false;
            Log.make("error", "SQLITE3", err);
            reject(err.message);
          }
          else {
            this.opened = true;
            Log.make("info", "SQLITE3", "open -> " + path);
            resolve(true);
          }
      }
    )
    });
  }
  else {
    Log.make("info", "SQLITE3", "was open -> " + path);
    return true;
  }
}

exports.getDB=function() {
  return new Promise(function(resolve, reject) {
    resolve(this.db);
  });
}

exports.serialize = function() {
  return new Promise(function(resolve, reject) {
      this.db.serialize(
          function()  {
            resolve(true)
      })
  })
}

// any query: insert/delete/update
exports.run=function(query, params) {
    return new Promise(function(resolve, reject) {
        this.db.run(query, params,
            function(err)  {
                if(err) reject(err.message)
                else    resolve(true)
        })
    })
}

// first row read
exports.get=function(query, params) {
    return new Promise(function(resolve, reject) {
        this.db.get(query, params, function(err, row)  {
            if(err) reject("Read error: " + err.message)
            else {
                resolve(row)
            }
        })
    })
}

// set of rows read
exports.all=function(query, params) {
    return new Promise(function(resolve, reject) {
        if(params == undefined) params=[]

        this.db.all(query, params, function(err, rows)  {
            if(err) reject("Read error: " + err.message)
            else {
                resolve(rows)
            }
        })
    })
}

// each row returned one by one
exports.each=function(query, params, action) {
    return new Promise(function(resolve, reject) {
        var db = this.db
        db.serialize(function() {
            db.each(query, params, function(err, row)  {
                if(err) reject("Read error: " + err.message)
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

exports.close=function() {
  return new Promise(function(resolve, reject) {
    this.db.close(function(err, row)  {
      this.opened = false;
      if(err) {
        Log.make("error", "SQLITE3", err.message);
        reject(false);
      }
      else {
        Log.make("info", "SQLITE3", row);
        resolve(true);
      }
    });
  });
}
