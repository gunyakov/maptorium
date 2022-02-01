$(document).ready(() => {
  //$("#map").css("top", $(".topnav").height());
  $("#map").height($(window).height() - $(".topnav").height());

});

let socket = io();

let map = L.map('map').setView([47.97, 29.67], 13);

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

		}).on("click", function() {

		});
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
              <h5 class="font-size-14 mb-1">X${arrJobList[i].x} Y${arrJobList[i].y} Z${arrJobList[i].zoom}</h5>
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

$("#startJob").on("click", function(e) {
	$("#jobModal").modal('hide');
	jobConfig.requiredZoom = $("#jobZoomLevel option:selected").val();
	jobConfig.map = $("#jobMap option:selected").val();
	socket.emit("jobOrder", jobConfig);
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
