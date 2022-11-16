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

    this.storage += '/storage/ArcGIS_Sat';
    this._info = {
      id: "arcgissat",
      type: "map",
      name: "ArcGIS Satellite",
      submenu: "ArcGIS",
      tileSize: 256,
      attribution: "",
      content: "image/jpeg"
    };
  }

  async getURL(z, x, y) {
    //z--;
    let url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
    return url;
  }
}

module.exports = ExtMap;
