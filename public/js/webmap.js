
let socket = io();
//------------------------------------------------------------------------------
//Set height of map container
//------------------------------------------------------------------------------
$("#map").height($(document).height() - $("#navbar").height());

let selectMode = false;
$(".dropdown-item").on("click", function(e) {
	console.log($(this).parents("ul").attr("aria-labelledby"));
	switch ($(this).parents("ul").attr("aria-labelledby")) {
		case "selectionDropdownMenuLink":
			selectMode = $(this).attr("data");
			break;
		case "viewDropdownMenuLink":
			break;
		case "layersDropdownMenuLink":
			console.log($(this).attr("href"));
			break;
		case "mapsDropdownMenuLink":
			console.log($(this).attr("href"));
			break;
		default:
		 alert("Function in progress.");
		 break;
	}
});

let map = L.map('map').setView([51.505, -0.09], 4);

var controlBar = L.control.bar('bar',{
	position: 'bottom',
	visible: true
});
map.addControl(controlBar);

var TileGrid = L.tilegrid({
	zoomOffset: -1,
	zoom: -1
});
TileGrid.onAdd(map);

function setTileGrid(zoom, zoomOffset) {
	TileGrid.setGrid(zoom, zoomOffset);
}
//--------------------------------------------------------------------------
let latlng = L.latLng(-90, 180);
//console.log(latlng);

let jobConfig = {
	x: 0,
	y: 0,
	requiredZoom: 0,
	zoom: 0
};
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
		jobConfig.x = x1 / 256;
		jobConfig.y = y1 / 256;
		jobConfig.zoom = map.getZoom();
		$("#jobModal").modal('show');
		var polygon = L.polygon(latlngs, {
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
		polygon.on('click', function() {
			alert( "poly");
		});

		polygon.on('contextmenu', function(e) {
			console.log(e);
		  var top = e.pageY - 10;
		  var left = e.pageX - 90;
		  $("#polygon-menu").css({
		    display: "block",
		    top: top,
		    left: left
		  }).addClass("show");
		  return false; //blocks default Webbrowser right click menu
		}).on("click", function() {
		  $("#polygon-menu").removeClass("show").hide();
		});

		$("#context-menu a").on("click", function() {
		  $(this).parent().removeClass("show").hide();
		});
	}
});
map.on("mousemove", function(e) {
	$("#mCoords").html("Lat: " + e.latlng.lat + " Lng: " + e.latlng.lng);
});
map.on("zoomend", function(e) {
	$("#mZ").html("Z" + map.getZoom());
});
//------------------------------------------------------------------------------
//Response maps list from server
//------------------------------------------------------------------------------
let arrMapsList = {};
let arrLayersList = {};
let currentMap = false;
let currentLayer = false;
socket.on("setMapList", (data) => {
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
			$("#mapsList").append(`<li><a class="dropdown-item" href="#${mapInfo.id}" onclick="changeMap('${mapInfo.id}')">${mapInfo.name}</a></li>`);
			arrMapsList[mapInfo.id] = tileLayer;
			if(!currentMap) {
				currentMap = tileLayer;
				currentMap.addTo(map);
			}
		}
		if(mapInfo.type == "layer") {
			$("#layersList").append(`<li><a class="dropdown-item" href="#" onclick="addLayer('${mapInfo.id}')">${mapInfo.name}</a></li>`);
			arrLayersList[mapInfo.id] = tileLayer;
			if(!currentLayer) {
				currentLayer = tileLayer;
				currentLayer.addTo(map);
			}
		}
	}
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
socket.on("stat", (data) => {
	$("#mQue").html("&nbsp;Queue: " + data.queue);
	$("#mDownload").html("&nbsp;Download " + data.tiles.download + " (" + formatFileSize(data.tiles.size, 2) + ")");
});

function formatFileSize(bytes,decimalPoint) {
   if(bytes == 0) return '0 Bytes';
   var k = 1000,
       dm = decimalPoint || 2,
       sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
       i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

$("#startJob").on("click", function(e) {
	$("#jobModal").modal('hide');
	jobConfig.requiredZoom = $("#jobZoomLevel option:selected").val();
	jobConfig.map = $("#jobMap option:selected").val();
	socket.emit("jobOrder", jobConfig);
});
