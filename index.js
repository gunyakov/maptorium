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
      //Reset map handler
      let map = '';
      //Reset tile result
      let tile = '';
      //If we have tiles in GET list
      if(arrTilesList.length > 0) {
        //Take first tile and delete it
        jobTile = arrTilesList.shift();
      }
      //If GET list empty but job list isn`t
      else if(arrJobTilesList.length > 0) {
        //Take first tile and delete it
        jobTile = arrJobTilesList.shift();
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
          //If tile was asked by leaflet map
          if(jobTile.response) {
            //If tile handled
            if (tile) {
              //Return tile to response
              response.writeHead(200, {'Content-Type': 'image/*', "Content-Length": tile.s});
              response.end(tile.b);
            }
            //If tile didn`t handle or some error in tile downloading
            else {
              //Return empty response
              response.writeHead(440, {'Content-Type': 'image/*', "Content-Length": 0});
              response.end('');
            }
          }
          //Make stat
          stat.queue = arrTilesList.length + arrJobTilesList.length;
          //Send stat to UI
          io.emit("stat", stat);
        }
        //If haven`t connect map handler
        else {
          Log.make("warning", "MAIN", `Can't find ${jobTile.map} map handler on server. Skip request.`);
          //Return empty response
          response.writeHead(440, {'Content-Type': 'image/*', "Content-Length": 0});
          response.end('');
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
    arrJobList.push(jobConfig);
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
  socket.on('disconnect', function() {
    Log.make("info", "MAIN", "User disconnected by socket.io");
  });
});
//------------------------------------------------------------------------------
//Job List handler
//------------------------------------------------------------------------------
//Init job list
let arrJobList = [];
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
  Log.make("info", "MAIN", "Job started. Tile Count: " + arrJobTilesList.length);
  threadsStarter();
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
  //----------------------------------------------------------------------------
  //Open port for incoming requests
  //----------------------------------------------------------------------------
  await httpServer.listen(config.service.port);
  Log.make("info", "MAIN", "Start service on port " + config.service.port);
  while(true) {
    //Whait second
    await wait(1000);
    //If job tile list empty and job list isnt
    if(arrJobTilesList.length == 0 && arrJobList.length > 0) {
      //Take first job and delete it
      let jobConfig = arrJobList.shift();
      //Create tile list for job and start threads
      await tileList(jobConfig.x, jobConfig.y, jobConfig.zoom, jobConfig.requiredZoom, jobConfig.map);
    }
  }
})();
