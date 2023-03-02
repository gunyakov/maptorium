//------------------------------------------------------------------------------
//Socket comunication with client
//------------------------------------------------------------------------------
IO.on('connection', async function(socket){
  Log.info("MAIN", "User connected by socket.io");

  socket.on("stat", () => {
    socket.emit("stat", stat);
  });
  //----------------------------------------------------------------------------
  //Network state change request
  //----------------------------------------------------------------------------
  socket.on("config-network-state", (data) => {
    switch(data) {
      case "force":
      case "disable":
        config.network.state = data;
        break;
      default:
        config.network.state = "enable";
        break;
    }
  });
  //--------------------------------------------------------------------------
  //GPS: Change sample rate time
  //--------------------------------------------------------------------------
  socket.on("gps-sample", (data) => {
    data = parseInt(data);
    if(typeof data == "number") {
      if(GPS.sampleRate(data)) {
        socket.emit("gps-sample", {type: 'info', message: 'GPS: Sample rate changed.'});
      }
      else {
        socket.emit("gps-sample", {type: 'error', message: 'GPS: Sample rate changing error.'});
      }
    }
    else {
      socket.emit("gps-sample", {type: 'error', message: 'GPS: You must enter valid number.'});
    }
  });
  //----------------------------------------------------------------------------
  //GPS: Start new track
  //----------------------------------------------------------------------------
  socket.on("gps-new-route", async (data) => {
    if(await POI.routeAddRoute(data)) {
      socket.emit("gps-new-route", {type: 'info', message: "GPS: New route started."});
    }
    else {
      socket.emit("gps-new-route", {type: 'error', message: "GPS: New route starting error."});
    }
  });
  //----------------------------------------------------------------------------
  //GPS: Route history
  //----------------------------------------------------------------------------
  socket.on("gps-route-history", async () => {
    let points = await POI.routeGetHistory();
    socket.emit("gps-route-history", points);
  });
  //----------------------------------------------------------------------------
  //GPS: Toggle service state
  //----------------------------------------------------------------------------
  socket.on("gps-server-service", async() => {
    let state = await GPS.toggle();
    if(state) {
      socket.emit("gps-server-service", {type: "success",message: "GPS: Server service started."});
    }
    else {
      socket.emit("gps-server-service", {type: "info", message: "GPS: Server service stoped."});
    }
  });
  //----------------------------------------------------------------------------
  //GPS: Toggle record of gps route
  //----------------------------------------------------------------------------
  socket.on("gps-record", async() => {
    let state = await GPS.recordService();
    if(state) {
      socket.emit("gps-record", {type: "success",message: "GPS: Record started."});
    }
    else {
      socket.emit("gps-record", {type: "info", message: "GPS: Record stoped."});
    }
  });
  //----------------------------------------------------------------------------
  //GPS: Get routes list
  //----------------------------------------------------------------------------
  socket.on("gps-get-list", async() => {
    let list = await POI.routeGetList();
    socket.emit("gps-set-list", list);
  });
  //----------------------------------------------------------------------------
  //GPS: Get route history
  //----------------------------------------------------------------------------
  socket.on("gps-history", async (routeID) => {
    if(routeID > 0) {
      let data = await POI.routeGetHistory(routeID);
      socket.emit("gps-history", data);
    }
  });
  //----------------------------------------------------------------------------
  //Change server tiles download mode (common settings)
  //----------------------------------------------------------------------------
  socket.on("mode-change", (data) => {
    switch(data) {
      case "enable":
      case "force":
        config.network.state = data;
        break;
      default:
        config.network.state = "disable";
        break;
    }
    Log.info("MAIN", `Network mode changed to '${config.network.state}'`);
    socket.emit("mode-change", {type: 'info', message: `Network mode changed to '${config.network.state}'`});
  });
  //----------------------------------------------------------------------------
  //Tile Cached Map
  //----------------------------------------------------------------------------
  socket.on("getTileCachedMap", async (mapInfo) => {
    if(mapInfo.mapID) {
      let map = mapInfo.mapID;
      let mapObj = await Downloader.getMapByID(map);
      let requiredZoom = mapInfo.offset;
      let tempArr = await POI.tileList(mapInfo.ID, requiredZoom, map);
      let time = Date.now();
      Log.info("MAIN", "Start checking tiles in DB for cached map.");
      if(tempArr) {
        let tileCachedList = {map: map, zoom: requiredZoom, tiles: {}};
        for(i = 0; i < tempArr.length; i++) {
          let checkTile = await mapObj.checkTile(tempArr[i]['z'], tempArr[i]['x'], tempArr[i]['y']);
          let state = "missing";
          if(checkTile) {
            if(checkTile.s != 0) {
              state = "present";
            }
            else {
              state = "empty";
            }
          }
          if(typeof tileCachedList.tiles[tempArr[i]['x']] == "undefined") {
            tileCachedList.tiles[tempArr[i]['x']] = {};
          }
          tileCachedList.tiles[tempArr[i]['x']][tempArr[i]['y']] = state;
        }
        time = Math.round((Date.now() - time) / 1000);
        Log.info("MAIN", `Finished checking tiles in DB for cached map. Time spend ${time}.`);
        time = Date.now();
        //tileCachedMap = await CachedMap.generateMap(cachedMap);
        time = Math.round((Date.now() - time) / 1000);
        Log.info("MAIN", `Finished generating tiles for cached map. Time spend ${time}.`);
        await Downloader.setTileCachedMap(tileCachedList);
        socket.emit("setTileCachedMap", tileCachedList);
      }
      else {
        socket.emit("message", {result: false, message: "Error to get tile cached map info."});
      }
    }
    else {
      socket.emit("message", {result: false, message: "Incorect data to get cached map."});
    }
  });
  //----------------------------------------------------------------------------
  //Request for server LOG
  //----------------------------------------------------------------------------
  socket.on("logHistory", () => {
    //Send log history back
    socket.emit("logHistory", Log.get());
  });
  socket.on("getJobList", () => {
    socket.emit("setJobList", arrJobList);
  });
  socket.on("getGeometry", async () => {
    let poi = await POI.get();
    socket.emit("setGeometry", poi);
  });
  socket.on('disconnect', function() {
    Log.info("MAIN", "User disconnected by socket.io");
  });
});

module.exports = IO;
