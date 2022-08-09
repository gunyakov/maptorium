//------------------------------------------------------------------------------
//Maptorium module to draw tile cached map
//------------------------------------------------------------------------------
L.CachedMap = L.GridLayer.extend({
  initialize: function (options) {
	  L.setOptions(this, options);
    this._cachedMap = null;
    this._map = null;
    this._curZoom = 0;
    this._tilesList = {};
    this._colors = {
      missing: "rgba(0, 0, 0, 0.5)",
      empty: "rgba(255, 0, 0, 0.5)",
      present: "rgba(0, 255, 0, 0.5)"
    }
  },
  createTile: function (coords) {
    if(this._curZoom != coords.z) {
      this._curZoom = coords.z;
      console.log("Reset tiles list");
      this._tilesList = {};
    }
    // create a <canvas> element for drawing
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');

    // setup tile width and height according to the options
    var size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    if(this._cachedMap) {
      //Calculate scale factor to draw tile
      let scaleFactor = Math.pow(2, Math.abs(this._cachedMap.zoom - coords.z));
      let sizeDraw = 256 / scaleFactor;
      let sizeMargin = Math.round(5 / (scaleFactor / 4));
      let startX = coords.x * scaleFactor;
      let stopX = startX + scaleFactor - 1;
      let startY = coords.y * scaleFactor;
      let stopY = startY + scaleFactor - 1;
      //console.log(coords.x, coords.y, coords.z);
      //console.log(startX, stopX, startY, stopY, scaleFactor, this._cachedMap.zoom, coords.z);
      var ctx = tile.getContext('2d');
      for(let x = startX; x <= stopX; x++) {
        for(let y = startY; y <= stopY; y++) {
          if(typeof this._cachedMap.tiles[x] !== "undefined") {
            if(typeof this._cachedMap.tiles[x][y] !== "undefined") {
              //console.log("draw tile");
              let drawX = (x - startX) * sizeDraw + sizeMargin;
              let drawY = (y - startY) * sizeDraw + sizeMargin;
              //console.log(drawX, drawY, sizeDraw);
              ctx.fillStyle = this._colors[this._cachedMap.tiles[x][y]];
              ctx.fillRect(drawX, drawY, sizeDraw - 2 * sizeMargin, sizeDraw - 2 * sizeMargin);
            }
          }
        }
      }
      //Save current tile in tile list for future update if we draw something on it
      if(typeof this._tilesList[coords.x] == "undefined") {
        this._tilesList[coords.x] = {};
      }
      this._tilesList[coords.x][coords.y] = tile;
    }
    // return the tile so it can be rendered on screen
    return tile;
  },
  setData: function(cachedMap) {
    console.log("set cached map", cachedMap);
    this._cachedMap = cachedMap;
    this.redraw();
  },
  updateTile: function(tileInfo) {
    //console.log(this._tilesList);
    if(this._cachedMap) {
      this._cachedMap.tiles[tileInfo.x][tileInfo.y] = tileInfo.state;
      //Calculate curent zoom tile x/y
      let scaleFactor = Math.pow(2, Math.abs(this._cachedMap.zoom - this._curZoom));
      let x = Math.floor(tileInfo.x / scaleFactor);
      let y = Math.floor(tileInfo.y / scaleFactor);
      //console.log(x, y);
      //Check if we have current zoom tile in list
      if(typeof this._tilesList[x] != "undefined") {
        if(typeof this._tilesList[x][y] != "undefined") {
          //console.log("Tile for draw is find");
          //Get canvas Content
          var ctx = this._tilesList[x][y].getContext('2d');

          //Calculate rect size to draw
          let sizeDraw = 256 / scaleFactor;
          let sizeMargin = Math.round(5 / (scaleFactor / 4));
          let drawX = (tileInfo.x / scaleFactor - Math.floor(tileInfo.x / scaleFactor)) * scaleFactor * sizeDraw + sizeMargin;
          let drawY = (tileInfo.y / scaleFactor - Math.floor(tileInfo.y / scaleFactor)) * scaleFactor * sizeDraw + sizeMargin;
          //Clear pred draw rect
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.fillRect(drawX, drawY, sizeDraw - 2 * sizeMargin, sizeDraw - 2 * sizeMargin);
          //Draw new rect on tile
          ctx.fillStyle = this._colors[tileInfo.state];
          ctx.fillRect(drawX, drawY, sizeDraw - 2 * sizeMargin, sizeDraw - 2 * sizeMargin);
        }
      }
    }
  }
});

L.cachedmap = function (options) {
  return new L.CachedMap(options);
};
