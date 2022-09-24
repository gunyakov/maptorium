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

    this.storage += '/storage/mapbox';
    this._info = {
      id: "mapbox",
      type: "layer",
      name: "Vector",
      submenu: "MapBOX",
      tileSize: 256,
      attribution: "",
      content: "application/x-protobuf",
      format: "vector"
    };
  }

  async getURL(z, x, y) {
    let url = `https://api.maptiler.com/tiles/v3/${z}/${x}/${y}.pbf?key=P2DGn4fI4cVJ928SF14v`;
    return url;
  }
}

module.exports = ExtMap;
