$( document ).ready(function() {

	let socket = io();

	let map = L.map('map').setView([51.505, -0.09], 4);
	L.tileLayer('http://127.0.0.1:9000/tile?z={z}&x={x}&y={y}', {
		attribution: 'By 2 Eng Oleg Gunyakov',
		maxZoom: 18,
		tileSize: 256,
	}).addTo(map);

	let gridNew = L.grid().addTo(map);
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
		console.log(e);
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
		var polygon = L.polygon(latlngs, {color: 'red'}).addTo(map);
	});

	$("#startJob").on("click", function(e) {
		$("#jobModal").modal('hide');
		jobConfig.requiredZoom = $("#jobZoomLevel option:selected").val();
		socket.emit("jobOrder", jobConfig);
	});
});
