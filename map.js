//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Axios
//------------------------------------------------------------------------------
const axios = require('axios').default;
//------------------------------------------------------------------------------
//Proxy agent for axios
//------------------------------------------------------------------------------
const SocksProxyAgent = require('socks-proxy-agent');
//------------------------------------------------------------------------------
//Handle DB
//------------------------------------------------------------------------------
const DB = require("./db");
const db = new DB();
//------------------------------------------------------------------------------
//CRC32 for tile hash (use to check if downloaded tile is different from DB tile)
//------------------------------------------------------------------------------
let CRC32 = require('crc-32');
//------------------------------------------------------------------------------
//Google Sat Map
//------------------------------------------------------------------------------
class Map {

  constructor(){
    this.mapVersion = 0;
  }

  async getTile(z, x, y) {
    //Устанавливаем по умолчанию ошибку запроса к базе
    let sqlRunError = true;
    //Устанавливаем, что базу не нужно открывать принудительно
    let force = false;
    //Запускаем цикл
    while(sqlRunError) {
      //Получаем дескриптор базы данных
      let objDB = await db.getDB(z, x, y, force);
      //console.log(z, x, y);
      //Формируем запрос к базе данных
      let sql = "SELECT s, b FROM t WHERE x = ? AND y = ?;";
      //Получаем ответ из базы
      let results = await objDB.all(sql, [x, y]).catch((error) => { console.log("getTile 32: ", error) });
      //console.log(results);
      //Если нет ошибки запроса к базе
      if(typeof results !== "undefined") {
        //Если в базе нет тайла
        if (results.length == 0) {
          //return false;
          //Формируем запрос к серверу гугла
          let httpReq = 'https://mt';
          httpReq += await this.getRandomInt(4);
          //httpReq += '2';
          //httpReq += '.google.com/kh/src=app&v=';
          httpReq += '.google.com/vt/lyrs=s&hl=en';
          //httpReq += mapVersion;
          httpReq += "&z=" + z + "&x=" + x + "&y=" + y;
          console.log(httpReq);
          //https://mt1.google.com/vt/lyrs=s&hl=en&x=37&y=19&z=6
          //Устанавливаем доп опции запроса
          let request = await this.getHTTPAgent();
          request.url = httpReq;
          //Получаем версию гугл карт если они еще не полученны
          let mapVersion = await this.getMapVersion();
          //Получаем текущее время сервера
          let timeStamp = await this.time();
          console.log("Start request");
          //Делаем запрос к серверу гугла
          let responce = await axios({
            url: httpReq,
            method: 'get',
            responseType: "arraybuffer"
          }).catch((error) => { console.log(error) });
          console.log("Finish request");
          if(typeof responce !== 'undefined') {
            //Преключатель ответов
            switch (responce.status) {
              //Если получили изображение
              case 200:
                //Получаем повторно ссылку на базу данных ,так как она могла быть закрыта пока выполнялся запрос
                objDB = await db.getDB(z, x, y);
                //Заносим изображение в базу
                await objDB.run("INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", parseInt(responce.headers['content-length']), Math.abs(CRC32.bstr(new Buffer.from( responce.data, 'binary' ).toString('utf8'))), timeStamp, responce.data]).catch((error) => { console.log("DB error: Insert full tile. ", error) });
                results = {
                  "s": parseInt(responce.headers['content-length']),
                  "b": responce.data
                }
                return results;
                break;
              case 404:
                //Получаем повторно ссылку на базу данных ,так как она могла быть закрыта пока выполнялся запрос
                objDB = await db.getDB(z, x, y);
                await objDB.run("INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);", [x, y, mapVersion, "", 0, 0, timeStamp, '']).catch((error) => { console.log("DB error: Insert empty tile. ", error) });
                return false;
                break;
              default:
                console.log(responce.status);
                return false;
            }
          }
          else {
            return false;
          }
        }
        else {
          return results[0];
        }
      }
      //Если произошла ошибка запроса к базе
      else {
        //Выводим сообщение
        console.log("DB request problem.", await db.getDBName(z, x, y));
        force = true;
        //return false;
      }
    }
  }

  async getMapVersion() {
    if(this.mapVersion == 0) {
      let re = "https://khms\\d+.googleapis\\.com/kh\\?v=(\\d+)";
      let request = await this.getHTTPAgent();
      request.url = 'https://maps.googleapis.com/maps/api/js';
      request.encoding = "utf-8";
      let responce = await axios.get(request.url).catch((error) => { console.log(error) });
      if (responce.status == 200) {
        this.mapVersion = responce.data.match(re)[1];
      }
      console.log("Google map version: " + this.mapVersion);
      return this.mapVersion;
    }
    else {
      return this.mapVersion;
    }

  }

  async getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  async getHTTPAgent() {
    var options = {
      encoding: null,
      //agent: agent,
      //proxy: config.proxy,
      url: '',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:70.0) Gecko/20100101 Firefox/70.0',
      }
    }
    return options;
  }

  async time() {
    return parseInt(new Date().getTime()/1000)
  }
}

module.exports = Map;
