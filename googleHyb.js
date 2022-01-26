let map = require("./map.js");

class GoogleHybrid extends map {

  constructor() {
    super();

    this.mapVersion = 0;
    this.storage = __dirname + '/maps/Both';
  }

  async getTile(z, x, y) {
    let tileUrl = await this.getURL(z, x, y);
    let tile = await this.getTileMain(z, x, y, this.storage, tileUrl);
    if(tile) {
      return tile;
    }
    else {
      return false;
    }
  }

  async getURL(z, x, y) {
    z = 18 - z - 1;
    //http://mt0.google.com/vt/lyrs=h@169000000&hl=ru&x=1&y=0&zoom=16&s=Galil
    let url = 'http://mt';
    //url += await this.getRandomInt(4);
    //httpReq += '2';
    //httpReq += '.google.com/kh/src=app&v=';
    url += '.google.com/vt/lyrs=h@169000000&hl=ru&';
    //httpReq += mapVersion;
    url += "zoom=" + z + "&x=" + x + "&y=" + y + "&s=Gali";
    return url;
  }

  async getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
}

module.exports = GoogleHybrid;
