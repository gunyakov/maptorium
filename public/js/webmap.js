$(document).ready(function(){
	$("#map").height($(window).height() - $("#navbar").height());
});

$( window ).resize(function() {
	$("#map").height($(window).height() - $("#navbar").height());
});
let socket = io();
//$( window ).resize(function() {
	//$("#map").height($(document).height() - $("#navbar").height());
	//$("#map").width($(document).width() - 100);
//});
//$("#navbar").width($(document).width());
$("#map").height($(document).height() - $("#navbar").height());

let selectMode = false;

$(".dropdown-item").on("click", function(e) {
	console.log($(this).parents("ul").attr("aria-labelledby"));
	switch ($(this).parents("ul").attr("aria-labelledby")) {
		case "selectionDropdownMenuLink":
			selectMode = $(this).attr("data");
			break;
		default:
		 alert("Function in progress.");
		 break;
	}
});

let map = L.map('map').setView([51.505, -0.09], 4);
L.tileLayer('tile?map=google&z={z}&x={x}&y={y}', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
		'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	tileSize: 256,
	zoomOffset: 0
}).addTo(map);
L.tileLayer('tile?map=googleHyb&z={z}&x={x}&y={y}', {
	maxZoom: 18,
	attribution: '',
	tileSize: 256,
	zoomOffset: 0
}).addTo(map);

L.control.mousePosition().addTo(map);

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

$("#viewGrid").on("click", function(e) {
	e.preventDefault();
	gridNew.decreaseGridSize();
});
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

$("#startJob").on("click", function(e) {
	$("#jobModal").modal('hide');
	jobConfig.requiredZoom = $("#jobZoomLevel option:selected").val();
	socket.emit("jobOrder", jobConfig);
});
