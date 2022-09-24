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

    this.storage += '/storage/OSM_Marine';
    this._info = {
      id: "osmmarine",
      type: "layer",
      name: "OSM Marine",
      submenu: "Marine",
      tileSize: 256,
      attribution: "",
      content: "image/png"
    };
  }

  async getURL(z, x, y) {
    //z = z - 1;
    let url = 'https://tiles.openseamap.org/seamark/';
    url += z + "/" + x + "/" + y + ".png";
    return url;
  }
}

module.exports = ExtMap;
