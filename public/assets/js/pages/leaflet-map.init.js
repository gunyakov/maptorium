//------------------------------------------------------------------------------
//Init values
//------------------------------------------------------------------------------

let arrMapsList = {};
let arrLayersList = {};
let currentMap = false;
let currentLayer = false;
let cachedMap = false;
//------------------------------------------------------------------------------
//Change main map
//------------------------------------------------------------------------------
function changeMap(mapID) {
  if(currentMap) {
    currentMap.remove();
  }
  currentMap = arrMapsList[mapID];
  if(currentMap) {
    currentMap.addTo(map);
    currentMap.bringToBack();
    currentMap.ID = mapID;
  }
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
  //console.log(arrLayersList[mapID]);
  arrLayersList[mapID].addTo(map);
  //currentMap.bringToBack();
  if(typeof arrLayersList[mapID].bringToFront === "function") {
    arrLayersList[mapID].bringToFront();
  };
}
//------------------------------------------------------------------------------
//Section to be executed after document ready
//------------------------------------------------------------------------------
$(document).ready(() => {
  //----------------------------------------------------------------------------
  //TILE CACHE MAP: Get data from server and show
  //----------------------------------------------------------------------------
  window.showTileCachedMap = function(e) {
    let ID = e.relatedTarget.maptoriumID;
    if(e.data) {
      socket.emit("getTileCachedMap", {ID: ID, offset: e.data, mapID: currentMap.options.mapID});
    }
    else {
      alertify.prompt("Enter zoom offset for cached map", "5", function(e, t) {
        socket.emit("getTileCachedMap", {ID: ID, offset: map.getZoom() + parseInt(t), mapID: currentMap.options.mapID});
      }).set({title: "Zoom offset"});
    }
  }
  //----------------------------------------------------------------------------
  //MARKS: Delete from DB
  //----------------------------------------------------------------------------
  window.deleteMark = function(e) {
    //Send to server ID of geometry
    $.ajax({
      url: "/poi/delete",
      data: `markID=${e.relatedTarget.maptoriumID}`,
      method: "post",
      success: (response, code) => {
        if(response.result) {
          //Remove geometry from map
          e.relatedTarget.remove();
          alertify.success(response.message);
        }
        else {
          alertify.error(response.message);
        }
      }
    });
  }
  //------------------------------------------------------------------------------
  //MARKS: Edit polygon
  //------------------------------------------------------------------------------
  window.editPolygon = function (e) {
    if(lastGeometry) {
      lastGeometry.disableEdit();
    }
    lastGeometry = e.relatedTarget;
    e.relatedTarget.enableEdit();
    $("#intrumentalPanel").show();
  }
  function bringToBack(e) {
    e.relatedTarget.bringToBack();
  }
  //----------------------------------------------------------------------------
  //Global polygon options
  //----------------------------------------------------------------------------
  globalPolygonOptions = {
    contextmenu: true,
    //contextmenuWidth: 140,
    contextmenuInheritItems: true,
    contextmenuItems: [
    '-',
    {
      text: 'Properties',
      callback: window.propertiesGeometry,
      iconCls: "mdi mdi-application-cog"
    },
    {
      text: 'Edit',
      callback: window.editPolygon,
      iconCls: "mdi mdi-circle-edit-outline"
    },
    {
      text: 'Bring to back',
      callback: bringToBack,
      iconCls: "mdi mdi-arrange-send-backward"
    },
    {
      text: 'Add to merge bar',
      callback: showPolygonMergeBar,
      iconCls: "mdi mdi-checkerboard-plus"
    },
    {
      text: 'Start download job',
      callback: window.showJobModal,
      iconCls: "mdi mdi-auto-download"
    },
    {
      text: 'Generate map',
      callback: window.showJobGenerateModal,
      iconCls: "mdi mdi-auto-download"
    },
    {
      text: 'Show tile cached map for main map',
      iconCls: "mdi mdi-data-matrix-plus",
      contextmenuItems: [{
        text: "Z6",
        callback: window.showTileCachedMap,
        data: 6
      },
      {
        text: "Z7",
        callback: window.showTileCachedMap,
        data: 7
      },
      {
        text: "Z8",
        callback: window.showTileCachedMap,
        data: 8
      },
      {
        text: "Z9",
        callback: window.showTileCachedMap,
        data: 9
      },
      {
        text: "Z10",
        callback: window.showTileCachedMap,
        data: 10
      },
      {
        text: "Z11",
        callback: window.showTileCachedMap,
        data: 11
      },
      {
        text: "Z12",
        callback: window.showTileCachedMap,
        data: 12
      },
      {
        text: "Z13",
        callback: window.showTileCachedMap,
        data: 13
      },
      {
        text: "Z14",
        callback: window.showTileCachedMap,
        data: 14
      },
      {
        text: "Z15",
        callback: window.showTileCachedMap,
        data: 15
      },
      {
        text: "Z16",
        callback: window.showTileCachedMap,
        data: 16
      },
      {
        text: "Z17",
      callback: window.showTileCachedMap,
        data: 17
      },
      {
        text: "Z18",
        callback: window.showTileCachedMap,
        data: 18
      }]
    },
    '-',
    {
      text: 'Delete',
      callback: window.deleteMark,
      iconCls: "mdi mdi-delete-outline"
    }]
  }

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
     worldCopyJump: true,
     maxBoundsViscosity: 1,
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
     },
     {
       text: 'Force download visible map tile to cache',
       callback: downloadTileMapForce,
       iconCls: "mdi mdi-download-multiple"
     },
     {
       text: 'Force download visible overlay tile to cache',
       callback: downloadTileOverlayForce,
       iconCls: "mdi mdi-download-multiple"
     }]
  }).setView([39, 0], 5);
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for map
  //----------------------------------------------------------------------------
  function downloadTileMap (e) {
    let coords = map.project(e.latlng, map.getZoom());
    let tileX = Math.floor(coords.x / 256);
    let tileY = Math.floor(coords.y / 256);
    currentMap._tiles[`${tileX}:${tileY}:${map.getZoom()}`].el.src += `&mode=force&rnd=${Math.random()}`;
  }
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for map
  //----------------------------------------------------------------------------
  function downloadTileMapForce (e) {
    currentMap.setUrl(`tile?map=${currentMap.options.mapID}&z={z}&x={x}&y={y}&mode=force&rnd=${Math.random()}`);
    currentMap.once("load", (e) => {
      currentMap.setUrl(`tile?map=${currentMap.options.mapID}&z={z}&x={x}&y={y}`);
    });
    currentMap.redraw();
  }
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for overlay
  //----------------------------------------------------------------------------
  function downloadTileOverlay (e) {
    let coords = map.project(e.latlng, map.getZoom());
    let tileX = Math.floor(coords.x / 256);
    let tileY = Math.floor(coords.y / 256);
    currentLayer._tiles[`${tileX}:${tileY}:${map.getZoom()}`].el.src += `&mode=force&rnd=${Math.random()}`;
  }
  //----------------------------------------------------------------------------
  //CONTEXT MENU: Download tile for overlay
  //----------------------------------------------------------------------------
  function downloadTileOverlayForce (e) {
    currentLayer.setUrl(`tile?map=${currentLayer.options.mapID}&z={z}&x={x}&y={y}&mode=force&rnd=${Math.random()}`);
    currentLayer.once("load", (e) => {
      currentLayer.setUrl(`tile?map=${currentLayer.options.mapID}&z={z}&x={x}&y={y}`);
    });
    currentLayer.redraw();
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
  function getMapState() {
    $.ajax({
      url: "/map/state",
      dataType: "json",
      success: (response, code) => {
        console.log(response);
        map.setView([response.lat, response.lng], response.zoom);
        changeMap(response.map);
        hideAllLayers();
        //addLayer(response.layer);
      }
    });
  }
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
      data: `lat=${data.lat}&lng=${data.lng}&zoom=${data.zoom}&map=${currentMap.ID}`
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
        TileGrid.select(function(geometry, polygonRef) {
          $.ajax({
            url: "/poi/add",
            dataType: "json",
            data: {data: JSON.stringify(geometry)},
            method: "post",
            success: (response, code) => {
              if(response.result) {
                polygonRef.maptoriumID = response.markID;
                polygonRef.shape = "Polygon";
                polygonRef.bindTooltip('Geometry ' + response.markID);
              }
              else {
                alertify.error(response.message);
              }
            }
          });
          //socket.emit("newGeometry", geometry);
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
  socket.on(["mode-change", "message"], (data) => {
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
    ...globalPolygonOptions,
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
  $.ajax({
    url: "/map/list",
    method: "get",
    dataType: "json",
    success: (response, code) => {
      $("#jobMap").html('');
      $("#jobMapGenerate").html('');
      arrMenuMap = [];
      arrMenuLayer = [];
      let data = response.list;
      let style = {
        rendererFactory: L.canvas.tile,
        attribution: "",
        subdomains: '0123',	// 01234 for openmaptiles, abcd for mapbox
        maxNativeZoom: 20,
        vectorTileLayerStyles: {
          water: [],
          landcover: [],
          landuse: [],
          mountain_peak: [],
          boundary: function(properties, zoom) {
            //console.log(properties);
            var level = properties.admin_level;
            let style = {
              color: "hsl(248, 7%, 66%)",
              fillOpacity: 0
            }
            if (level == 2) {
              if(zoom > 0) style.weight = 0.6;
              if(zoom > 4) style.weight = 1.4;
              if(zoom > 5) style.weight = 2;
              if(zoom > 12) style.weight = 8;
              if(properties.maritime) style.color = "hsl(205,42%,72%)";
            }
            if(level == 4) {
              if(zoom > 0) style.weight = 0;
              if(zoom > 4) style.weight = 0.4;
              if(zoom > 5) style.weight = 1;
              if(zoom > 12) style.weight = 8;
              style.dashArray = '3, 1, 1, 1';
            }
            return style;
          },
          transportation: function(properties, zoom) {

            let style = {width: 1.2};

            if(properties.class == 'motorway') {
              style.color = "hsl(28,72%,69%)";
              if(zoom > 0) style.width = 0;
              if(zoom > 12) style.width = 1;
              if(zoom > 13) style.width = 2;
              if(zoom > 14) style.width = 4;
              return style;
            };
            if(properties.class == 'trunk') {
              //console.log(properties);
              style.color = "hsl(46, 85%, 67%)";
              if(zoom > 0) style.width = 0;
              if(zoom > 12) style.width = 1;
              if(zoom > 13) style.width = 2;
              if(zoom > 14) style.width = 4;
              return style;
            }
            if(properties.class == "minor") {
              style.color = "hsl(0,0%,100%)";
              if(zoom > 0) style.width = 0;
              if(zoom > 12) style.width = 0.5;
              if(zoom > 13) style.width = 1;
              if(zoom > 14) style.width = 4;
              return style;
            }
            if (zoom < 12) return [];
            console.log(properties);
            return [];
          },
          water_name: [],
          transportation_name: [],
          place: function(properties, zoom, coords) {
            return [];
            //console.log(properties);
            if(properties.class == "town") {
              return {icon: new L.divIcon({html: `<div>${properties.name}</div>`})};
            }
          },
          waterway: [],
          aeroway: [],
          aerodrome_label: [],
          globallandcover: [],
          park: [],

        }
      }

    	for(let i = 0; i < data.length; i++) {
    		let mapInfo = data[i];
        let tileLayer = "";
        if(mapInfo.format == "vector") {
          //console.log(mapInfo);
          /*tileLayer = L.vectorGrid.protobuf(`tile?map=${mapInfo.id}&z={z}&x={x}&y={y}`, style)
    			.on('click', function(e) {	// The .on method attaches an event handler
    				L.popup()
    					.setContent(e.layer.properties.name || e.layer.properties.type)
    					.setLatLng(e.latlng)
    					.openOn(map);

    				L.DomEvent.stop(e);
    			});*/
          tileLayer = L.mapboxGL({
              accessToken: 'P2DGn4fI4cVJ928SF14v',
              style: 'bright.json',
              transformRequest: (url, resourceType) => {
                //console.log(resourceType);
                if(resourceType == "Tile") {
                  //console.log(url);
                  url = url.replace("https://api.maptiler.com/tiles/v3/", '');
                  url = url.split("/");
                  //console.log(url);
                  url[2] = url[2].split(".");
                  url[2] = url[2][0];
                  url = `http://${window.location.hostname}:${window.location.port}/tile?map=${mapInfo.id}&z=${url[0]}&x=${url[1]}&y=${url[2]}`;
                  //console.log(url);
                  return {
                    url: url,
                    credentials: 'include'  // Include cookies for cross-origin requests
                  };
                }
              }
          });
        }
        else {
          tileLayer = L.tileLayer(`tile?map=${mapInfo.id}&z={z}&x={x}&y={y}`, {
      			maxZoom: 20,
      			attribution: mapInfo.attribution,
      			tileSize: mapInfo.tileSize,
      			zoomOffset: 0,
            type: mapInfo.type,
            mapID: mapInfo.id,
      		});
        }
    		$("#jobMap").append(`<option value="${mapInfo.id}">${mapInfo.name}</option>`);
        $("#jobMapGenerate").append(`<option value="${mapInfo.id}">${mapInfo.name}</option>`)
    		if(mapInfo.type == "map") {
          if(typeof arrMenuMap[mapInfo.submenu] == "undefined") {
            arrMenuMap[mapInfo.submenu] = [];
          }
          arrMenuMap[mapInfo.submenu].push(mapInfo);
          arrMapsList[mapInfo.id] = tileLayer;
    			if(!currentMap) {
    				currentMap = tileLayer;
    				currentMap.addTo(map);
            currentMap.bringToBack();
            currentMap.ID = mapInfo.id;
    			}
    		}
    		if(mapInfo.type == "layer") {
          if(typeof arrMenuLayer[mapInfo.submenu] == "undefined") {
            arrMenuLayer[mapInfo.submenu] = [];
          }
          arrMenuLayer[mapInfo.submenu].push(mapInfo);
    			arrLayersList[mapInfo.id] = tileLayer;
    			if(!currentLayer && mapInfo.format == "vector") {
    				currentLayer = tileLayer;
    				currentLayer.addTo(map);
            currentLayer.bringToFront();
            if(currentMap) {
              currentMap.bringToBack();
            }
    			}
    		}
    	}

      $("#maps-list").html(generateHTMLMenu(arrMenuMap));
      $("#layers-list").html(generateHTMLMenu(arrMenuLayer, "layer"));
      getMapState();
      CachedMap.bringToFront();
    }
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
              callback: editPolygon//workingLayer.pm.enable()
            },
            '-',
            {
              text: 'Delete',
              callback: window.deleteMark//workingLayer.remove()
            }]
          }).addTo(map);
          break;
        case "Polygon":
          workingGeometry = L.polygon(latlngs, {
            color: geometry[i]['color'],
            fillColor: geometry[i]['fillColor'],
            fillOpacity: geometry[i]['fillOpacity'],
            weight: geometry[i]['width']
          }).addTo(map);
          workingGeometry.bindContextMenu(globalPolygonOptions);
          break;
        case "Marker":
          workingGeometry = L.marker(latlngs[0], {
            contextmenu: true,
            contextmenuWidth: 140,
            contextmenuInheritItems: false,
            contextmenuItems: [{
              text: 'Move',
              callback: editPolygon//workingLayer.pm.enable()
            },
            '-',
            {
              text: 'Delete',
              callback: window.deleteMark//workingLayer.remove()
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

  socket.on("setTileCachedMap", async (cachedMap) => {
    //cachedMap.setUrl(`cachedMap?z={z}&x={x}&y={y}&r=${Date.now()}`);
    CachedMap.setData(cachedMap);
    CachedMap.bringToFront();
  });
  socket.on("updateTileCachedMap", async (tileInfo) => {
    CachedMap.updateTile(tileInfo);
  });



  function coordProject (coords) {
    let projCoords = [];
    for(i = 0; i < coords.length; i++) {
      if(Array.isArray(coords[i])) {
        coordProjectArr = []
        for(a = 0; a < coords[i].length; a++) {
          coordProjectArr.push(map.project(coords[i][a]));
        }
        projCoords.push(coordProjectArr);
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
    $("#intrumentalPanel").hide();
    if(lastGeometry) {
      lastGeometry.disableEdit();
      lastGeometry.setLatLngs(lastGeometry.getLatLngs()).redraw();
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
          if(geometry.bounds._southWest.lng) {
            geometry.bounds._southWest = map.project(geometry.bounds._southWest);
            geometry.bounds._northEast = map.project(geometry.bounds._northEast);
          }
          break;
        case "Marker":
          geometry.coords = map.project(lastGeometry.getLatLng());
          break;
      }
      geometry.zoom = map.getZoom();

      //Send data to server
      $.jsonPost("/poi/update", geometry, (response, code) => {
        if(response.result) {
          alertify.success(response.message);
        }
        else {
          alertify.error(response.message);
        }
      });
    }
  });


});
