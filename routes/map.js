const express = require('express');
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const jsonfile = require('jsonfile');
const path = 'config.map.js';
//------------------------------------------------------------------------------
//CONFIG: Get map center
//------------------------------------------------------------------------------
router.get('/center', async (req, res) => {
  jsonfile.readFile(path, (err, data) => {
    if (err) {
      res.json({lat: 39, lng: 0, zoom: 5});
    }
    else {
      res.json({lat: data.lat, lng: data.lng, zoom: data.zoom});
    }
  });
});

router.post('/position', async (req, res) => {
  if(typeof req.body.lat == "undefined" || typeof req.body.lng == "undefined" || typeof req.body.zoom == "undefined") {
    res.json({result: false, message: "Error update map center. Data is empty"});
  }
  else {
    jsonfile.writeFile(path, req.body, function (err) {
      if (err) {
        res.json({result: false, message: "Error update map center."});
      }
      else {
        res.json({result: true, message: "Map center updated."});
      }
    });
  }
});

router.post("/cached", async(req, res) => {
  let data = JSON.parse(req.body.data);
  console.log(data);
  let map = data.mapID;
  let mapObj = arrMaps[map];
  let requiredZoom = mapInfo.offset;
  let tempArr = await GEOMETRY.tileList(mapInfo.ID, requiredZoom, map);
  let time = Date.now();
  Log.make("info", "MAIN", "Start checking tiles in DB for cached map.");
  if(tempArr) {
    tileCachedList = {map: map, zoom: requiredZoom, tiles: {}};
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
    Log.make("info", "MAIN", `Finished checking tiles in DB for cached map. Time spend ${time}.`);
    time = Date.now();
    //tileCachedMap = await CachedMap.generateMap(cachedMap);
    time = Math.round((Date.now() - time) / 1000);
    Log.make("info", "MAIN", `Finished generating tiles for cached map. Time spend ${time}.`);
    socket.emit("setTileCachedMap", tileCachedList);
  }
  else {
    socket.emit("message", {result: false, message: "Error to get tile cached map info."});
  }
});


module.exports = router;
