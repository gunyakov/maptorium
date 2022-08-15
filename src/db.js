//------------------------------------------------------------------------------
//MD5 to store DB file name in list
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//NodeJS core file system functions
//------------------------------------------------------------------------------
const fs = require('fs');
//------------------------------------------------------------------------------
//CRC32 to store tiles hash in DB
//------------------------------------------------------------------------------
const CRC32 = require("crc-32");
//------------------------------------------------------------------------------
//Sqlite3 Promise wrapper
//------------------------------------------------------------------------------
let sqlite3 = require('./sqlite3-promise.js');
sqlite3 = new sqlite3();
//------------------------------------------------------------------------------
//DB handler for tile storage based on sqlite3 promise version
//------------------------------------------------------------------------------
class DB {
  //----------------------------------------------------------------------------
  //Constructor
  //----------------------------------------------------------------------------
  constructor() {
    this.arrDB = {};
    this.dbOpened = 0;
    this.service();
  }
  //----------------------------------------------------------------------------
  //Function to generate full folder path to DB file
  //----------------------------------------------------------------------------
  async getDBPath(z, x, y, storage) {
    let zoom = z + 1;
    var dbpath = storage + "/z" + zoom + "/" + Math.floor(x / 1024) + "/" + Math.floor(y / 1024) + "/";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //Function to generate full folder + file name to DB file
  //----------------------------------------------------------------------------
  async getDBName(z, x, y, storage) {
    let dbpath = await this.getDBPath(z, x, y, storage);
    dbpath = dbpath + Math.floor(x / 256) + "." + Math.floor(y / 256) + ".sqlitedb";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //General function, handle DB file opening / creating tables by request
  //----------------------------------------------------------------------------
  async getDB(z, x, y, storage) {
    //Get full folder + file name path to DB file
    let dbName = await this.getDBName(z, x, y, storage);
    //Generate DB name hash
    let dbNameHash = md5(dbName);
    //Reset inner working state for DB
    let dbState = false;
    //If DB is missing in list
    if(typeof this.arrDB[dbNameHash] === "undefined") {
      //Create DB entry in list
      this.arrDB[dbNameHash] = {
        name: dbName,
        time: Math.floor(Date.now() / 1000),
        state: "inprogress"
      }
    }
    //If DB is present in list
    else {
      //Run wait cycle while state of DB 'inprogress' - mean DB is opened/created tables in another thread
      while (this.arrDB[dbNameHash]['state'] == "inprogress") {
        //Wait 1 secont to next try
        await wait(1000);
      }
    }
    //If DB state isn`t 'open' - mean DB still not opened/tables still not created
    if(this.arrDB[dbNameHash]['state'] != "open") {
      //Generate full path to DB file
      var dbPath = await this.getDBPath(z, x, y, storage);
      //Check if folders for DB storage is present
      if(!fs.existsSync(dbPath)) {
        //Make full folders parh in recursive mode
        fs.mkdirSync(dbPath, { recursive: true });
      }
      //Check if DB file is not present
      if(!fs.existsSync(dbName)) {
        //Create new DB file
        dbState = await sqlite3.open(dbName);
        if(dbState) {
          //Create table to store tiles
          await sqlite3.run(dbName, "CREATE TABLE IF NOT EXISTS t (x INTEGER NOT NULL,y INTEGER NOT NULL,v INTEGER DEFAULT 0 NOT NULL,c TEXT,s INTEGER DEFAULT 0 NOT NULL,h INTEGER DEFAULT 0 NOT NULL,d INTEGER NOT NULL,b BLOB,constraint PK_TB primary key (x,y,v));");
          //Create index for tiles table
          await sqlite3.run(dbName, "CREATE INDEX IF NOT EXISTS t_v_idx on t (v)");
          Log.make("info", "DB", "CREATE -> " + dbName);
        }
      }
      //If DB file is present
      else {
        //Open DB only
        dbState = await sqlite3.open(dbName);
        //If we open DB successfully
        if(dbState) {
          //Make log
          Log.make("info", "DB", "OPEN -> " + dbName);
        }
      }
      //If DB file opened/created successfully
      if(dbState) {
        //Update time of last query to DB
        this.arrDB[dbNameHash]['time'] = Math.floor(Date.now() / 1000);
        //Set DB state
        this.arrDB[dbNameHash]['state'] = "open";
        //Increas counter of opened DB
        this.dbOpened++;
      }
    }
    //If DB is opened yet
    else {
      //Update time of last query to DB
      this.arrDB[dbNameHash]['time'] = Math.floor(Date.now() / 1000);
    }
    //Exit
    return dbState;
  }
  //----------------------------------------------------------------------------
  //Get tile from DB
  //----------------------------------------------------------------------------
  async getTile(z, x, y, storage) {
    //Get folder + file name of DB
    let dbName = await this.getDBName(z, x, y, storage);
    //Try to get DB
    await this.getDB(z, x, y, storage);
    //SQL request to DB
    let sql = "SELECT s, b, d, h, v FROM t WHERE x = ? AND y = ?;";
    //Request tile from DB
    let results = await sqlite3.all(dbName, sql, [x, y]);
    //If request to DB is finished
    if(results) {
      //If tile is missing in DB
      if (results.length == 0) {
        return false;
      }
      //If tile is present in DB
      else {
        return results[0];
      }
    }
    //If request return undefined state
    else {
      //Make log
      Log.make("error", "DB", "request problem in " + dbName);
      //Set DB open mode to force
      return false;
    }
  }
  //----------------------------------------------------------------------------
  //Save tile in DB
  //----------------------------------------------------------------------------
  async saveTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //If enable to write into DB
    if(config.db.ReadOnly === false) {
      //Получаем полный путь к базе
      let dbName = await this.getDBName(z, x, y, storage);
      //Open/Create DB
      await this.getDB(z, x, y, storage);
      //Получаем время запроса
      let timeStamp = await this.time();
      //Заносим изображение в базу
      let results = await sqlite3.run(dbName, "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob]);
      //Если запрос вернул результат
      if(results) {
        return true;
      }
      //Если запрос вернул пустой результат, значит база была закрыта
      else {
        //Устанавливаем что базу нужно открыть в принудительном порядке
        return false;
      }
    }
    else {
      return true;
    }

  }
  //----------------------------------------------------------------------------
  //Update tile in DB
  //----------------------------------------------------------------------------
  async updateTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //Get folder + file name of DB
    let dbName = await this.getDBName(z, x, y, storage);
    //Open/Create DB
    await this.getDB(z, x, y, storage);
    //Get current UNIX Timestamp
    let timeStamp = await this.time();
    //Get tile from DB
    let tile = await this.getTile(z, x, y, storage);
    //Reset result state
    let results = false;
    //If tile present in DB
    if(tile !== false) {
      //Update tile in DB
      results = await sqlite3.run(dbName, "UPDATE t SET v = ?, s = ?, h = ?, d = ?, b = ? WHERE x = ? AND y = ?;", [mapVersion, parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob, x, y]);
      //If request to DB return true state
      if(results) {
        //Make log
        Log.make("success", "DB", "UPDATE -> " + dbName);
        //Return
        return true;
      }
    }
    //If tile missing in DB
    else {
      //Insert tile in DB
      results = await this.saveTile(z, x, y, storage, blob, size, mapVersion);
    }
    //If request to DB return false state
    if(results === false) {
      //Make log
      Log.make("error", "DB", "UPDATE -> " + dbName);
      //Return error
      return false;
    }
    //If request to DB return true state
    else {
      return true;
    }
  }
  //----------------------------------------------------------------------------
  //Service function to close DB file when reach iddle time out
  //----------------------------------------------------------------------------
  async service() {
    //Run neverended cycle
    while(true) {
      //Go throught DB list
      for (let [key, value] of Object.entries(this.arrDB)) {
        //Check last DB query time
        let dbTimeOpen = Math.floor(Date.now() / 1000) - value.time;
        //If last query time more then iddle time settings
        if(dbTimeOpen > config.db.OpenTime && this.arrDB[key]['state'] == "open") {
          //Close DB
          let result = await sqlite3.close(value.name);
          //If DB closed
          if(result) {
            //Make log
            Log.make("info", "DB", "CLOSE -> " + value.name);
          }
          //If some error during closing DB
          else {
            //Make log
            Log.make("error", "DB", "CLOSE -> " + value.name);
          }
          //Set DB close state
          this.arrDB[key]['state'] = "closed";
          //Decrease DB counter
          this.dbOpened--;
        }
      }
      //Run function each 5 seconds
      await wait(5000);
    }
  }
  //----------------------------------------------------------------------------
  //Return counter of opened DB
  //----------------------------------------------------------------------------
  async getDBCounter() {
    return this.dbOpened;
  }
  //----------------------------------------------------------------------------
  //UNIX TIMESTAMP
  //----------------------------------------------------------------------------
  async time() {
    return parseInt(new Date().getTime()/1000)
  }
}

module.exports = DB;
