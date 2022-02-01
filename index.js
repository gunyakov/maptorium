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
//Wait функция
//------------------------------------------------------------------------------
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
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
//----------------------------------------------------------------------------------------------------------------------
//Static files for browser map
//----------------------------------------------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
//----------------------------------------------------------------------------------------------------------------------
//GET request for tiles
//----------------------------------------------------------------------------------------------------------------------
app.get(["/tile", "/cesium/tile"], async function(request, response){
  //Получаем данные из запроса
  let parseReq = url.parse(request.url, true);
  //Получаем данный для загрузки тайлов
  let q = parseReq.query;
  //Переводим все значения в числовые
  q.z = parseInt(q.z);
  q.x = parseInt(q.x);
  q.x = parseInt(q.x);
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
          io.emit("stat", stat);
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
  socket.on("jobOrder", (jobConfig) => {
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
  socket.on("logHistory", () =>{
    socket.emit("logHistory", Log.get());
  });
  socket.on("getJobList", () => {
    socket.emit("setJobList", arrJobList);
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
//Generate tiles list for job list
let tileList = async function(selectedX, selectedY, selectedZoom, requiredZoom, map = "google") {
  let startX = selectedX * Math.pow(2, requiredZoom - selectedZoom);
  let startY = selectedY * Math.pow(2, requiredZoom - selectedZoom);
  let stopX = startX + Math.pow(2, requiredZoom - selectedZoom);
  let stopY = startY + Math.pow(2, requiredZoom - selectedZoom);
  //let listTiles = [];
  for(let x = startX; x < stopX; x++) {
    for(let y = startY; y < stopY; y++) {
      //Добавляем в список координаты тайлов
      arrJobTilesList.push({
        x: parseInt(x),
        y: parseInt(y),
        z: parseInt(requiredZoom),
        response: false,
        map: map
      });
    }
  }
  //Make stat
  stat.job.total = arrJobTilesList.length;
  stat.job.queue = arrJobTilesList.length;
  threadsStarter();
  Log.make("info", "MAIN", "Job started. Tile Count: " + arrJobTilesList.length);
  return;
};
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
  Log.make("info", "MAIN", "Start service on port " + config.service.port);
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
        tileList(currentJob.x, currentJob.y, currentJob.zoom, currentJob.requiredZoom, currentJob.map);
      }
    }
  }
})();
