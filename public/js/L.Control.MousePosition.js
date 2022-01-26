L.Control.MousePosition = L.Control.extend({

	_pos: null,

	options: {
		position: 'bottomleft',
		separator: ' : ',
		emptyString: 'Unavailable',
		lngFirst: false,
		numDigits: 5,
		lngFormatter: undefined,
		latFormatter: undefined,
		formatter: undefined,
		prefix: "",
		wrapLng: true,
	},

	onAdd: function (map) {
		this._stateBar =  L.DomUtil.create('div', 'leaflet-control-status');
		this._container1 = L.DomUtil.create('div', 'leaflet-control-mouseposition');
		this._info = L.DomUtil.create('div', "bar-info");
		this._info.innerHTML = "Some info new";
		this._stateBar.appendChild(this._container1);
		this._stateBar.appendChild(this._info);
		L.DomEvent.disableClickPropagation(this._stateBar);
		map.on('mousemove', this._onMouseMove, this);
		//this._container.innerHTML = this.options.emptyString;
		return this._stateBar;
		//return stateBar;
	},

	onRemove: function (map) {
		map.off('mousemove', this._onMouseMove)
	},

	getLatLng: function() {
		return this._pos;
	},

	_onMouseMove: function (e) {
		this._pos = e.latlng.wrap();
		var lngValue = this.options.wrapLng ? e.latlng.wrap().lng : e.latlng.lng;
		var latValue = e.latlng.lat;
		var lng;
		var lat;
		var value;
		var prefixAndValue;

		if (this.options.formatter) {
			prefixAndValue = this.options.formatter(lngValue, latValue);
		} else {
			lng = this.options.lngFormatter ? this.options.lngFormatter(lngValue) : L.Util.formatNum(lngValue, this.options.numDigits);
			lat = this.options.latFormatter ? this.options.latFormatter(latValue) : L.Util.formatNum(latValue, this.options.numDigits);
			value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
			prefixAndValue = this.options.prefix + ' ' + value;
		}

		this._container1.innerHTML = "<b>" + prefixAndValue + "</b>";
	}

});

L.Map.mergeOptions({
	positionControl: false
});

L.Map.addInitHook(function () {
	if (this.options.positionControl) {
		this.positionControl = new L.Control.MousePosition();
		this.addControl(this.positionControl);
	}
});

L.control.mousePosition = function (options) {
	return new L.Control.MousePosition(options);
};
