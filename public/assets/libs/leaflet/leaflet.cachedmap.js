//------------------------------------------------------------------------------
//Maptorium module to draw tile cached map
//------------------------------------------------------------------------------
L.CachedGrid = L.Class.extend({
  options: {
    show: true,
    color: {
      empty: "red",
      missing: "black",
      present: "green"
    },
    weight: 1,
    opacity: 0.5
	},
  initialize: function (options) {
		L.setOptions(this, options);
    this._cachedGroupe = null;
    this._polygons = null;
    this._cachedMap = null;
		//this._layerControlInputs = [];
		//this._layers = [];
		//this._lastZIndex = 0;
		//this._handlingClick = false;
	},
  onAdd: function (map) {
		this._map = map;
    //map.on('zoomend', this._update, this);
	},
  setData: function(cachedMap) {
    this._cachedMap = cachedMap;
    this._update();
  },
  _draw: function() {
    let time = Date.now();
    this._polygons = {};
    let cachedMap = this._cachedMap;
    if(!cachedMap) {
      return;
    }
    let cachedGroupe = L.featureGroup();

    let margin = 12;

    let scaleFactor = 256;
    let tiles = cachedMap.tiles;

    for (let [key, value] of Object.entries(tiles)) {
      let x = value.x * scaleFactor;
      let y = value.y * scaleFactor;

      let latlngs = [];
  		point = L.point(x + margin, y + margin);
  		point = map.unproject(point, cachedMap.zoom);
  		latlngs.push([point.lat, point.lng]);

  		point = L.point(x + 256 - margin, y + margin);
  		point = map.unproject(point, cachedMap.zoom);
  		latlngs.push([point.lat, point.lng]);

  		point = L.point(x + 256 - margin, y + 256 - margin);
  		point = map.unproject(point, cachedMap.zoom);
  		latlngs.push([point.lat, point.lng]);

  		point = L.point(x + margin, y + 256 - margin);
  		point = map.unproject(point, cachedMap.zoom);
  		latlngs.push([point.lat, point.lng]);

      let polygon = L.polygon(latlngs, {
  			stroke: false,
        fillOpacity: this.options.opacity,
        fillColor: this.options.color[value.state]
  		});
      this._polygons[key] = polygon;
      cachedGroupe.addLayer(polygon);
      cachedGroupe.bringToBack();
    }
    //If enable show cached map
    if(this.options.show) {
      cachedGroupe.addTo(this._map);
      //Save cached map layer
      this._cachedGroupe = cachedGroupe;
    }
    time = Math.round((Date.now() - time) / 1000);
    console.log(`Cached map render time ${time} sec`);
  },
  updateTile: function(tileInfo) {
    if(this._polygons) {
      if(typeof this._polygons[tileInfo.name] !== "undefined") {
        let polygon = this._polygons[tileInfo.name];
        this._cachedMap.tiles[tileInfo.name]['state'] = tileInfo.state;
        polygon.setStyle({
          fillColor: this.options.color[tileInfo.state]
        });
      }
    }
  },
  show: function() {
    if(this._cachedGroupe) {
      this._cachedGroupe.addTo(this._map);
    }
    this.options.show = true;
  },
  hide: function() {
    if(this._cachedGroupe) {
      this._cachedGroupe.remove();
    }
    this.options.show = false;
  },
  _update: function() {
    //If already connected
    if(this._cachedGroupe) {
      this._cachedGroupe.remove();
    }
    this._draw();
  }

});

L.cachedgrid = function (options) {
  return new L.CachedGrid(options);
};
