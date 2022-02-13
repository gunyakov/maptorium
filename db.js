//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
let log = require('./log.js');
const Log = new log();
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
//Wait function
//------------------------------------------------------------------------------
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
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
  async getDB(z, x, y, storage, force = false) {
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
    if(this.arrDB[dbNameHash]['state'] != "open" || force === true) {
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
    //Set than no deed to open DB on force mode
    let force = false;
    //Start cycle
    while(true) {
      //Try to get DB
      await this.getDB(z, x, y, storage, force);
      //SQL request to DB
      let sql = "SELECT s, b FROM t WHERE x = ? AND y = ?;";
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
        force = true;
      }
    }
  }
  //----------------------------------------------------------------------------
  //Save tile in DB
  //----------------------------------------------------------------------------
  async saveTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Запускаем цикл
    while(true) {
      //Получаем дескриптор базы данных
      let objDB = await this.getDB(z, x, y, storage, force);
      //Получаем время запроса
      let timeStamp = await this.time();
      //Заносим изображение в базу
      let results = await sqlite3.run(dbName, "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob]);
      //Если запрос вернул результат
      if(results) {
        Log.make("success", "DB", "INSERT -> " + dbName);
        return true;
      }
      //Если запрос вернул пустой результат, значит база была закрыта
      else {
        Log.make("error", "DB", "INSERT -> " + dbName);
        //Устанавливаем что базу нужно открыть в принудительном порядке
        force = true;
        return false;
      }
    }
  }
  //----------------------------------------------------------------------------
  //Update tile in DB
  //----------------------------------------------------------------------------
  async updateTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Получаем дескриптор базы данных
    let objDB = await this.getDB(z, x, y, storage, force);
    //Получаем время запроса
    let timeStamp = await this.time();
    //Get tile from DB
    let tile = await this.getTile(z, x, y, storage);
    //If tile present in DB
    let results = false;
    if(tile !== false) {
      //Update tile in DB
      results = await sqlite3.run(dbName, "UPDATE t SET v = ?, s = ?, h = ?, d = ?, b = ? WHERE x = ? AND y = ?;", [mapVersion, parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob, x, y,]);
      if(results) {
        Log.make("success", "DB", "UPDATE -> " + dbName);
        return true;
      }
    }
    //If tile missing in DB
    else {
      //Insert tile in DB
      results = await this.saveTile(z, x, y, storage, blob, size, mapVersion);
    }
    //Если запрос вернул результат
    if(results === false) {
      //Выводим сообщение
      Log.make("error", "DB", "UPDATE -> " + dbName);
      //Return error
      return false;
    }
    else {
      return true;
    }
  }
  //----------------------------------------------------------------------------
  //Service function to close DB file when reach iddle time out
  //----------------------------------------------------------------------------
  async service() {
    let dbTimeOpen = 0;
    let db = '';
    //Run neverended cycle
    while(true) {
      //Go throught DB list
      for (let [key, value] of Object.entries(this.arrDB)) {
        //Check last DB query time
        dbTimeOpen = Math.floor(Date.now() / 1000) - value.time;
        //If last query time more then iddle time settings
        if(dbTimeOpen > config.db.OpenTime && this.arrDB[key]['state'] == "open") {
          //Close DB
          await sqlite3.close(value.name);
          Log.make("info", "DB", "CLOSE -> " + value.name);
          this.arrDB[key]['state'] = "closed";
          this.dbOpened--;
        }
      }
      await wait(5000);
    }
  }
  //----------------------------------------------------------------------------
  //Функция возвращающая количество открытых баз в текущий момент
  //----------------------------------------------------------------------------
  async getDBCounter() {
    return this.dbOpened;
  }
  //----------------------------------------------------------------------------
  //Функция возвращающая текущий TIMESTAMP
  //----------------------------------------------------------------------------
  async time() {
    return parseInt(new Date().getTime()/1000)
  }
}

module.exports = DB;
