//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//MD5 to store DB Names in arrays
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//FS to create DB file if missing
//------------------------------------------------------------------------------
const fs = require('fs');
//------------------------------------------------------------------------------
//SQLITE3 Promise wrapper
//------------------------------------------------------------------------------
let sqlite3 = require('./sqlite3-promise');
//------------------------------------------------------------------------------
//Wait функция
//------------------------------------------------------------------------------
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
//------------------------------------------------------------------------------
//Handle DB (search, insert tiles, create new DB if missing)
//------------------------------------------------------------------------------
class DB {
  constructor(){
    this.arrDB = {};
    this.dbOpened = 0;
    this.service();
  }
  //----------------------------------------------------------------------------
  //Generate path for DB file
  //----------------------------------------------------------------------------
  async getDBPath(z, x, y) {
    let zoom = z + 1;
    var dbpath = config.storPath + "/z" + zoom + "/" + Math.floor(x / 1024) + "/" + Math.floor(y / 1024) + "/";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //Формируем полный путь к файлу базы данных
  //----------------------------------------------------------------------------
  async getDBName(z, x, y) {
    let dbpath = await this.getDBPath(z, x, y);
    dbpath = dbpath + Math.floor(x / 256) + "." + Math.floor(y / 256) + ".sqlitedb";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //Основная функция, возвращающая ссылку на базу данных для работы
  //----------------------------------------------------------------------------
  async getDB(z, x, y, force = false) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y);
    let dbNameHash = md5(dbName);
    //Если базы еще нет в списке
    if(typeof this.arrDB[dbNameHash] === "undefined") {
      //console.log(this.arrDB[dbNameHash]['state']);
      //Добавляем базу в список с закрытым статусом
      this.arrDB[dbNameHash] = {
        name: dbName,
        db: "",
        time: Math.floor(Date.now() / 1000),
        state: "closed"
      }
    }
    //Если база еще не открыта или уже закрыта
    if(this.arrDB[dbNameHash]['state'] === "closed" || force === true) {
      //console.log(1);
      //Получаем полный путь к базе данных
      var dbPath = await this.getDBPath(z, x, y);
      //console.log(2);
      //Проверяем есть ли вообще путь к базе
      if(!fs.existsSync(dbPath)) {
        //Создаем полный путь из папок к базе
        fs.mkdirSync(dbPath, { recursive: true });
      }
      //console.log(3);
      //Проверяем есть ли файл базы данных
      if(!fs.existsSync(dbName)) {
        //console.log(4);
        //Создаем файл базы
        await sqlite3.open(dbName).catch((error) => { console.log(error) });
        //Создаем в базе таблицу для хранения тайлов
        await sqlite3.run("CREATE TABLE t (x INTEGER NOT NULL,y INTEGER NOT NULL,v INTEGER DEFAULT 0 NOT NULL,c TEXT,s INTEGER DEFAULT 0 NOT NULL,h INTEGER DEFAULT 0 NOT NULL,d INTEGER NOT NULL,b BLOB,constraint PK_TB primary key (x,y,v));").catch((error) => { console.log("DB error: Cant create Table. ", error) });;
        //Создаем индекс в таблице
        await sqlite3.run("CREATE INDEX t_v_idx on t (v)").catch((error) => { console.log("DB error: Cant create Index. ", error) });
        console.log("DB create: " + dbName);
      }
      //Если файл базы есть
      else {
        //console.log(5);
        //Открываем базу
        await sqlite3.open(dbName).catch((error) => { console.log(error) });
        console.log("DB open: " + dbName);
      }
      //console.log(6);
      //Добавляем базу в обьект
      this.arrDB[dbNameHash] = {
        name: dbName,
        db: sqlite3,
        time: Math.floor(Date.now() / 1000),
        state: "open"
      }
      this.dbOpened++;
    }
    //Если база уже открыта
    else {
      //Обновляем время последнего обращения к базе
      this.arrDB[dbNameHash]['time'] = Math.floor(Date.now() / 1000)
    }
    //console.log(this.arrDB[dbNameHash]['name']);
    return this.arrDB[dbNameHash]['db'];
  }

  async service() {
    let dbTimeOpen = 0;
    let db = {};
    while(true) {
      for (let [key, value] of Object.entries(this.arrDB)) {
        dbTimeOpen = Math.floor(Date.now() / 1000) - value.time;
        //console.log("DB " + this.arrDB[key]['name'] + " time: " + dbTimeOpen);
        //console.log(this.arrDB);
        if(dbTimeOpen > config.dbTimeOpen && this.arrDB[key]['state'] == "open") {
          db = value.db;
          await db.close().catch((error) => { console.log("DB service: " + error) });
          this.arrDB[key]['state'] = "closed";
          this.arrDB[key]['db'] = "";
          this.dbOpened--;
          console.log("DB " + this.arrDB[key]['name'] + " was closed.");
        }
      }
      await wait(5000);
    }
  }

  async getDBCounter() {
    return this.dbOpened;
  }
}

module.exports = DB;
