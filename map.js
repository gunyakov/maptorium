//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
const DB = require("./db.js");
const db = new DB();
//------------------------------------------------------------------------------
//Log
//------------------------------------------------------------------------------
let Log = require('./log.js');
//------------------------------------------------------------------------------
//Statistics
//------------------------------------------------------------------------------
let stat = require('./statistics');
//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
class Map {

  constructor(){
    this._httpEngine = require("./http-engine.js");
    this._log = new Log();
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
          tile = await this._httpEngine.get(url, "arraybuffer").catch((error) => { this._log.make("error", "MAP", error) });
          //Если был получен ответ с сервера
          if(typeof tile !== "undefined") {
            //Если разрешено писать в базу
            if(config.db.ReadOnly === false) {
              //Сохраняем тайл в базе
              await db.saveTile(z, x, y, this.storage, tile.data, parseInt(tile.headers['content-length']), this.mapVersion);
            }
            //Возвращаем тайл
            tile = {
              b: tile.data,
              s: parseInt(tile.headers['content-length'])
            }
            stat.tiles.download++;
            stat.tiles.size += tile.s;
            return tile;
          }
          else {
            this._log.make("error", "MAP", url);
            stat.tiles.error++;
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
        tile = await this._httpEngine.get(url, "arraybuffer").catch((error) => { this._log.make("error", "MAP", error) });
        //Если тайл есть в базе
        if(typeof tile !== "undefined") {
          //Если разрешено писать в базу
          if(config.db.ReadOnly === false) {
            await db.updateTile(z, x, y, this.storage, tile.data, parseInt(tile.headers['content-length']), this.mapVersion);
          }
          tile = {
            b: tile.data,
            s: parseInt(tile.headers['content-length'])
          }
          stat.tiles.download++;
          stat.tiles.size += tile.s;
          return tile;
        }
        else {
          this._log.make("error", "MAP", url);
          stat.tiles.error++;
          return false;
        }
        break;
    }
  }
}

module.exports = Map;
