//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
let map = require("./map.js");
//------------------------------------------------------------------------------
//Exstention to hande Google Sat Map
//------------------------------------------------------------------------------
class Google extends map {

  constructor() {
    super();

    this._mapVersion = 0;
    this.storage = __dirname + '/maps/google';
  }

  async getTile(z, x, y) {
    await this.getMapVersion();
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
    let url = 'https://mt';
    url += await this.getRandomInt(4);
    //httpReq += '2';
    //httpReq += '.google.com/kh/src=app&v=';
    url += '.google.com/vt/lyrs=s&hl=en&v=';
    url += this.mapVersion;
    url += "&z=" + z + "&x=" + x + "&y=" + y;
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

module.exports = Google;
