#!/usr/bin/env node
//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Statistics
//------------------------------------------------------------------------------
let stat = require('./statistics');
//------------------------------------------------------------------------------
//MD5 to hashed tile names
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//Wait функция
//------------------------------------------------------------------------------
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
//------------------------------------------------------------------------------
//Cached tile map
//------------------------------------------------------------------------------
const CachedMap = require('./cachedmap');
//------------------------------------------------------------------------------
//Express with socket io
//------------------------------------------------------------------------------
let path = require('path');
let url = require('url');
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
let log = require('./log.js');
const Log = new log();
//------------------------------------------------------------------------------
//Geometry handler
//------------------------------------------------------------------------------
let geometry = require("./geometry");
const Geometry = new geometry();
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
app.use(express.static(path.join(__dirname, 'public')));
//------------------------------------------------------------------------------
//GET request for tiles
//------------------------------------------------------------------------------
app.get(["/tile", "/cesium/tile"], async function(request, response){
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
async function tilesService(threadNumber) {
  Log.make("info", "MAIN", "Thread " + threadNumber + " was started.");
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
              let tileName = md5('' + jobTile.x + jobTile.y + jobTile.z + jobTile.map);
              if(typeof tileCachedList[tileName] !== "undefined") {
                io.emit("updateTileCachedMap", {name: tileName, state: "present"});
              }
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
              let tileName = md5('' + jobTile.x + jobTile.y + jobTile.z + jobTile.map);
              if(typeof tileCachedList[tileName] !== "undefined") {
                io.emit("updateTileCachedMap", {name: tileName, state: "empty"});
              }
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
            io.emit("stat", stat);
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
  //Show exit thread message
  Log.make("info", "MAIN", "Thread " + threadNumber + " was stoped.");
}
//------------------------------------------------------------------------------
//Socket comunication with client
//------------------------------------------------------------------------------
io.on('connection', function(socket){
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
    let mapsList = fs.readdirSync("./maps");
    //Walk files list
    for(i = 0; i < mapsList.length; i++) {
      //Require module of map handler
      let map = require("./maps/" + mapsList[i]);
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
  //New job order request
  //----------------------------------------------------------------------------
  socket.on("jobAdd", (jobConfig) => {
    //Push job order to list
    jobConfig.running = false;
    arrJobList.push(jobConfig);
    io.emit("setJobList", arrJobList);
  });
  //----------------------------------------------------------------------------
  //Network state change request
  //----------------------------------------------------------------------------
  socket.on("setNetworkState", (data) => {
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
  //----------------------------------------------------------------------------
  //Add polygons/points (geometry) to DB
  //----------------------------------------------------------------------------
  socket.on("newGeometry", async (geometry) => {
    await Geometry.save(geometry);
  });
  //----------------------------------------------------------------------------
  //Delete polygons/points (geometry) from map
  //----------------------------------------------------------------------------
  socket.on("deleteGeometry", async (ID) => {
    await Geometry.delete(ID);
  });
  //----------------------------------------------------------------------------
  //Update polygons/points (geometry) in DB
  //----------------------------------------------------------------------------
  socket.on("updateGeometry", async (geometry) => {
    await Geometry.update(geometry);
  });
  //----------------------------------------------------------------------------
  //Tile Cached Map
  //----------------------------------------------------------------------------
  socket.on("getTileCachedMap", async (mapInfo) => {
    let map = "googlesat";
    let mapObj = arrMaps[map];
    let requiredZoom = 12;
    let tempArr = await Geometry.tileList(mapInfo.ID, requiredZoom, map);
    let time = Date.now();
    Log.make("info", "MAIN", "Start checking tiles in DB for cached map.");
    if(Array.isArray(tempArr)) {
      tileCachedList = {};
      for(i = 0; i < tempArr.length; i++) {
        let checkTile = await mapObj.checkTile(tempArr[i]['z'], tempArr[i]['x'], tempArr[i]['y']);
        let tileInfo = {
          x: tempArr[i]['x'],
          y: tempArr[i]['y'],
          state: "missing"
        }
        let tileName = md5('' + tempArr[i]['x'] + tempArr[i]['y'] + requiredZoom + map);
        if(checkTile) {
          if(checkTile.s != 0) {
            tileInfo.state = "present";
          }
          else {
            tileInfo.state = "empty";
          }
        }
        tileCachedList[tileName] = tileInfo;
      }
      let cachedMap = {
        zoom: requiredZoom,
        tiles: tileCachedList
      }
      time = Math.round((Date.now() - time) / 1000);
      Log.make("info", "MAIN", `Finished checking tiles in DB for cached map. Time spend ${time}.`);
      time = Date.now();
      tileCachedMap = await CachedMap.generateMap(cachedMap);
      time = Math.round((Date.now() - time) / 1000);
      Log.make("info", "MAIN", `Finished generating tiles for cached map. Time spend ${time}.`);
      //socket.emit("setTileCachedMap", cachedMap);
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
    let geometry = await Geometry.get();
    io.emit("setGeometry", geometry);
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
  let httpEngine = require("./http-engine");
  await httpEngine.checkProxy();

  const fs = require('fs');
  //Reset map info array
  let arrMapInfo = [];
  //Get list of files
  let mapsList = fs.readdirSync("./maps");
  //Walk files list
  for(i = 0; i < mapsList.length; i++) {
    //Require module of map handler
    let map = require("./maps/" + mapsList[i]);
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

  let geometry = await Geometry.get();
  io.emit("setGeometry", geometry);
  //----------------------------------------------------------------------------
  //Service for starting jobs
  //----------------------------------------------------------------------------
  while(true) {
    //Whait second
    await wait(1000);
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
        io.emit("setJobList", arrJobList);
        //Create tile list for job and start threads
        let tempArr = await Geometry.tileList(currentJob.polygonID, currentJob.zoom, currentJob.map);
        if(Array.isArray(tempArr)) {
          arrJobTilesList = tempArr;
          //Make stat
          stat.job.total = arrJobTilesList.length;
          stat.job.queue = arrJobTilesList.length;
          Log.make("info", "MAIN", "Job started. Tile Count: " + arrJobTilesList.length);
          threadsStarter();
        }
      }
    }
  }
})();
