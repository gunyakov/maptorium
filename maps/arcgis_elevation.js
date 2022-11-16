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

    this.storage += '/storage/ArcGIS_Elevation';
    this._info = {
      id: "arcgiselevation",
      type: "map",
      name: "ArcGIS Elevation",
      submenu: "ArcGIS",
      tileSize: 256,
      attribution: "",
      content: "image/jpeg"
    };
  }

  async getURL(z, x, y) {
    //z--;
    let url = `https://server.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/${z}/${y}/${x}`
    return url;
  }
}

module.exports = ExtMap;
