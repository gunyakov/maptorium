//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
let map = require("../src/map.js");
//------------------------------------------------------------------------------
//Exstention to hande Google Sat Map
//------------------------------------------------------------------------------
class ExtMap extends map {

  constructor() {
    super();

    this.storage += '/storage/yandex';
    this._info = {
      id: "yandexsat",
      type: "map",
      name: "Yandex Satellite",
      submenu: "Yandex",
      tileSize: 256,
      attribution: "Satellite (Yandex.Maps)",
      content: "image/jpeg"
    };
  }

  async getURL(z, x, y) {
    let rnd = await this.getRandomInt(4);
    let url = `https://core-sat.maps.yandex.net/tiles?l=sat&v=3.941.0&x=${x}&y=${y}&z=${z}&scale=1&lang=ru_RU`;
    //let url = `https://sat0${rnd}.maps.yandex.net/tiles?l=sat&scale=1&lang=ru_RU&x=${x}&y=${y}&z=${z}`;
    return url;
  }

  async getRandomInt(max) {
    let rnd = Math.floor(Math.random() * Math.floor(max));
    if(rnd == 0) {
      rnd = 1;
    }
    return rnd;
  }
}

module.exports = ExtMap;
