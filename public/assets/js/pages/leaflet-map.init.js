//------------------------------------------------------------------------------
//Init values
//------------------------------------------------------------------------------
let map = false;
let arrMapsList = {};
let arrLayersList = {};
let currentMap = false;
let currentLayer = false;
let cachedMap = false;
//------------------------------------------------------------------------------
//Socket IO
//------------------------------------------------------------------------------
let socket = io();
//------------------------------------------------------------------------------
//Change main map
//------------------------------------------------------------------------------
function changeMap(mapID) {
  currentMap.remove();
  currentMap = arrMapsList[mapID];
  currentMap.addTo(map);
  currentMap.bringToBack();
}
//------------------------------------------------------------------------------
//Hide all layers from map
//------------------------------------------------------------------------------
function hideAllLayers() {
  for (const layer in arrLayersList) {
    arrLayersList[layer].remove();
  }
}
//------------------------------------------------------------------------------
//Add layer to map
//------------------------------------------------------------------------------
let addLayer = function (mapID) {
  arrLayersList[mapID].addTo(map);
  arrLayersList[mapID].bringToFront();
}
//------------------------------------------------------------------------------
//Section to be executed after document ready
//------------------------------------------------------------------------------
$(document).ready(() => {
  //------------------------------------------------------------------------------
  //Resize map after loading
  //------------------------------------------------------------------------------
  $("#leaflet-map").height($(document).height() - $(".topnav").height() + 2);
  $("#dashtoggle").on("hidden.bs.collapse", function() {
    $("#leaflet-map").height($(document).height() - $(".topnav").height() + 2);
  });
  $("#dashtoggle").on("shown.bs.collapse", function() {
    $("#leaflet-map").height($(document).height() - $(".topnav").height() - $("#dashtoggle").height() + 2);
  });
  //------------------------------------------------------------------------------
  //Init Map
  //------------------------------------------------------------------------------
  map = L.map('leaflet-map').setView([39, 0], 5);
  //------------------------------------------------------------------------------
  //GPS handling
  //------------------------------------------------------------------------------
  let GPS = L.gps({
    socket: socket,
    showRoute: true,
    gpsRun: true
  });
  GPS.onAdd(map);
  //----------------------------------------------------------------------------
  //Menu handler
  //----------------------------------------------------------------------------
  $(".dropdown-item").on("click", function(e) {
    switch($(this).attr("data-key")) {
      //------------------------------------------------------------------------------
      //Change server tiles download mode (common settings)
      //------------------------------------------------------------------------------
      case "t-change-mode":
        socket.emit("mode-change", $(this).attr("mode-val"));
        break;
      case "t-select-tile":
        TileGrid.select(function(geometry) {
          socket.emit("newGeometry", geometry);
        });
        break;
      //------------------------------------------------------------------------
      //GPS menu handler
      //------------------------------------------------------------------------
      case "gps-centered-map":
        if(GPS.centered()) {
          alertify.message("GPS Centered: ON");
          $(this).addClass("bg-secondary");
        }
        else {
          alertify.message("GPS Centered: OFF");
          $(this).removeClass("bg-secondary");
        }
        break;
      case "gps-show-route":
        if(GPS.showRoute()) {
          alertify.message("GPS Route: ON");
          $(this).addClass("bg-secondary");
        }
        else {
          alertify.message("GPS Route: OFF");
          $(this).removeClass("bg-secondary");
        }
        break;
      case "gps-connect":
        if(GPS.service()) {
          alertify.message("GPS: ON");
          $(this).addClass("bg-secondary");
        }
        else {
          alertify.message("GPS: OFF");
          $(this).removeClass("bg-secondary");
        }
        break;
      case "gps-sample":
        alertify.prompt("Enter new sample rate of GPS position, in seconds.", "60", function(e, t) {
          socket.emit("gps-sample", t);
        }).set({title: "GPS New sample rate"});
        break;
      case "gps-new-route":
        alertify.prompt("Enter name of new route", "New route", function(e, t) {
          socket.emit("gps-new-route", t);
        }).set({title: "New route"});
        break;
      case "gps-server-service":
        socket.emit("gps-server-service");
        break;
      case "gps-record":
        socket.emit("gps-record");
        break;
      case "gps-show-history":
        let routeID = $(this).attr("data-id");
        console.log(routeID)
        if(routeID > 0) {
          socket.emit("gps-history", routeID);
        }
        else {
          alertify.warning("GPS Track history is still empty.");
        }
        break;
      case "gps-clear-history":
        GPS.clearHistory();
        break;
      default:
        alertify.warning("Function in progress");
        break;
    }
  });
  function menuInit () {
    $(".dropdown-item").on("click", function(e) {
      switch($(this).attr("data-key")) {
        case "gps-show-history":
          let routeID = $(this).attr("data-id");
          console.log(routeID)
          if(routeID > 0) {
            socket.emit("gps-history", routeID);
          }
          else {
            alertify.warning("GPS Track history is still empty.");
          }
          break;
      }
    });
  }

  menuInit();

  socket.on(["gps-sample", "gps-new-route", "gps-record"], (data) => {
    switch(data.type) {
      case "error":
        alertify.error(data.message);
        break;
      default:
        alertify.message(data.message);
    }
  });
  socket.on("mode-change", (data) => {
    alertify.message(data.message);
  });
  socket.on("gps-server-service", (data) => {
    switch(data.type) {
      case "success":
        $("#gps-server-service").addClass("bg-secondary");
        break;
      default:
        $("#gps-server-service").removeClass("bg-secondary");
        break;
    }
    alertify.message(data.message);
  });
  socket.on("gps-record", (data) => {
    switch(data.type) {
      case "success":
        $("#gps-record").addClass("bg-secondary");
        break;
      default:
        $("#gps-record").removeClass("bg-secondary");
        break;
    }
    alertify.message(data.message);
  });
  socket.emit("gps-get-list");
  socket.on("gps-set-list", (data) => {
    if(data) {
      let html = "";
      for(let i = 0; i < data.length - 1; i++) {
        html += `<a href="#" class="dropdown-item" data-key="gps-show-history" data-id="${data[i]['ID']}">${data[i]['name']}</a>`
      }
      $("#gps-history-list").html(html);
      menuInit();
    }
    else {
      alertify.warning("GPS Routes list empty.");
    }
  });
  //------------------------------------------------------------------------------
  //Default style for geometry
  //------------------------------------------------------------------------------
  let color = "#10db83";
  let fillColor = "#1410db";
  let fillOpacity = 0.6;
  //------------------------------------------------------------------------------
  //Set default style for geometry
  //------------------------------------------------------------------------------
  map.pm.setPathOptions({
    color: color,
    fillColor: fillColor,
    fillOpacity: fillOpacity,
  });
  //------------------------------------------------------------------------------
  //Add info table for map
  //------------------------------------------------------------------------------
  var MyControl2 = L.Control.extend({
    options : {
      position : 'bottomleft'
    },

    onAdd : function(map) {
      // create the control container with a particular class name
      var container = L.DomUtil.get('routeInfo');
      // ... initialize other DOM elements, add listeners, etc.

      return container;
    }
  });
  map.addControl(new MyControl2());

  //L.PM.setOptIn(true);
  map.pm.addControls({
    position: 'topright',
    drawCircle: false,
    drawCircleMarker: false,
    drawRectangle: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: false,
    rotateMode: false
  });
  //------------------------------------------------------------------------------
  //Finish create geometry element on map
  //------------------------------------------------------------------------------
  map.on("pm:create", (e) => {
    //Bind context menu for new element
    e.marker.bindContextMenu({
      contextmenu: true,
      contextmenuWidth: 140,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Edit',
        callback: editGeometry//workingLayer.pm.enable()
      },
      '-',
      {
        text: 'Delete',
        callback: deleteGeometry//workingLayer.remove()
      }]
    });
    console.log(e.shape);
    //Send data of element to server
    let geometry = {
      type: e.shape,
      bounds: false,
      color: color,
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      coords: [],
      zoom: map.getZoom()
    }
    let coords = false;
    switch(e.shape) {
      case "Polygon":
      case "Line":
        geometry.coords = projectCoords(e.marker.getLatLngs());

        geometry.bounds = e.marker.getBounds();
        geometry.bounds._southWest = map.project(geometry.bounds._southWest);
        geometry.bounds._northEast = map.project(geometry.bounds._northEast);
        break;
      case "Marker":
        geometry.coords = map.project(e.marker.getLatLng());
        break;
    }

    socket.emit("newGeometry", geometry);
  });
  //------------------------------------------------------------------------------
  //Bottom bar add on map
  //------------------------------------------------------------------------------
  var controlBar = L.control.bar('bar',{
  	position: 'bottom',
  	visible: true
  });
  map.addControl(controlBar);
  //------------------------------------------------------------------------------
  //Tile grid add to map
  //------------------------------------------------------------------------------
  var TileGrid = L.tilegrid({
    zoomOffset: -1,
    zoom: -1
  });
  TileGrid.onAdd(map);

  window.setTileGrid = function(zoom, zoomOffset) {
    TileGrid.setGrid(zoom, zoomOffset);
  }
  //------------------------------------------------------------------------------
  //Response maps list from server
  //------------------------------------------------------------------------------

  socket.on("setMapList", (data) => {
    //console.log(data);
    $("#jobMap").html('');

    arrMenuMap = [];
    arrMenuLayer = [];

  	for(i = 0; i < data.length; i++) {
  		let mapInfo = data[i];
  		let tileLayer = L.tileLayer(`tile?map=${mapInfo.id}&z={z}&x={x}&y={y}`, {
  			maxZoom: 18,
  			attribution: mapInfo.attribution,
  			tileSize: mapInfo.tileSize,
  			zoomOffset: 0
  		});

  		$("#jobMap").append(`<option value="${mapInfo.id}">${mapInfo.name}</option>`)
  		if(mapInfo.type == "map") {
        if(typeof arrMenuMap[mapInfo.submenu] == "undefined") {
          arrMenuMap[mapInfo.submenu] = [];
        }
        arrMenuMap[mapInfo.submenu].push(mapInfo);
        arrMapsList[mapInfo.id] = tileLayer;
  			if(!currentMap) {
  				currentMap = tileLayer;
  				currentMap.addTo(map);
  			}
  		}
  		if(mapInfo.type == "layer") {
        if(typeof arrMenuLayer[mapInfo.submenu] == "undefined") {
          arrMenuLayer[mapInfo.submenu] = [];
        }
        arrMenuLayer[mapInfo.submenu].push(mapInfo);
  			arrLayersList[mapInfo.id] = tileLayer;
  			if(!currentLayer) {
  				currentLayer = tileLayer;
  				currentLayer.addTo(map);
  			}
  		}
  	}

    $("#maps-list").html(generateHTMLMenu(arrMenuMap));
    $("#layers-list").html(generateHTMLMenu(arrMenuLayer, "layer"));

    CachedMap.bringToFront();
  });
  //------------------------------------------------------------------------------
  //Generate specific HTML for current theme to show menu
  //------------------------------------------------------------------------------
  function generateHTMLMenu(arrMenu, type = "map") {
    let menuHTML = '';
    let functionName = "changeMap";
    if(type == 'layer') {
      functionName = "addLayer";
      menuHTML = `<div class="dropdown"><a class="dropdown-item dropdown-toggle arrow-none" href="#" role="button" onclick="hideAllLayers()">Hide All</a></div><div class="dropdown"><hr class="dropdown-divider"></div>`
    }
    for (let [key, value] of Object.entries(arrMenu)) {
      if(key != "") {
        menuHTML += `<div class="dropdown"><a class="dropdown-item dropdown-toggle arrow-none" href="#" role="button"><span data-key="t-invoices">${key}</span> <div class="arrow-down"></div></a>
        <div class="dropdown-menu" aria-labelledby="topnav-invoice">`
      }
      for(a = 0; a < value.length; a++) {
        mapInfo = value[a];
        if(key != "") {
          menuHTML += `<a href="#" class="dropdown-item" onclick="${functionName}('${mapInfo.id}')">${mapInfo.name}</a>`;
        }
        else {
          menuHTML += `<div class="dropdown"><a class="dropdown-item dropdown-toggle arrow-none" href="#" role="button" onclick="${functionName}('${mapInfo.id}')">${mapInfo.name}</div></a>`;
        }
      }
      if(key != "") {
        menuHTML += "</div></div>";
      }
    }
    return menuHTML;
  }


  //------------------------------------------------------------------------------
  //Request for maps list on server
  //------------------------------------------------------------------------------
  socket.on("connect", () => {
  	socket.emit("getMapList", "");
  });
  //------------------------------------------------------------------------------
  //Request for geometry in DB
  //------------------------------------------------------------------------------
  socket.emit("getGeometry");

  let lastGeometry = false;

  let saveButton = false;
  //------------------------------------------------------------------------------
  //Recived geometry list from server
  //------------------------------------------------------------------------------
  socket.on("setGeometry", (geometry) => {
    for(i = 0; i < geometry.length; i++) {
      var latlngs = [];
      for(a = 0; a < geometry[i].points.length; a++) {
        latlngs.push(map.unproject(L.point(geometry[i]['points'][a]['x'], geometry[i]['points'][a]['y']), geometry[i]['zoom']));
      }
      let workingGeometry = '';
      switch(geometry[i]['type']) {
        case "Line":
          workingGeometry = L.polyline(latlngs, {
            color: geometry[i]['color'],
            contextmenu: true,
            contextmenuWidth: 140,
            contextmenuInheritItems: false,
            contextmenuItems: [{
              text: 'Edit',
              callback: editGeometry//workingLayer.pm.enable()
            },
            '-',
            {
              text: 'Delete',
              callback: deleteGeometry//workingLayer.remove()
            }]
          }).addTo(map);
          break;
        case "Polygon":
          workingGeometry = L.polygon(latlngs, {
            color: geometry[i]['color'],
            fillColor: geometry[i]['fillColor'],
            fillOpacity: geometry[i]['fillOpacity'],
            contextmenu: true,
            contextmenuWidth: 140,
            contextmenuInheritItems: false,
            contextmenuItems: [{
              text: 'Edit',
              callback: editGeometry
            },
            {
              text: 'Start download job',
              callback: showJobModal
            },
            {
              text: 'Show tile cached map',
              callback: showTileCachedMap
            },
            '-',
            {
              text: 'Delete',
              callback: deleteGeometry
            }]
          }).addTo(map);
          break;
        case "Marker":
          workingGeometry = L.marker(latlngs[0], {
            contextmenu: true,
            contextmenuWidth: 140,
            contextmenuInheritItems: false,
            contextmenuItems: [{
              text: 'Move',
              callback: editGeometry//workingLayer.pm.enable()
            },
            '-',
            {
              text: 'Delete',
              callback: deleteGeometry//workingLayer.remove()
            }]
          }).addTo(map);
          break;
      }
      if(geometry[i]['name']) {
        workingGeometry.bindTooltip(geometry[i]['name']);
      }
      else {
        workingGeometry.bindTooltip('Geometry ' + geometry[i]['ID']);
      }
      workingGeometry.shape = geometry[i]['type'];
      workingGeometry.maptoriumID = geometry[i]['ID'];
    }

  });
  /*map.pm.enableDraw('Marker', {
    snappable: true,
    snapDistance: 20,
  });*/
  //------------------------------------------------------------------------------
  //Tiled cached map
  //------------------------------------------------------------------------------
  let CachedMap = L.cachedmap();
  CachedMap.addTo(map);
  window.showTileCachedMap = function(e) {
    socket.emit("getTileCachedMap", {ID: e.relatedTarget.maptoriumID});
  }
  socket.on("setTileCachedMap", async (cachedMap) => {
    //cachedMap.setUrl(`cachedMap?z={z}&x={x}&y={y}&r=${Date.now()}`);
    CachedMap.setData(cachedMap);
    //CachedMap.bringToFront();
  });
  socket.on("updateTileCachedMap", async (tileInfo) => {
    CachedMap.updateTile(tileInfo);
  });
  //------------------------------------------------------------------------------
  //Context menu: EDIT GEOMETRY
  //------------------------------------------------------------------------------
  window.editGeometry = function (e) {
    //Show button to save result
    saveButton = L.easyButton( `<a class="nav-link dropdown-toggle arrow-none" href="#" id="topnav-pages" role="button">
                                  <span data-key="t-apps"></span>
                                </a>`, function(){
      //Remove button from map
      saveButton.remove();
      //If we have alredy edited geometry
      if(lastGeometry) {
        //Hide editing vortex
        lastGeometry.pm.disable();
        //Init geometry OBJ
        let geometry = {
          ID: lastGeometry.maptoriumID,
          type: lastGeometry.shape,
          bounds: false,
          color: color,
          fillColor: fillColor,
          fillOpacity: fillOpacity
        }
        //Add bounds and LngLat arrays
        switch(lastGeometry.shape) {
          case "Polygon":
          case "Line":
            geometry.coords = coordProject(lastGeometry.getLatLngs());
            geometry.bounds = lastGeometry.getBounds();
            geometry.bounds._southWest = map.project(geometry.bounds._southWest);
            geometry.bounds._northEast = map.project(geometry.bounds._northEast);
            break;
          case "Marker":
            geometry.coords = map.project(lastGeometry.getLatLng());
            break;
        }
        geometry.zoom = map.getZoom();
        //Send data to server
        socket.emit("updateGeometry", geometry);
      }
    }).addTo(map);
    //If we have last geometry
    if(lastGeometry) {
      //Hide editing vortex
      lastGeometry.pm.disable();
    }
    //Enable editing vortex for current geometry
    e.relatedTarget.pm.enable();
    //Save current geometry into var
    lastGeometry = e.relatedTarget;
  }
  //------------------------------------------------------------------------------
  //Context menu: DELETE GEOMETRY
  //------------------------------------------------------------------------------
  window.deleteGeometry = function(e) {
    //Send to server ID of geometry
    socket.emit("deleteGeometry", e.relatedTarget.maptoriumID);
    //Remove geometry from map
    e.relatedTarget.remove();
  }
  //------------------------------------------------------------------------------
  //Show confog window for job order
  //------------------------------------------------------------------------------
  window.showJobModal = function(e) {
    $("#polygonID").val(e.relatedTarget.maptoriumID);
    $("#jobModal").modal('show');
  }

});
