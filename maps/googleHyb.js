//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
let map = require("../src/map.js");
//------------------------------------------------------------------------------
//Exstention to hande Google Hybrid Map
//------------------------------------------------------------------------------
class ExtMap extends map {

  constructor() {
    super();

    this.storage += '/storage/Both';
    this._info = {
      id: "googlehyb",
      type: "layer",
      name: "Google Hybrid",
      submenu: "Google",
      tileSize: 256,
      attribution: ""
    };
  }

  async getTile(z, x, y) {
    let tileUrl = await this.getURL(z, x, y);
    let tile = await this.getTileMain(z, x, y, tileUrl);
    if(tile) {
      return tile;
    }
    else {
      return false;
    }
  }

  async getURL(z, x, y) {
    z = 18 - z - 1;
    let url = 'http://mt';
    url += '.google.com/vt/lyrs=h@169000000&hl=gb&';
    url += "zoom=" + z + "&x=" + x + "&y=" + y + "&s=Gali";
    return url;
  }

  async getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
}

module.exports = ExtMap;
