//--------------------------------------------------------------------------
//Tiles Grid with zoom
//--------------------------------------------------------------------------
L.featureGroup.Grid = L.FeatureGroup.extend({
  options: {
    grid: {
      size: 256,
      show: true
    },
    line : {
      color : 'gray',
      weight : 1,
      opactiy : 0.8
    },
    zoomFactor : 2,
  },
  initialize: function(options) {
      L.setOptions(this, options);
      if (this.options.grid.size) {
        this._currentGridSize = this.options.grid.size;
      }
  },
  addTo: function (map) {
    //Link to current map
    this._map = map;
    this._map.on('zoomend', this._zoomEnd, this);
    this._map.on('moveend', this._moveEnd, this);
    this._drawGrid();
    return this;
  },
  remove: function() {
    if(this._grid) {
      this._grid.remove();
    }
    return;
  },
  _drawGrid: function() {
    if(!this._map) {
      return;
    }
    if(!this.options.grid.show) {
      return;
    }
    this.remove();
    let bounds = this._map.getBounds();
    //console.log(mymap.getBounds());
    let startCoords = this._map.project(bounds._northEast, this._map.getZoom());
    let endCoords = this._map.project(bounds._southWest, this._map.getZoom());
    let x2 = Math.ceil(startCoords.x / this._currentGridSize) * this._currentGridSize;
    let y1 = Math.floor(startCoords.y / this._currentGridSize) * this._currentGridSize;
    let x1 = Math.floor(endCoords.x / this._currentGridSize) * this._currentGridSize;
    let y2 = Math.ceil(endCoords.y / this._currentGridSize) * this._currentGridSize;
    //console.log(x1, y1, x2, y2);
    let grid = L.layerGroup();
    for(x = x1; x <= x2; x += this._currentGridSize) {
      var point1 = L.point(x, y1);
      point1 = this._map.unproject(point1, this._map.getZoom());
      var point2 = L.point(x, y2);
      point2 = this._map.unproject(point2, this._map.getZoom());
      var latlngs = [
          [point1.lat, point1.lng],
          [point2.lat, point2.lng]
      ];
      var polyline = L.polyline(latlngs, this.options.line);
      grid.addLayer(polyline);
    }
    for(y = y1; y <= y2; y += this._currentGridSize) {
      var point1 = L.point(x1, y);
      point1 = this._map.unproject(point1, this._map.getZoom());
      var point2 = L.point(x2, y);
      point2 = this._map.unproject(point2, this._map.getZoom());
      var latlngs = [
          [point1.lat, point1.lng],
          [point2.lat, point2.lng]
      ];
      var polyline = L.polyline(latlngs, this.options.line);
      grid.addLayer(polyline);
    }
    this._grid = grid.addTo(this._map);
    return;
  },
  _moveEnd : function() {
    if (!this._map) {//May have been removed from the map by a zoomEnd handler
      return;
    }
    if (this.options.grid.show) {
      this._drawGrid();
    }
  },
  _zoomEnd : function(e) {
    if (!this._map) {//May have been removed from the map by a zoomEnd handler
      return;
    }
    this._oldZoom = this._currentZoom || this._map._zoom;
    this._currentZoom = this._map._zoom;
    this._newGridSize = this._currentGridSize;

    if (this._currentZoom > this._minZoom) {
      if (this._currentZoom > this._oldZoom) {
        this.decreaseGridSize();
      }
      if (this._currentZoom < this._oldZoom) {
        this.increaseGridSize();
      }
    }
  },
  decreaseGridSize: function() {
    let zoomFactor = this.options.zoomFactor;

    if (!this._newGridSize) {
      this._newGridSize = this._currentGridSize;
    }
    this._newGridSize *= 1 / zoomFactor;
    this._gridSizeChanged();
  },
  increaseGridSize: function() {
    let zoomFactor = this.options.zoomFactor;
    if (!this._newGridSize) {
      this._newGridSize = this._currentGridSize;
    }
    this._newGridSize *= zoomFactor;
    this._gridSizeChanged();
  },
  _gridSizeChanged : function() {
    this._currentGridSize = this._newGridSize;

    if (this.options.grid.show) {
      this._drawGrid();
    }
  },
});

L.grid = function(opts) {
  return new L.featureGroup.Grid(opts);
};
