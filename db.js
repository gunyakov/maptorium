const config = require("./config.js");
let log = require('./log.js');
const Log = new log();
const md5 = require('md5');
const fs = require('fs');
const CRC32 = require("crc-32");
let sqlite3 = require('./sqlite3-promise.js');
sqlite3 = new sqlite3();
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));

//------------------------------------------------------------------------------
//DB handler based on sqlite3 promise version
//------------------------------------------------------------------------------
class DB {

  constructor() {
    this.arrDB = {};
    this.dbOpened = 0;
    this.service();
  }
  //----------------------------------------------------------------------------
  //Формируем путь к базе данных
  //----------------------------------------------------------------------------
  async getDBPath(z, x, y, storage) {
    let zoom = z + 1;
    var dbpath = storage + "/z" + zoom + "/" + Math.floor(x / 1024) + "/" + Math.floor(y / 1024) + "/";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //Формируем полный путь к файлу базы данных
  //----------------------------------------------------------------------------
  async getDBName(z, x, y, storage) {
    let dbpath = await this.getDBPath(z, x, y, storage);
    dbpath = dbpath + Math.floor(x / 256) + "." + Math.floor(y / 256) + ".sqlitedb";
    return dbpath;
  }
  //----------------------------------------------------------------------------
  //Основная функция, возвращающая ссылку на базу данных для работы
  //----------------------------------------------------------------------------
  async getDB(z, x, y, storage, force = false) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //console.log(dbName);
    let dbNameHash = md5(dbName);
    let dbState = false;
    //Если базы еще нет в списке
    if(typeof this.arrDB[dbNameHash] === "undefined") {
      //console.log(this.arrDB[dbNameHash]['state']);
      //Добавляем базу в список с закрытым статусом
      this.arrDB[dbNameHash] = {
        name: dbName,
        time: Math.floor(Date.now() / 1000),
        state: "closed"
      }
    }
    //Если база еще не открыта или уже закрыта
    if(this.arrDB[dbNameHash]['state'] === "closed" || force === true) {
      //Получаем полный путь к базе данных
      var dbPath = await this.getDBPath(z, x, y, storage);
      //Проверяем есть ли вообще путь к базе
      if(!fs.existsSync(dbPath)) {
        //Создаем полный путь из папок к базе
        fs.mkdirSync(dbPath, { recursive: true });
      }
      //Проверяем есть ли файл базы данных
      if(!fs.existsSync(dbName)) {
        //Создаем файл базы
        dbState = await sqlite3.open(dbName).catch((error) => {Log.make("error", "DB", error) });
        if(dbState) {
          await sqlite3.run(dbName, "CREATE TABLE IF NOT EXISTS t (x INTEGER NOT NULL,y INTEGER NOT NULL,v INTEGER DEFAULT 0 NOT NULL,c TEXT,s INTEGER DEFAULT 0 NOT NULL,h INTEGER DEFAULT 0 NOT NULL,d INTEGER NOT NULL,b BLOB,constraint PK_TB primary key (x,y,v));").catch((error) => { Log.make("error", "DB", error) });
          //Создаем индекс в таблице
          await sqlite3.run(dbName, "CREATE INDEX IF NOT EXISTS t_v_idx on t (v)").catch((error) => { Log.make("error", "DB", error) });
          Log.make("info", "DB", "create " + dbName);
        }
      }
      //Если файл базы есть
      else {
        //Открываем базу
        dbState = await sqlite3.open(dbName).catch((error) => { Log.make("error", "DB", error) });
        //Если удалось открыть базу
        if(dbState) {
          Log.make("info", "DB", "open " + dbName);
        }
      }
      //Если база была открыта или создана успешно
      if(dbState) {
        //Сериализируем запросы к базе
        //await sqlite3.serialize(dbName);
        //Устанавливаем новое время открытия
        this.arrDB[dbNameHash]['time'] = Math.floor(Date.now() / 1000);
        //Устанавливаем статус базы что она открыта
        this.arrDB[dbNameHash]['state'] = "open";
        //Увеличиваем счетчик открытых баз
        this.dbOpened++;
      }
    }
    //Если база уже открыта
    else {
      //Обновляем время последнего обращения к базе
      this.arrDB[dbNameHash]['time'] = Math.floor(Date.now() / 1000)
    }
    return true;
  }
  //----------------------------------------------------------------------------
  //Получение тайла из базы
  //----------------------------------------------------------------------------
  async getTile(z, x, y, storage) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //Устанавливаем по умолчанию ошибку запроса к базе
    let sqlRunError = true;
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Запускаем цикл
    while(sqlRunError) {
      //Получаем дескриптор базы данных
      let objDB = await this.getDB(z, x, y, storage, force);
      //console.log(z, x, y);
      //Формируем запрос к базе данных
      let sql = "SELECT s, b FROM t WHERE x = ? AND y = ?;";
      //Получаем ответ из базы
      let results = await sqlite3.all(dbName, sql, [x, y]).catch((error) => {Log.make("error", "DB", error)  });
      //console.log(results);
      //Если запрос вернул результат
      if(typeof results !== "undefined") {
        //Если в базе нет тайла
        if (results.length == 0) {
          //console.log(results);
          return false;
        }
        //Если в базе есть тайл
        else {
          return results[0];
        }
      }
      //Если запрос вернул пустой результат, значит база была закрыта
      else {
        //Выводим сообщение
        Log.make("error", "DB", "request problem in " + dbName);
        //Устанавливаем что базу нужно открыть в принудительном порядке
        force = true;
      }
    }
  }
  //----------------------------------------------------------------------------
  //Сохранение тайла в базе
  //----------------------------------------------------------------------------
  async saveTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //Устанавливаем по умолчанию ошибку запроса к базе
    let sqlRunError = true;
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Запускаем цикл
    while(sqlRunError) {
      //Получаем дескриптор базы данных
      let objDB = await this.getDB(z, x, y, storage, force);
      //Получаем время запроса
      let timeStamp = await this.time();
      //Заносим изображение в базу
      let results = await sqlite3.run(dbName, "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob]).catch((error) => {Log.make("error", "DB", error) });
      //Если запрос вернул результат
      if(results) {
        Log.make("info", "DB", "INSERT -> " + dbName);
        return results;
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
  //Обновление тайла в базе
  //----------------------------------------------------------------------------
  async updateTile(z, x, y, storage, blob, size, mapVersion = 0) {
    //Получаем полный путь к базе
    let dbName = await this.getDBName(z, x, y, storage);
    //Устанавливаем по умолчанию ошибку запроса к базе
    let sqlRunError = true;
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Запускаем цикл
    while(sqlRunError) {
      //Получаем дескриптор базы данных
      let objDB = await this.getDB(z, x, y, storage, force);
      //Получаем время запроса
      let timeStamp = await this.time();
      await sqlite3.run(dbName, "DELETE FROM t WHERE x = ? AND y = ?;", [x, y]).catch((error) => { Log.make("error", "DB", "192" + error) });
      //Заносим изображение в базу
      let results = await sqlite3.run(dbName, "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", parseInt(size), Math.abs(CRC32.bstr(new Buffer.from( blob, 'binary' ).toString('utf8'))), timeStamp, blob]).catch((error) => { Log.make("error", "DB", "194" + error) });
      //Если запрос вернул результат
      if(typeof results !== "undefined") {
        Log.make("info", "DB", "UPDATE -> " + dbName);
        return results;
      }
      //Если запрос вернул пустой результат, значит база была закрыта
      else {
        //Выводим сообщение
        Log.make("error", "DB", "UPDATE -> " + dbName);
        //Устанавливаем что базу нужно открыть в принудительном порядке
        force = true;
      }
    }
  }
  //----------------------------------------------------------------------------
  //Сервисная функция закрывающая соединение с БД при отсутсвие активности
  //----------------------------------------------------------------------------
  async service() {
    let dbTimeOpen = 0;
    let db = '';
    while(true) {
      for (let [key, value] of Object.entries(this.arrDB)) {
        dbTimeOpen = Math.floor(Date.now() / 1000) - value.time;
        if(dbTimeOpen > config.db.OpenTime && this.arrDB[key]['state'] == "open") {
          await sqlite3.close(value.name).catch((error) => { Log.make("error", "DB", error) });
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
