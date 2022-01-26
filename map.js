const config = require("./config.js");
const DB = require("./db.js");
let Log = require('./log.js');
Log = new Log();
const db = new DB();
const httpEngine = require("./http-engine.js");

class Map {

  constructor(){
    this.mapVersion = 0;
  }
  //----------------------------------------------------------------------------
  //Основная логика для работы с тайлами
  //----------------------------------------------------------------------------
  async getTileMain(z, x, y, storage, url) {
    let tile = "";
    //Переключаем режимы работы
    switch (config.network.state) {
      //------------------------------------------------------------------------
      //Режим кеш и сеть (по умолчанию)
      //------------------------------------------------------------------------
      case "enable":
        //Попытка получить тайл из базы
        tile = await db.getTile(z, x, y, storage);
        //Если тайл есть в базе
        if(tile) {
          //Возвращаем тайл из базы
          return tile;
        }
        //Если тайла нет в базе и разрешено загружать с сети
        else {
          //Получаем тайл из сети
          tile = await httpEngine.get(url, "arraybuffer").catch((error) => { Log.make("error", "MAP", error) });
          //Если был получен ответ с сервера
          if(typeof tile !== "undefined") {
            //Если разрешено писать в базу
            if(config.dbReadOnly === false) {
              //Сохраняем тайл в базе
              await db.saveTile(z, x, y, this.storage, tile.data, parseInt(tile.headers['content-length']), this.mapVersion);
            }
            //Возвращаем тайл
            tile = {
              b: tile.data,
              s: parseInt(tile.headers['content-length'])
            }
            return tile;
          }
          else {
            Log.make("error", "MAP", url);
            return false;
          }
        }
        break;
      //------------------------------------------------------------------------
      //Режим только кеш
      //------------------------------------------------------------------------
      case "disable":
        //Попытка получить тайл из базы
        tile = await db.getTile(z, x, y, storage);
        //Если тайл есть в базе
        if(tile) {
          //Возвращаем тайл из базы
          return tile;
        }
        //Если тайла нет в базе
        else {
          //Возвращаем ошибку
          return false;
        }
        break;
      //------------------------------------------------------------------------
      //Режим только интернет
      //------------------------------------------------------------------------
      case "force":
        //Получаем тайл из сети
        tile = await httpEngine.get(url, "arraybuffer").catch((error) => { /*console.log(error)*/ });
        //Если тайл есть в базе
        if(typeof tile !== "undefined") {
          //Если разрешено писать в базу
          if(config.dbReadOnly === false) {
            await db.updateTile(z, x, y, this.storage, tile.data, parseInt(tile.headers['content-length']), this.mapVersion);
          }
          tile = {
            b: tile.data,
            s: parseInt(tile.headers['content-length'])
          }
          return tile;
        }
        else {
          return false;
        }
        break;
    }
  }

  async getRandomInt (max) {
    let arrLetter = [a, b, c];
    return arrLetter[Math.floor(Math.random() * Math.floor(arrLetter.length - 1))];
  }
}

module.exports = Map;
