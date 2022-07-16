//------------------------------------------------------------------------------
//Maptorium plugin
//------------------------------------------------------------------------------
(function () {
	var _old__setPos = L.Marker.prototype._setPos;
	L.Polyline.include({
    distance: function(units) {
      let distance = 0;
      let arrPoints = this.getLatLngs();
      //console.log(arrPoints);
      for(let i = 0; i < arrPoints.length; i++) {
        let point = L.latLng(arrPoints[i]["lat"], arrPoints[i]["lng"]);
        if(i > 0) {
          distance += point.distanceTo(L.latLng(arrPoints[i - 1]['lat'], arrPoints[i - 1]['lng']));
        }
      }
      switch(units) {
        case "m":
          distance = distance / 1852;
          break;
      }
      distance = (Math.round(distance * 100) / 100).toFixed(2);
      return distance;
    }
  });
}());
