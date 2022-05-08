//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
let map = require("../src/map.js");
//------------------------------------------------------------------------------
//Exstention to hande OSM maps
//------------------------------------------------------------------------------
class ExtMap extends map {

  constructor() {
    super();

    this.storage += '/storage/OSM';
    this._info = {
      id: "osm",
      type: "map",
      name: "OSM",
      submenu: "",
      tileSize: 256,
      attribution: "Map data &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, " +
                   "Imagery © <a href='https://www.mapbox.com/'>Mapbox</a>"
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
    let url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
    return url;
  }
}

module.exports = ExtMap;
