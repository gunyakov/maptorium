//------------------------------------------------------------------------------
//Maptorium module to draw tile mesh
//------------------------------------------------------------------------------
L.TileGrid = L.Class.extend({
  options: {
		zoom: 4,
		zoomOffset: 0,
    show: true,
    showText: true,
    color: '#3388ff',
    weight: 1,
    fillOpacity: 0.5,
    fillColor: '#444444'
	},
  initialize: function (options) {
		L.setOptions(this, options);
    this._gridGroupe = null;
    this._selectMode = false;
    this._callback = false;
	},
  onAdd: function (map) {
		this._map = map;
    this._initGrid();
    map.on('zoomend moveend', this._update, this);
    map.on('click', this._tileselect, this);
	},
  setZoom: function (zoom) {
    zoom = Math.round(zoom);
    this.options.zoom = zoom;
    this._update();

    //if (zoom === undefined) {
      //zoom = this._map.getZoom();
    //}
    //this.options.homeZoom = zoom;
  },
  setZoomOffset: function (zoom) {
    zoom = Math.round(zoom);
    if(zoom > 5) {
      zoom = 4;
    }
    if(zoom < -1) {
      zoom = -1;
    }

    this.options.zoomOffset = zoom;
    this._update();
  },
  setGrid: function(zoom, zoomOffset) {
    this.options.zoomOffset = zoomOffset;
    this.options.zoom = zoom;
    this._update();
  },
  _initGrid: function() {
    if(this.options.zoom == -1 && this.options.zoomOffset == -1) {
      if(this._gridGroupe) {
        this._gridGroupe.remove();
      }
      return true;
    }
    let drawZoom = this.options.zoom;
    if(this.options.zoomOffset != -1) {
      drawZoom = this._map.getZoom() + this.options.zoomOffset;
    }

    let scaleFactor = drawZoom - this._map.getZoom();
    //console.log(scaleFactor);
    if(scaleFactor > 2) {
      this.options.showText = false;
    }
    else {
      this.options.showText = true;
    }
    if(scaleFactor > 5) {
      return true;
    }
    if(drawZoom - this._map.getZoom() > 0) {
      scaleFactor = 256 / Math.pow(2, scaleFactor);
    }
    if(drawZoom - this._map.getZoom() < 0) {
      scaleFactor = 256 * Math.pow(2, Math.abs(scaleFactor));
    }
    if(drawZoom - this._map.getZoom() == 0) {
      scaleFactor = 256;
    }
    //console.log(scaleFactor);
    //console.log(this._map.getPixelBounds());
  	//console.log(this._map.getPixelOrigin());
  	var tileBounds = {};
  	var mapBounds = this._map.getPixelBounds();
  	var x = Math.floor(mapBounds.min.x / scaleFactor);
  	var y = Math.floor(mapBounds.min.y / scaleFactor);
  	var x2 = Math.ceil(mapBounds.max.x / scaleFactor);
  	var y2 = Math.ceil(mapBounds.max.y / scaleFactor);
    var gridGroupe = L.featureGroup();
    //Рисуем вертикальные линии
  	for(i = x; i <= x2; i++) {
  		xCoord = i * scaleFactor;
  		pointA = this._map.unproject(L.point(xCoord, y * scaleFactor));
  		pointB = this._map.unproject(L.point(xCoord, y2 * scaleFactor));
  		pointList = [pointA, pointB];
  		firstpolyline = new L.Polyline(pointList, {
  	    color: this.options.color,
  			weight: 1
  		});
  		gridGroupe.addLayer(firstpolyline);
  	}
    //Рисуем горизонтальные линии
  	for(a = y; a <= y2; a++) {
  		yCoord = a * scaleFactor;
  		pointA = this._map.unproject(L.point(x * scaleFactor, yCoord));
  		pointB = this._map.unproject(L.point(x2 * scaleFactor, yCoord));
  		pointList = [pointA, pointB];
  		firstpolyline = new L.Polyline(pointList, {
  	    color: this.options.color,
  			weight: 1
  		});
      gridGroupe.addLayer(firstpolyline);
  	}
    if(this.options.showText) {
      //Рисуем текст
      var myIcon = "";
      for(i = x; i <= x2; i++) {
        xCoord = i * scaleFactor;
        for(a = y; a <= y2; a++) {
          yCoord = a * scaleFactor;
          pointA = this._map.unproject(L.point(xCoord, yCoord));
          var myIcon = L.divIcon({
            className: '',
            html: "<div style='width: " + scaleFactor + "px; height: " + scaleFactor + "px; display: flex; justify-content: center; align-items: center; color: " + this.options.color + "'>x&nbsp;=&nbsp;" + i + "<br>y&nbsp;=&nbsp;" + a + "</div>"
          });
          gridGroupe.addLayer(L.marker(pointA, {icon: myIcon, zIndexOffset: -10}));
        }
      }
    }
    gridGroupe.addTo(this._map);
    this._gridGroupe = gridGroupe;
    this._gridGroupe.bringToBack();
  },
  _update: function() {
    if(this._gridGroupe) {
      this._gridGroupe.remove();
    }
    //console.log(this._map.getZoom());
    this._initGrid();
  },
  //------------------------------------------------------------------------------
  //Service function to project coordinates
  //------------------------------------------------------------------------------
  _projectCoords: function(coords) {
    let projCoords = [];
    for(i = 0; i < coords.length; i++) {
      if(Array.isArray(coords[i])) {
        coordProject = []
        for(a = 0; a < coords[i].length; a++) {
          coordProject.push(this._map.project(coords[i][a]));
        }
        projCoords.push(coordProject);
      }
      else {
        projCoords.push(this._map.project(coords[i]));
      }
    }
    return projCoords;
  },
  //------------------------------------------------------------------------------
  //Activate select tile as geometry
  //------------------------------------------------------------------------------
  select: function(callback = false) {
    this._selectMode = true;
    this._callback = callback;
  },
  //------------------------------------------------------------------------------
  //Select tile as geometry
  //------------------------------------------------------------------------------
  _tileselect: function(e) {
  	if(this._selectMode) {
  		let points = this._map.project(e.latlng, this._map.getZoom());
  		let x1 = Math.floor(points.x / 256) * 256;
  		let y1 = Math.floor(points.y / 256) * 256;
  		let latlngs = [];
  		point = L.point(x1, y1);
  		point = this._map.unproject(point, this._map.getZoom());
  		latlngs.push([point.lat, point.lng]);
  		point = L.point(x1 + 256, y1);
  		point = this._map.unproject(point, this._map.getZoom());
  		latlngs.push([point.lat, point.lng]);
  		point = L.point(x1 + 256, y1 + 256);
  		point = this._map.unproject(point, this._map.getZoom());
  		latlngs.push([point.lat, point.lng]);
  		point = L.point(x1, y1 + 256);
  		point = this._map.unproject(point, this._map.getZoom());
  		latlngs.push([point.lat, point.lng]);
  		let polygon = L.polygon(latlngs, this.options).addTo(this._map);
      polygon.bindContextMenu(this.options);
  		this._selectMode = false;
      //console.log(polygon);
      let geometry = {
        type: "Polygon",
        bounds: false,
        color: this.options.color,
        fillColor: this.options.fillColor,
        fillOpacity: this.options.fillOpacity,
        coords: this._projectCoords(polygon.getLatLngs()),
        bounds: polygon.getBounds(),
        zoom: this._map.getZoom()
      }
      geometry.bounds._southWest = this._map.project(geometry.bounds._southWest);
      geometry.bounds._northEast = this._map.project(geometry.bounds._northEast);
      if(this._callback) {
        this._callback(geometry, polygon);
      }
  	}
  }
});

L.tilegrid = function (options) {
  return new L.TileGrid(options);
};
