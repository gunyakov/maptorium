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
  //MAP: Resize after loading
  //------------------------------------------------------------------------------
  $("#leaflet-map").height($(document).height() - $(".topnav").height() + 2);
  $("#dashtoggle").on("hidden.bs.collapse", function() {
    $("#leaflet-map").height($(document).height() - $(".topnav").height() + 2);
  });
  $("#dashtoggle").on("shown.bs.collapse", function() {
    $("#leaflet-map").height($(document).height() - $(".topnav").height() - $("#dashtoggle").height() + 2);
  });
  //----------------------------------------------------------------------------
  //MAP: Init
  //----------------------------------------------------------------------------
  map = L.map('leaflet-map', {
     editable: true,
     contextmenu: true,
     //contextmenuWidth: 300,
     contextmenuItems: [{
       text: 'Add placemark',
       iconCls: 'mdi mdi-pin-outline',
       callback: addPlacemark
     },
     '-',
     {
       text: 'Force download map tile to cache',
       callback: downloadTileMap,
       iconCls: "mdi mdi-download-multiple"
     },
     {
       text: 'Force download overlay tile to cache',
       callback: downloadTileOverlay,
       iconCls: "mdi mdi-download-multiple"
     }]
  }).setView([39, 0], 5);
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for map
  //----------------------------------------------------------------------------
  function downloadTileMap (e) {
    console.log(e);
  }
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for overlay
  //----------------------------------------------------------------------------
  function downloadTileOverlay (e) {
    console.log(e);
  }
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Add placemark on map
  //----------------------------------------------------------------------------
  function addPlacemark (e) {
    console.log(e);
  }
  //----------------------------------------------------------------------------
  //MAP: Get map center from last viewing
  //----------------------------------------------------------------------------
  $.ajax({
    url: "/map/center",
    dataType: "json",
    success: (response, code) => {
      map.setView([response.lat, response.lng], response.zoom);
    }
  });
  //----------------------------------------------------------------------------
  //MAP: Update center coords
  //----------------------------------------------------------------------------
  map.on("moveend", function (e) {
    let data = map.getCenter();
    data.zoom = map.getZoom();
    $.ajax({
      url: "/map/position",
      method: "post",
      dataType: "json",
      data: `lat=${data.lat}&lng=${data.lng}&zoom=${data.zoom}`
    });
  });
  //------------------------------------------------------------------------------
  //GPS: Init
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
        GPS.clearHistry();
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
    }id="exampleModalLabel"
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
  			maxZoom: 20,
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
  globalMarksList = {};

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
            weight: geometry[i]['width'],
            contextmenu: true,
            //contextmenuWidth: 140,
            contextmenuInheritItems: true,
            contextmenuItems: [
            '-',
            {
              text: 'Properties',
              callback: window.propertiesGeometry,
              iconCls: "mdi mdi-application-cog",
              disabled: true
            },
            {
              text: 'Edit',
              callback: editGeometry,
              iconCls: "mdi mdi-circle-edit-outline"
            },
            {
              text: 'Start download job',
              callback: showJobModal,
              iconCls: "mdi mdi-auto-download"
            },
            {
              text: 'Show tile cached map',
              callback: showTileCachedMap,
              iconCls: "mdi mdi-data-matrix-plus"
            },
            '-',
            {
              text: 'Delete',
              callback: deleteGeometry,
              iconCls: "mdi mdi-delete-outline"
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
      globalMarksList[geometry[i]['ID']] = workingGeometry;
    }

  });
  //------------------------------------------------------------------------------
  //Tiled cached map
  //------------------------------------------------------------------------------
  let CachedMap = L.cachedmap();
  CachedMap.addTo(map);
  window.showTileCachedMap = function(e) {
    let ID = e.relatedTarget.maptoriumID;
    alertify.prompt("Enter zoom offset for cached map", "5", function(e, t) {
      socket.emit("getTileCachedMap", {ID: ID, offset: map.getZoom() + parseInt(t)});
    }).set({title: "Zoom offset"});

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
    if(lastGeometry) {
      lastGeometry.disableEdit();
    }
    console.log(e.relatedTarget.maptoriumID);
    e.relatedTarget.enableEdit();
    $("#intrumentalPanel").show();
    lastGeometry = e.relatedTarget;
  }

  function coordProject(coords) {
    let projCoords = [];
    for(i = 0; i < coords.length; i++) {
      if(Array.isArray(coords[i])) {
        coordProject = []
        for(a = 0; a < coords[i].length; a++) {
          coordProject.push(map.project(coords[i][a]));
        }
        projCoords.push(coordProject);
      }
      else {
        projCoords.push(map.project(coords[i]));
      }
    }
    return projCoords;
}
  //----------------------------------------------------------------------------
  //INSTRUMENTAL PANEL: Save button click
  //----------------------------------------------------------------------------
  $("#panelSaveBtn").on("click", (e) => {
    lastGeometry.disableEdit();
    $("#intrumentalPanel").hide();
    if(lastGeometry) {
      //Init geometry OBJ
      let geometry = {
        markID: lastGeometry.maptoriumID,
        type: lastGeometry.shape,
        bounds: false,
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
      //$.ajax({
        //method: "post",
        //url: "/marks/update",
        //dataType: "json",
        //data: JSON.stringify(geometry),
        //success: (response, code) => {
          //if(response.result) {
            //alertify.success(response.message);
          //}
          //else {
            //alertify.error(response.message);
          //}
        //}
      //});
      socket.emit("updateGeometry", geometry);
    }
  });
  //------------------------------------------------------------------------------
  //Show confog window for job order
  //------------------------------------------------------------------------------
  window.showJobModal = function(e) {
    console.log(e);
    $("#polygonID").val(e.relatedTarget.maptoriumID);
    $("#jobModal").modal('show');
  }

});
