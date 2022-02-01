//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
let map = require("../map.js");
//------------------------------------------------------------------------------
//Exstention to hande Google Sat Map
//------------------------------------------------------------------------------
class ExtMap extends map {

  constructor() {
    super();

    this.storage += '/storage/yandex_hyb';
    this._info = {
      id: "yandexhyb",
      type: "layer",
      name: "Yandex Hybrid",
      submenu: "Yandex",
      tileSize: 256,
      attribution: "Hybrid (Yandex.Maps)"
    };
  }

  async getTile(z, x, y) {
    let tileUrl = await this.getURL(z, x, y);
    this._log.make("info", "HTTP", tileUrl);
    let tile = await this.getTileMain(z, x, y, this.storage, tileUrl);
    if(tile) {
      return tile;
    }
    else {
      return false;
    }
  }

  async getURL(z, x, y) {
    let url = `https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x=${x}&y=${y}&z=${z}&scale=1&lang=ru_RU`;
    return url;
  }

}

module.exports = ExtMap;
