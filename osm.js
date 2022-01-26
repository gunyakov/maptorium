let map = require("./map.js");

class OSM extends map {

  constructor() {
    super();

    this.mapVersion = 0;
    this.storage = __dirname + '/maps/OSM';
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
    //http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
    let url = 'http://';
    url += await this.getRandomInt();
    //httpReq += '2';
    //httpReq += '.google.com/kh/src=app&v=';
    url += '.tile.openstreetmap.org/';
    //httpReq += mapVersion;
    url += z + "/" + x + "/" + y + ".png";
    return url;
  }

  async getRandomInt () {
    let arrLetter = ['a', 'b', 'c'];
    return arrLetter[Math.floor(Math.random() * Math.floor(arrLetter.length - 1))];
  }
}

module.exports = OSM;
