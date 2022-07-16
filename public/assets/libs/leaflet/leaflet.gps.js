//------------------------------------------------------------------------------
//Add info table for map
//------------------------------------------------------------------------------
L.GPS = L.Control.extend({
  options : {
    centered : false,
    showRoute: false,
    gpsRun: false
  },
  initialize: function (options) {
	  L.setOptions(this, options);
    let socket = this.options.socket;
    this._map = false;
    this.marker = false;
    this.history = {};
    this.routeDistance = 0;
    //------------------------------------------------------------------------------
    //Marker
    //------------------------------------------------------------------------------
    this.ship16 = L.icon({
    	iconUrl : 'assets/images/Container-Ship-Top-Red-icon16.png',
    	iconRetinaUrl : 'my-icon@2x.png',
    	iconSize : [16, 16],
    	iconAnchor : [8, 8],
    });
    this.ship24 = L.icon({
    	iconUrl : 'assets/images/Container-Ship-Top-Red-icon24.png',
    	iconRetinaUrl : 'my-icon@2x.png',
    	iconSize : [24, 24],
    	iconAnchor : [12, 12],
    });

    this.ship32 = L.icon({
    	iconUrl : 'assets/images/Container-Ship-Top-Red-icon32.png',
    	iconRetinaUrl : 'my-icon@2x.png',
    	iconSize : [32, 32],
    	iconAnchor : [18, 18],
    });

    this.ship48 = L.icon({
    	iconUrl : 'assets/images/Container-Ship-Top-Red-icon48.png',
    	iconRetinaUrl : 'my-icon@2x.png',
    	iconSize : [48, 48],
    	iconAnchor : [24, 24],
    });

    //--------------------------------------------------------------------------
    //Work with GPS data update
    //--------------------------------------------------------------------------
    //Reset all track data
    this.polyline = false;
    //Sent to server request about route history
    if(this.options.showRoute) {
      socket.emit("gps-route-history");
    }
    socket.on("gps-route-history", (data) => {
      this._drawPolyline(data);
    });
    socket.on("gps-history", (data) => {
      if(data) {
        this._drawPolyline(data, false);
      }
    });
    //--------------------------------------------------------------------------
    //Init socket gps data call back function
    //--------------------------------------------------------------------------
    socket.on("gpsData", (data) => {
      if(this.options.gpsRun) {
        //Get Leaflet point by GPS Coords
        var point = L.latLng(data["lat_decimal"], data["lon_decimal"]);
        //Set info widget data
        $("#SOG").text(data['sog'].toFixed(2) + " kn.");
        $("#STW").text(data['stw'].toFixed(2) + " kn.");
        $("#Course").text(data['dir'] + "º");
        //If marker is not shown on map yet
        if(!this.marker && this._map) {
          //Create new marker
          this.marker = new L.marker([50.5, 30.5], {
          	icon : this.ship16,
          	iconAngle : 90
          });
          this._map.addLayer(this.marker);
        }
        //Set marker position
        this.marker.setLatLng(point);
        //Rotate marker according direction
        this.marker.setIconAngle(data['dir'] - 90);
        //----------------------------------------------------------------------
        //Centered map switch ON
        //----------------------------------------------------------------------
        if(this.options.centered) {
          this._map.setView([data["lat_decimal"], data["lon_decimal"]], this._map.getZoom());
        }
        //If polyline is present on map
        if(this.polyline) {
          //Add point to polyline
          this.polyline.addLatLng(point);
          let curDistance = this.polyline.distance("m");
          $("#curDistance").text(curDistance + " mls.");
          if(this.distance > 0) {
            let timeToGo = (this.distance - curDistance) / data['sog'];
            $("#timeToGo").html(timeToGo.toFixed(2) + " hrs");
            $("#leaveDistance").html((this.distance - curDistance) + " mls.");
          }
        }
      }
    });
	},
  onAdd: function(map) {
    this._map = map;
    if(this.polyline) {
      console.log("polyline section");
      map.addLayer(this.polyline);
    }
    map.on('zoomend', this._update, this);
  },
  centered: function() {
    this.options.centered = !this.options.centered;
    return this.options.centered;
  },
  //----------------------------------------------------------------------------
  //Show track handler
  //----------------------------------------------------------------------------
  showRoute: function() {
    //Invers settings
    this.options.showRoute = !this.options.showRoute;
    if(this.options.showRoute) {
      //Sent to server request about route history
      this.options.socket.emit("gps-route-history");
    }
    else {
      //Remove polyline from map
      this._clean();
    }
    return this.options.showRoute;
  },
  service: function() {
    this.options.gpsRun = !this.options.gpsRun;
    if(!this.options.gpsRun && this.marker) {
      this._map.removeLayer(this.marker);
      this.marker = false;
    }
    return this.options.gpsRun;
  },
  clearHistory: function() {
    if(this._map) {
      for (let [key, value] of Object.entries(this.history)) {
        this._map.removeLayer(value);
      }
    }
    this.history = {};
    this.routeDistance = 0;
  },
  _drawPolyline: function(data, track = true) {
    //Init empty point array
    let points = Array();
    //Fill array with leaflet points
    for(i = 0; i < data.points.length; i++) {
      var latlng = L.latLng(data.points[i]["lat"], data.points[i]["lon"]);
      points.push(latlng);
    }
    //Set default color for route
    let color = '#932402';
    //If history route
    if(!track) {
      //Set new color for history route
      color = '#ffff77';
    }
    //Create Leflet polyline
    let trackLine = new L.polyline(points, {
      weight : 1,
      color : color
    });
    //If current route
    if(track) {
      //Save polyline in route storage
      this.polyline = trackLine;
    }
    //If history route
    else {
      //Save polyline in history storage
      this.history[data.ID] = trackLine;
      this.routeDistance += trackLine.distance("m");
    }
    //If Leflet create map
    if(this._map) {
      //Add polyline to map
      this._map.addLayer(trackLine);
      //If current track
      if(track) {
        //Show current route distance
        $("#curDistance").text(this.polyline.distance("m") + " miles.");
      }
      //Redraw polylines according zoom level
      this._update();
    }
  },
  //----------------------------------------------------------------------------
  //Remove polyline from map
  //----------------------------------------------------------------------------
  _clean: function() {
    if(this.polyline) {
      this._map.removeLayer(this.polyline);
      this.polyline = false;
    }
  },
  //----------------------------------------------------------------------------
  //Update marker and polyline depend of zoom level
  //----------------------------------------------------------------------------
  _update: function() {
    if(this.marker) {
      if (this._map.getZoom() <= 4) {
        this.marker.setIcon(this.ship16);
        if(this.polyline) {
          this.polyline.setStyle({
            weight : 1,
            color : '#932402'
          });
        }
      }
      if (this._map.getZoom() > 4 && this._map.getZoom() <= 7) {
        this.marker.setIcon(this.ship24);
        if(this.polyline) {
          this.polyline.setStyle({
            weight : 2,
            color : '#932402'
          });
        }
      }
      if (this._map.getZoom() > 7 && this._map.getZoom() <= 10) {
        this.marker.setIcon(this.ship32);
        if(this.polyline) {
          this.polyline.setStyle({
            weight : 3,
            color : '#932402'
          });
        }
      }
      if (this._map.getZoom() > 10) {
        this.marker.setIcon(this.ship48);
        if(this.polyline) {
          this.polyline.setStyle({
            weight : 4,
            color : '#932402'
          });
        }
      }
    }
  }
});

L.gps = function (options) {
  return new L.GPS(options);
};
