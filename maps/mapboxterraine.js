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

    this.storage += '/storage/mapboxterraine';
    this._info = {
      id: "mapboxterraine",
      type: "layer",
      name: "Terraine",
      submenu: "MapBOX",
      tileSize: 512,
      attribution: "",
      content: "image/webp"
    };
  }

  async getURL(z, x, y) {
    z--;
    let url = `https://api.maptiler.com/tiles/hillshade/${z}/${x}/${y}.webp?key=gbetYLSD5vR8MdtZ88AQ`
    return url;
  }
}

module.exports = ExtMap;
