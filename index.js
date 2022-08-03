#!/usr/bin/env node
//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
global.config = require('./config.js');
//------------------------------------------------------------------------------
//Statistics
//------------------------------------------------------------------------------
let stat = require('./src/statistics.js');
//------------------------------------------------------------------------------
//MD5 to hashed tile names
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//Wait функция
//------------------------------------------------------------------------------
global.wait = ms => new Promise(resolve => setTimeout(resolve, ms));
//------------------------------------------------------------------------------
//Cached tile map
//------------------------------------------------------------------------------
//const CachedMap = require('./cachedmap');
//------------------------------------------------------------------------------
//Express with socket IO
//------------------------------------------------------------------------------
let path = require('path');
let url = require('url');
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);
global.IO = new Server(httpServer, { /* options */ });
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
let log = require("./src/log.js");
global.Log = new log();
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
let gps = require("./src/gps.js");
global.GPS = new gps();
//------------------------------------------------------------------------------
//Geometry handler
//------------------------------------------------------------------------------
let geometry = require("./src/geometry");
global.GEOMETRY = new geometry();
//------------------------------------------------------------------------------
//Some vars for service
//------------------------------------------------------------------------------
//Global list of tiles required by GET
let arrTilesList = [];
//Global list of tiles required by download jobs
let arrJobTilesList = [];
//Global list of threads state
let threadRunList = [];
//Global list of maps (now not yet used)
let arrMaps = {};
//Global tile list for cached map
let tileCachedList = {};
//------------------------------------------------------------------------------
//Static files for browser map
//------------------------------------------------------------------------------
app.use(express.static(process.mainModule.path + '/public'));

app.use('/marks', require('./routes/marks.js'));
app.use('/map', require('./routes/map.js'));
//------------------------------------------------------------------------------
//HTTP Server: GET request for tiles
//------------------------------------------------------------------------------
app.get(["/tile", "/layouts/tile", "/old/tile"], async function(request, response){
  //Получаем данные из запроса
  let parseReq = url.parse(request.url, true);
  //Получаем данный для загрузки тайлов
  let q = parseReq.query;
  //Переводим все значения в числовые
  q.z = parseInt(q.z);
  q.x = parseInt(q.x);
  q.y = parseInt(q.y);
  //Устанавливаем максимальное значение координат тайла
  let maxTileNumber = 1;
  //Изменяем максимальный номер тайла в соответсвии с уровнем увеличения
  for(let i = 1; i <= parseInt(q.z); i++) {
    maxTileNumber = maxTileNumber * 2;
  }
  maxTileNumber--;
  //Если координата тайла превышает максимально возможное значение
  if(q.x > maxTileNumber || q.y > maxTileNumber) {
    Log.make("error", "MAIN", "Tile request. Tile coords is out of max limit");
    //Пишем пустой тайл
    response.writeHead(200, { "Content-Length": 0 });
    response.end('');
  }
  else if(typeof q.map == "undefined") {
    Log.make("error", "MAIN", "Tile request. Map don't set");
    //Пишем пустой тайл
    response.writeHead(200, { "Content-Length": 0 });
    response.end('');
  }
  else {
    //Добавляем тайл в список загрузки
    arrTilesList.unshift({
      map: q.map,
      x: q.x,
      y: q.y,
      z: q.z,
      response: response
    });
    //Запускаем потоки загрузки
    threadsStarter();
  }
});
//------------------------------------------------------------------------------
//HTTP Server: Request to download job
//------------------------------------------------------------------------------
app.get("/job", async function(request, response){
  //Получаем данные из запроса
  let parseReq = url.parse(request.url, true);
  //Получаем данный для загрузки тайлов
  let jobConfig = parseReq.query;
  //Push job order to list
  jobConfig.running = false;
  arrJobList.push(jobConfig);
  IO.emit("setJobList", arrJobList);
});
//------------------------------------------------------------------------------
//Get request for cached tile map
//------------------------------------------------------------------------------
let tileCachedMap = {};
app.get(["/cachedMap"], async function(request, response){
  //Получаем данные из запроса
  let parseReq = url.parse(request.url, true);
  //Получаем данный для загрузки тайлов
  let q = parseReq.query;
  //Переводим все значения в числовые
  let z = parseInt(q.z);
  let x = parseInt(q.x);
  let y = parseInt(q.y);

  let tileName = md5('' + z + x + y);

  if(typeof tileCachedMap[tileName] !== "undefined") {
    response.writeHead(200, {'Content-Type': 'image/png', "Content-Length": Buffer.byteLength(tileCachedMap[tileName])});
    response.end(tileCachedMap[tileName]);
  }
  else {
    response.writeHead(200, {'Content-Type': 'image/png', "Content-Length": 0});
    response.end('');
  }
  //response.end(buffer);

});
//------------------------------------------------------------------------------
//Функция, которая запускает потоки загрузки тайлов
//------------------------------------------------------------------------------
async function threadsStarter() {
  //If we have tiles in list for GET or in list for Job
  if(arrTilesList.length > 0 || arrJobTilesList.length > 0) {
    //Reset thread counter
    let threadCounter = 0;
    //If we have tiles on job list
    if(arrJobTilesList.length > 0) {
      threadCounter = arrJobTilesList.length;
    }
    //If size of request tiles in job list les than request tiles in GET
    if(arrTilesList.length > threadCounter) {
      threadCounter = arrTilesList.length;
    }
    //If threads counter more then threads enabled
    if(threadCounter > config.service.threads) {
      //Set threads counter to max enabled threads
      threadCounter = config.service.threads;
    }
    //Start loop
    for(let i = 1; i <= threadCounter; i++) {
      //If thread never run
      if(typeof threadRunList[i] === "undefined") {
        //Start thread
        tilesService(i);
      }
      //If thread is stopped
      else if(threadRunList[i] == false) {
        //Start thread
        tilesService(i);
      }
    }
  }
}
//------------------------------------------------------------------------------
//Функция потока загрузки тайлов
//------------------------------------------------------------------------------
async function emitTileUpdate(map, x, y, zoom, state) {
  if(typeof tileCachedList.map !== "undefined" && typeof tileCachedList.zoom !== "undefined") {
    if(tileCachedList.map == map && tileCachedList.zoom == zoom) {
      if(typeof tileCachedList.tiles[x] !== "undefined") {
        if(typeof tileCachedList.tiles[x][y] !== "undefined") {
          tileCachedList.tiles[x][y] = state;
          IO.emit("updateTileCachedMap", {x: x, y: y, state: state});
        }
      }
    }
  }
  return;
}
async function tilesService(threadNumber) {
  //Устанавливаем что поток запущен
  threadRunList[threadNumber] = true;
  //Пока поток запущен
  while(threadRunList[threadNumber]) {
    //If any list of tiles isn`t empty
    if(arrTilesList.length > 0 || arrJobTilesList.length > 0) {
      //Reset tile info
      let jobTile = false;
      //Stat type
      let statType = "";
      //Reset map handler
      let map = '';
      //Reset tile result
      let tile = '';
      //Reset time counter
      let time = Date.now();
      //If we have tiles in GET list
      if(arrTilesList.length > 0) {
        //Take first tile and delete it
        jobTile = arrTilesList.shift();
        //Set stat type
        statType = "tiles";
      }
      //If GET list empty but job list isn`t
      else if(arrJobTilesList.length > 0) {
        //Take first tile and delete it
        jobTile = arrJobTilesList.shift();
        //Set stat type
        statType = "job";
      }
      //if get tile info before
      if(jobTile) {
        //Get response
        let response = jobTile.response;
        //Chech if we already init requred map handler
        if(typeof arrMaps[jobTile.map] !== "undefined") {
          //If have conected map handler just get it
          map = arrMaps[jobTile.map];
          //Handle tile download logick
          tile = await map.getTile(jobTile.z, jobTile.x, jobTile.y);
          //If tile handled
          if (tile && tile != 404) {
            //If tile was received by http request
            if(tile.method == "http") {
              await emitTileUpdate(jobTile.map, jobTile.x, jobTile.y, jobTile.z, "present");
              //Make stat
              stat.general.download++;
              stat.general.size += tile.s;
              if(statType == "job") {
                stat.job.download++;
                stat.job.size += tile.s;
              }
            }
            //If tile was receive by DB
            else if(tile.method == "db") {
              //Make stat
              stat.general.skip++;
              if(statType == "job") {
                stat.job.skip++;
              }
            }
            //If tile asked by Leaflet map
            if(response) {
              //Return tile to response
              response.writeHead(200, {'Content-Type': 'image/*', "Content-Length": tile.s});
              response.end(tile.b);
            }
          }
          //If tile didn`t handle or some error in tile downloading
          else {
            if(tile == 404) {
              await emitTileUpdate(jobTile.map, jobTile.x, jobTile.y, jobTile.z, "empty");
              //Make stat
              stat.general.empty++;
              if(statType == "job") {
                stat.job.empty++;
              }
            }
            else {
              //Make stat
              stat.general.error++;
              if(statType == "job") {
                stat.job.error++;
              }
            }
            //If tile asked by Leaflet map
            if(response) {
              //Return empty response
              response.writeHead(440, {'Content-Type': 'image/*', "Content-Length": 0});
              response.end('');
            }
          }
          if(statType == "job") {
            stat.job.time += Date.now() - time
          }
          //Make general stat
          stat.general.queue = arrTilesList.length + arrJobTilesList.length;
          stat.job.queue = arrJobTilesList.length;
          //Send stat to UI
          if(threadNumber == 1) {
            IO.emit("stat", stat);
          }
        }
        //If haven`t connect map handler
        else {
          Log.make("warning", "MAIN", `Can't find ${jobTile.map} map handler on server. Skip request.`);
          if(response) {
            //Return empty response
            response.writeHead(440, {'Content-Type': 'image/*', "Content-Length": 0});
            response.end('');
          }
        }
      }
    }
    //If any list of tiles is empty
    else {
      //Exit from thread
      threadRunList[threadNumber] = false;
    }
  }
}
//------------------------------------------------------------------------------
//Socket comunication with client
//------------------------------------------------------------------------------
IO.on('connection', async function(socket){
  Log.make("info", "MAIN", "User connected by socket.io");

  socket.on("stat", () => {
    socket.emit("stat", stat);
  });
  //--------------------------------------------------------------------------
  //Create maps list
  //--------------------------------------------------------------------------
  socket.on("getMapList", async () => {
    const fs = require('fs');
    //Reset map info array
    let arrMapInfo = [];
    //Get list of files
    let mapsList = fs.readdirSync(process.mainModule.path + "/maps");
    //Walk files list
    for(i = 0; i < mapsList.length; i++) {
      //Require module of map handler
      let map = require(process.mainModule.path + "/maps/" + mapsList[i]);
      //Init map handler
      map = new map();
      let mapInfo = await map.getInfo();
      //Save map handler for future use
      arrMaps[mapInfo.id] = map;
      //Push info of map into array
      arrMapInfo.push(mapInfo);
    }
    socket.emit("setMapList", arrMapInfo);
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
    if(await GEOMETRY.routeAddRoute(data)) {
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
    let points = await GEOMETRY.routeGetHistory();
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
    let list = await GEOMETRY.routeGetList();
    socket.emit("gps-set-list", list);
  });
  //----------------------------------------------------------------------------
  //GPS: Get route history
  //----------------------------------------------------------------------------
  socket.on("gps-history", async (routeID) => {
    if(routeID > 0) {
      let data = await GEOMETRY.routeGetHistory(routeID);
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
    Log.make("info", "MAIN", `Network mode changed to '${config.network.state}'`);
    socket.emit("mode-change", {type: 'info', message: `Network mode changed to '${config.network.state}'`});
  });
  //----------------------------------------------------------------------------
  //Add polygons/points (geometry) to DB
  //----------------------------------------------------------------------------
  socket.on("newGeometry", async (geometry) => {
    Log.make("info", "MAIN", "Request to save new geometry.");
    await GEOMETRY.save(geometry);
  });
  //----------------------------------------------------------------------------
  //Update polygons/points (geometry) in DB
  //----------------------------------------------------------------------------
  socket.on("updateGeometry", async (geometry) => {
    console.log(geometry);
    await GEOMETRY.update(geometry, true);
  });
  //----------------------------------------------------------------------------
  //Tile Cached Map
  //----------------------------------------------------------------------------
  socket.on("getTileCachedMap", async (mapInfo) => {
    let map = "googlesat";
    let mapObj = arrMaps[map];
    let requiredZoom = mapInfo.offset;
    let tempArr = await GEOMETRY.tileList(mapInfo.ID, requiredZoom, map);
    let time = Date.now();
    Log.make("info", "MAIN", "Start checking tiles in DB for cached map.");
    if(Array.isArray(tempArr)) {
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
  });
  //----------------------------------------------------------------------------
  //Request for server LOG
  //----------------------------------------------------------------------------
  socket.on("logHistory", () =>{
    //Send log history back
    socket.emit("logHistory", Log.get());
  });
  socket.on("getJobList", () => {
    socket.emit("setJobList", arrJobList);
  });
  socket.on("getGeometry", async () => {
    let geometry = await GEOMETRY.get();
    socket.emit("setGeometry", geometry);
  });
  socket.on('disconnect', function() {
    Log.make("info", "MAIN", "User disconnected by socket.io");
  });
});
//------------------------------------------------------------------------------
//Job List handler
//------------------------------------------------------------------------------
//Init jobs list
let arrJobList = [];
//Init curent job config
let currentJob = {};

//------------------------------------------------------------------------------
//Init
//------------------------------------------------------------------------------
(async() => {
  //----------------------------------------------------------------------------
  //Check proxy settings during start
  //----------------------------------------------------------------------------
  let httpEngine = require("./src/http-engine");
  await httpEngine.checkProxy(config);
  //----------------------------------------------------------------------------
  //Read maps list on server
  //----------------------------------------------------------------------------
  const fs = require('fs');
  //Reset map info array
  let arrMapInfo = [];
  //console.log(process);
  //Get list of files
  let mapsList = fs.readdirSync(process.mainModule.path + "/maps");
  //Walk files list
  for(i = 0; i < mapsList.length; i++) {
    //Require module of map handler
    let map = require(process.mainModule.path + "/maps/" + mapsList[i]);
    //Init map handler
    map = new map();
    let mapInfo = await map.getInfo();
    //Save map handler for future use
    arrMaps[mapInfo.id] = map;
    //Push info of map into array
    arrMapInfo.push(mapInfo);
  }
  //----------------------------------------------------------------------------
  //Open port for incoming requests
  //----------------------------------------------------------------------------
  await httpServer.listen(config.service.port);
  Log.make("success", "MAIN", "Start service on port " + config.service.port);
  //----------------------------------------------------------------------------
  //Service for starting jobs
  //----------------------------------------------------------------------------
  while(true) {
    //Whait second
    await wait(5000);
    //Create stat of server and send it to client
    let serverInfo = {
      memory: process.memoryUsage().heapTotal / 1024 / 1024,
      fsRead: process.resourceUsage().fsRead,
      fsWrite: process.resourceUsage().fsWrite,
      cpu: process.resourceUsage().userCPUTime,
      download: stat.general.size / 1024 / 1024,
      queue: stat.general.queue
    }
    serverInfo.memory.toFixed(2);
    IO.emit("server-stat", serverInfo);
    //If job tile list empty and job list isnt
    if(arrJobTilesList.length == 0 && arrJobList.length > 0) {
      //If first job in list already downloaded
      if(arrJobList[0].running) {
        //Delete job from list
        arrJobList.shift();
      }
      //If first job in list isnt started yet
      else {
        //Take first job
        currentJob = arrJobList[0];
        //Sate state of first job
        arrJobList[0].running = true;
        //Reset job statistics
        stat.job.download = 0;
        stat.job.error = 0;
        stat.job.empty = 0;
        stat.job.size = 0;
        stat.job.skip = 0;
        stat.job.time = 0;
        //Send job list to client
        IO.emit("setJobList", arrJobList);
        //Loop for all available zoom levels for download
        for(let i = 4; i <= 20; i++) {
          //If zoom level required for download
          if(currentJob['z' + i] === 'true') {
            //Create tile list for job
            let tempArr = await GEOMETRY.tileList(currentJob.polygonID, i, currentJob.mapID);
            //If create tile list for current zoom
            if(Array.isArray(tempArr)) {
              //Add tiles list to main Array
              arrJobTilesList = arrJobTilesList.concat(tempArr);
            }
          }
        }
        //If main tile list isn`t empty
        if(arrJobTilesList.length > 0) {
          //Make stat
          stat.job.total = arrJobTilesList.length;
          stat.job.queue = arrJobTilesList.length;
          Log.make("info", "MAIN", "Job started. Tile Count: " + arrJobTilesList.length);
          //Start threads
          threadsStarter();
        }
      }
    }
  }
})();
