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

    this.storage += '/storage/google';
    this._info = {
      id: "googlesat",
      type: "map",
      name: "Google Satellite",
      submenu: "Google",
      tileSize: 256,
      attribution: ""
    };
  }

  async getTile(z, x, y) {
    await this.getMapVersion();
    let tileUrl = await this.getURL(z, x, y);
    this._log.make("info", "HTTP", tileUrl);
    let tile = await this.getTileMain(z, x, y, tileUrl);
    if(tile) {
      return tile;
    }
    else {
      return false;
    }
  }

  async getURL(z, x, y) {
    let rnd = await this.getRandomInt(4);
    let url = `https://mt${rnd}.google.com/vt/lyrs=s&hl=en&v=${this.mapVersion}&z=${z}&x=${x}&y=${y}`;
    return url;
  }

  async getMapVersion() {
    if(this.mapVersion == 0) {
      let re = "https://khms\\d+.googleapis\\.com/kh\\?v=(\\d+)";
      //let request = await this.getHTTPAgent();
      let url = 'https://maps.googleapis.com/maps/api/js';
      //request.encoding = "utf-8";
      let responce = await this._httpEngine.get(url).catch((error) => {
        this._log.make("error", "HTTP", error);
      });
      //response = response.body;
      //console.log(response);
      if(typeof responce !== "undefined") {
        if (responce.status == 200) {
          let mapVersion = responce.data.match(re);
          if(mapVersion != null) {
            this.mapVersion = mapVersion[1];
          }
          else {
            return this.mapVersion = 917;
          }
        }
        this._log.make("info", "HTTP", "Google map version: " + this.mapVersion);
        return this.mapVersion;
      }
      else {
        return this.mapVersion = 917;
      }
    }
    else {
      return this.mapVersion = 917;
    }
  }
  async getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
}

module.exports = ExtMap;
