//------------------------------------------------------------------------------
//Resize map after loading
//------------------------------------------------------------------------------
$(document).ready(() => {
  //$("#map").css("top", $(".topnav").height());
  $("#map").height($(document).height() - $(".topnav").height());
});
$( window ).resize(() => {
  //$("#map").css("top", $(".topnav").height());
  $("#map").height($(document).height() - $(".topnav").height());
});
//------------------------------------------------------------------------------
//Socket IO
//------------------------------------------------------------------------------
let socket = io();
//------------------------------------------------------------------------------
//Init Map
//------------------------------------------------------------------------------
//let map = L.map('map').setView([20, 80], 7);
let map = L.map('map').setView([20, 80], 7);
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
//Marker
//------------------------------------------------------------------------------
var ship16 = L.icon({
	iconUrl : 'assets/images/Container-Ship-Top-Red-icon16.png',
	iconRetinaUrl : 'my-icon@2x.png',
	iconSize : [16, 16],
	iconAnchor : [8, 8],
});
var ship24 = L.icon({
	iconUrl : 'assets/images/Container-Ship-Top-Red-icon24.png',
	iconRetinaUrl : 'my-icon@2x.png',
	iconSize : [24, 24],
	iconAnchor : [12, 12],
});

var ship32 = L.icon({
	iconUrl : 'assets/images/Container-Ship-Top-Red-icon32.png',
	iconRetinaUrl : 'my-icon@2x.png',
	iconSize : [32, 32],
	iconAnchor : [18, 18],
});

var ship48 = L.icon({
	iconUrl : 'assets/images/Container-Ship-Top-Red-icon48.png',
	iconRetinaUrl : 'my-icon@2x.png',
	iconSize : [48, 48],
	iconAnchor : [24, 24],
});

var marker = new L.marker([50.5, 30.5], {
	icon : ship16,
	iconAngle : 90
});
map.addLayer(marker);

//------------------------------------------------------------------------------
//Work with GPS data update
//------------------------------------------------------------------------------
var points = new Array();
var polyLinePoints = new Array();
var polyline;

socket.on("routeHistory", (data) => {
  console.log("routeHistory", data);
  for(i = 0; i < data.length; i++) {
    var latlng = L.latLng(data[i]["lat"], data[i]["lon"]);
    polyLinePoints.unshift(latlng);
  }
  polyline = new L.polyline(polyLinePoints, {
    weight : 1,
    color : '#932402'
  });
  map.addLayer(polyline);
});

socket.on("gpsData", (data) => {
  console.log(data);
  var latlng = L.latLng(data["lat_decimal"], data["lon_decimal"]);

  $("#speed").text("Ship`s speed: " + data['sog'] + " kn.");

  marker.setLatLng(latlng);
  marker.setIconAngle(data['dir'] + 90);

  polyLinePoints.unshift(latlng);

  if(polyLinePoints.length > 2) {
    polyline.addLatLng(latlng);
  }
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
//------------------------------------------------------------------------------
//Update icon size in accordance with map zoom level
//------------------------------------------------------------------------------
map.on('zoomend', function() {
  if (map.getZoom() <= 4) {
    marker.setIcon(ship16);
    //polyline.setStyle({
     // weight : 1,
      //color : '#932402'
    //});
  }
  if (map.getZoom() > 4 && map.getZoom() <= 7) {
    marker.setIcon(ship24);
    //polyline.setStyle({
    //  weight : 2,
    //  color : '#932402'
    //});
  }
  if (map.getZoom() > 7 && map.getZoom() <= 10) {
    marker.setIcon(ship32);
    //polyline.setStyle({
    //  weight : 3,
    //  color : '#932402'
    //});
  }
  if (map.getZoom() > 10) {
    marker.setIcon(ship48);
    //polyline.setStyle({
    //  weight : 4,
    //  color : '#932402'
    //});
  }
});

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

function projectCoords(coords) {
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
var controlBar = L.control.bar('bar',{
	position: 'bottom',
	visible: true
});
map.addControl(controlBar);

let selectMode = false;

var TileGrid = L.tilegrid({
  zoomOffset: -1,
  zoom: -1
});
TileGrid.onAdd(map);

function setTileGrid(zoom, zoomOffset) {
  TileGrid.setGrid(zoom, zoomOffset);
}

map.on('click', function(e) {
	if(selectMode == "tile") {
		let points = map.project(e.latlng, map.getZoom());
		let x1 = Math.floor(points.x / 256) * 256;
		let y1 = Math.floor(points.y / 256) * 256;
		let latlngs = [];
		point = L.point(x1, y1);
		point = map.unproject(point, map.getZoom());
		latlngs.push([point.lat, point.lng]);
		point = L.point(x1 + 256, y1);
		point = map.unproject(point, map.getZoom());
		latlngs.push([point.lat, point.lng]);
		point = L.point(x1 + 256, y1 + 256);
		point = map.unproject(point, map.getZoom());
		latlngs.push([point.lat, point.lng]);
		point = L.point(x1, y1 + 256);
		point = map.unproject(point, map.getZoom());
		latlngs.push([point.lat, point.lng]);
		//$("#jobModal").modal('show');
		let polygon = L.polygon(latlngs, {
			color: 'red',
			//contextmenu: true,
			//contextmenuInheritItems: false,
  		//contextmenuItems: [{
      	//text: 'Marker item',
      	//index: 0
  		//}, {
      	//separator: true,
      	//index: 1
  		//}],
		}).addTo(map);
		selectMode = false;
    //console.log(polygon);
    let geometry = {
      type: "Polygon",
      bounds: false,
      color: color,
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      coords: projectCoords(polygon.getLatLngs()),
      bounds: polygon.getBounds(),
      zoom: map.getZoom()
    }
    geometry.bounds._southWest = map.project(geometry.bounds._southWest);
    geometry.bounds._northEast = map.project(geometry.bounds._northEast);
    socket.emit("newGeometry", geometry);
	}
});

map.on("mousemove", function(e) {
	$("#mCoords").html("Lat: " + e.latlng.lat + " Lng: " + e.latlng.lng);
});
map.on("zoomend", function(e) {
	$("#mZ").html("Z" + map.getZoom());
});
$(".dropdown-item").on("click", function(e) {
  switch($(this).attr("data-key")) {
    case "t-layers-hide-all":
      hideAllLayers();
      break;
    case "t-select-tile":
      selectMode = "tile";
      break;
    default:
      alert("Function in progress");
      break;
  }
});
//------------------------------------------------------------------------------
//Response maps list from server
//------------------------------------------------------------------------------
let arrMapsList = {};
let arrLayersList = {};
let currentMap = false;
let currentLayer = false;
let cachedMap = false;
socket.on("setMapList", (data) => {
  mapsHtml = "";
  mapsCount = 0;
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
      mapsCount++;
      if(mapsCount == 1) {
        mapsHtml += `<div class="row g-0">`;
      }
      mapsHtml += `<div class="col">
                    <a class="dropdown-icon-item" href="#" onclick="changeMap('${mapInfo.id}')">
                      <img src="assets/images/brands/${mapInfo.id}.png" alt="Github">
                      <span>${mapInfo.name}</span>
                    </a>
                   </div>`;
      if(mapsCount == 3) {
        mapsHtml += `</div>`;
        mapsCount = 0;
      }
      arrMapsList[mapInfo.id] = tileLayer;
			if(!currentMap) {
				currentMap = tileLayer;
				currentMap.addTo(map);
			}
		}
		if(mapInfo.type == "layer") {
			$("#layers-list").append(`<li><a class="dropdown-item" href="#" onclick="addLayer('${mapInfo.id}')">${mapInfo.name}</a></li>`);
			arrLayersList[mapInfo.id] = tileLayer;
			if(!currentLayer) {
				currentLayer = tileLayer;
				currentLayer.addTo(map);
			}
		}
	}
  $("#maps-list").html(mapsHtml);
  CachedMap.bringToFront();
});

function changeMap(mapID) {
	currentMap.remove();
	currentMap = arrMapsList[mapID];
	currentMap.addTo(map);
	currentMap.bringToBack();
}
function hideAllLayers() {
	for (const layer in arrLayersList) {
		arrLayersList[layer].remove();
	}
}
function addLayer(mapID) {
	arrLayersList[mapID].addTo(map);
	arrLayersList[mapID].bringToFront();
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
  console.log(geometry);
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
//map.addLayer(CachedMap);
function showTileCachedMap(e) {
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
function editGeometry(e) {
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
function deleteGeometry(e) {
  //Send to server ID of geometry
  socket.emit("deleteGeometry", e.relatedTarget.maptoriumID);
  //Remove geometry from map
  e.relatedTarget.remove();
}
//------------------------------------------------------------------------------
//Show confog window for job order
//------------------------------------------------------------------------------
function showJobModal(e) {
  $("#polygonID").val(e.relatedTarget.maptoriumID);
  $("#jobModal").modal('show');
}
//------------------------------------------------------------------------------
//Request for jobs list on server
//------------------------------------------------------------------------------
socket.emit("getJobList");
socket.on("setJobList", (arrJobList) => {
  let jobHTML = "";
  for(i = 0; i < arrJobList.length; i++) {
    let color = `bg-soft-primary text-primary`;
    if(i == 0) {
      color = `bg-soft-success text-success`;
    }
    jobHTML += `<li class="activity-list">
      <div class="activity-icon avatar-md">
          <span class="avatar-title ${color} rounded-circle">
          ${(i+1)}
          </span>
      </div>
      <div class="d-flex">
          <div class="flex-grow-1 overflow-hidden me-7">
              <h5 class="font-size-14 mb-1">Polygon ID ${arrJobList[i]['polygonID']} Z${arrJobList[i]['zoom']}</h5>
              <p class="text-truncate text-muted font-size-13">${arrJobList[i].map}</p>
          </div>

          <div class="flex-shrink-0 text-end">
              <div class="dropdown">
                  <a class="text-muted dropdown-toggle font-size-24" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
                      <i class="mdi mdi-dots-vertical"></i>
                  </a>

                  <div class="dropdown-menu dropdown-menu-end">
                      <a class="dropdown-item" href="#">Move UP</a>
                      <a class="dropdown-item" href="#">Move DOWN</a>
                      <div class="dropdown-divider"></div>
                      <a class="dropdown-item" href="#">DELETE</a>
                  </div>
              </div>
          </div>
      </div>
    </li>`;
  }
  $("#jobsList").html(jobHTML);
});
//------------------------------------------------------------------------------
//Additional functions
//------------------------------------------------------------------------------
function formatFileSize(bytes,decimalPoint) {
   if(bytes == 0) return '0 Bytes';
   var k = 1000,
       dm = decimalPoint || 2,
       sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
       i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " h, " : " hs, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " m, " : " ms, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " s" : " ss") : "";
    return hDisplay + mDisplay + sDisplay;
}
//------------------------------------------------------------------------------
//Send to server new job ORDER
//------------------------------------------------------------------------------
$("#startJob").on("click", function(e) {
	$("#jobModal").modal('hide');
  let jobConfig = {};
  jobConfig.polygonID = $("#polygonID").val();
	jobConfig.zoom = $("#jobZoomLevel option:selected").val();
	jobConfig.map = $("#jobMap option:selected").val();
	socket.emit("jobAdd", jobConfig);
});

function getChartColorsArray(r) {
    r = $(r).attr("data-colors");
    return (r = JSON.parse(r)).map(function (r) {
        r = r.replace(" ", "");
        if (-1 == r.indexOf("--")) return r;
        r = getComputedStyle(document.documentElement).getPropertyValue(r);
        return r || void 0;
    });
}

var radialchartColors = getChartColorsArray("#chart");

options = {
    chart: {
      height: 270,
      type: "radialBar",
      offsetY: -10
    },
    plotOptions: {
        radialBar: {
            startAngle: -130,
            endAngle: 130,
            dataLabels: {
                name: { show: 1 },
                value: {
                    offsetY: 10,
                    fontSize: "18px",
                    color: void 0,
                    formatter: function (r) {
                        return r + "%";
                    },
                },
            },
        },
    },
    colors: [radialchartColors[0]],
    fill: { type: "gradient", gradient: { shade: "dark", type: "horizontal", gradientToColors: [radialchartColors[1]], shadeIntensity: 0.15, inverseColors: !1, opacityFrom: 1, opacityTo: 1, stops: [20, 60] } },
    stroke: { dashArray: 4 },
    legend: { show: !1 },
    series: [50],
    labels: ["10 GB"],
    title: {
      text: "Current download job",
      style: {
        fontSize:  '14px',
        fontWeight:  'bold',
        fontFamily:  undefined,
        color:  '#000000'
      },
    }
};
let chart = new ApexCharts(document.querySelector("#chart"), options)
chart.render();
socket.on("stat", (stat) => {
  //console.log(stat);
	$("#mQue").html("&nbsp;Queue: " + stat.general.queue);
	$("#mDownload").html("&nbsp;Download " + stat.general.download + " (" + formatFileSize(stat.general.size, 2) + ")");
  let proceedTiles = stat.job.download + stat.job.skip + stat.job.error + stat.job.empty;
  let progress = Math.floor(proceedTiles / stat.job.total * 10000) / 100;
  chart.updateOptions({
    series: [progress],
    labels: [formatFileSize(stat.job.size, 2)]
  });

  $("#statJobDownloadTiles").html(proceedTiles + " from " + stat.job.total);
  $("#statJobErrorTiles").html("Error: " + stat.job.error);
  $("#statJobEmptyTiles").html("Empty: " + stat.job.empty);
  $("#statJobSkipTiles").html("Skip: " + stat.job.skip);
  let ETA = stat.job.time / proceedTiles * stat.job.queue;
  //console.log(stat.job);
  //console.log(ETA);
  ETA = secondsToHms(ETA / 1000);
  $("#ETA").html(`ETA ${ETA}`);
});
