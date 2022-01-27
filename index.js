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
//Глобальный список тайлов для загрузки
let arrTilesList = [];
//Глобальный список статусов запущеных потоков
let threadRunList = [];
//Глобальный список карт
let arrMaps = {};
//----------------------------------------------------------------------------------------------------------------------
//Открытие порта для входящих соединений
//----------------------------------------------------------------------------------------------------------------------
httpServer.listen(config.service.port);
Log.make("info", "MAIN", "Start service on port " + config.service.port);
//----------------------------------------------------------------------------------------------------------------------
//Выдача статичных файлов для карты
//----------------------------------------------------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
//----------------------------------------------------------------------------------------------------------------------
//Обработка запросов на тайлы
//----------------------------------------------------------------------------------------------------------------------
app.get(["/tile", "/cesium/tile"], async function(request, responce){
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
    maxTileNumber = maxTileNumber * 4;
  }
  maxTileNumber--;
  //Если координата тайла превышает максимально возможное значение
  if(q.x > maxTileNumber || q.y > maxTileNumber) {
    Log.make("error", "MAIN", "Tile coord error: x " + q.x + " > " + maxTileNumber + "or y " + q.y + " > " + maxTileNumber);
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
      responce: responce
    });
    //Запускаем потоки загрузки
    threadsStarter();
  }
});
//------------------------------------------------------------------------------
//Функция, которая запускает потоки загрузки тайлов
//------------------------------------------------------------------------------
async function threadsStarter() {
  //If we have tiles in list for download
  if(arrTilesList.length > 0) {
    //Get tiles counter
    let threadCounter = arrTilesList.length;
    //If tiles counter more then threads enabled
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
  //Переменная для хранения информации о загружаемом тайле
  let jobInfo = {};
  //Переменная для хранения ссылки на ресурс ответа
  let response = '';
  //Переменная для хранения изображения тайла
  let tile = '';
  //Переменная для хранения обьекта карты
  let map = '';
  //Пока поток запущен
  while(threadRunList[threadNumber]) {
    //Если список тайлов не пуст
    if(arrTilesList.length > 0) {
      //Берем первый тайл из списка
      jobInfo = arrTilesList[0];
      //Удаляем тайл из списка
      arrTilesList.shift();
      //Проверяем есть ли обьект карты в списке
      if(typeof arrMaps[jobInfo.map] !== "undefined") {
        //сохраняем обьект карты в переменную
        map = arrMaps[jobInfo.map];
      }
      //Если обькта карты нет
      else {
        map = require("./" + jobInfo.map + ".js");
        map = new map();
        arrMaps[jobInfo.map] = map;
      }
      //Получаем тайл из базы или интернета
      tile = await map.getTile(jobInfo.z, jobInfo.x, jobInfo.y);
      //If tile was asked by leaflet map
      if(jobInfo.responce) {
        //Получаем ссылку на ресурс ответа
        responce = jobInfo.responce;
        //Если удалось получить тайл
        if (tile) {
          //Пишем изображение в ответ
          responce.writeHead(200, {'Content-Type': 'image/jpg', "Content-Length": tile.s});
          responce.end(tile.b);
        }
        //Если не удалось получить тайл
        else {
          //Пишем пустой тайл
          responce.writeHead(440, {'Content-Type': 'image/jpg', "Content-Length": 0});
          responce.end('');
        }
      }
      stat.queue = arrTilesList.length;
      io.emit("stat", stat);
    }
    //Если список тайлов пуст
    else {
      //Выходим из потока
      threadRunList[threadNumber] = false;
    }
  }
  Log.make("info", "MAIN", "Thread " + threadNumber + " was stoped.");
}

//------------------------------------------------------------------------------
//Socket comunication with client
//------------------------------------------------------------------------------
let jobList = [];

io.on("jobOrder", (jobConfig) => {
  jobList.push(jobConfig);
  tileList(jobConfig.x, jobConfig.y, jobConfig.zoom, jobConfig.requiredZoom);
});

io.on('connection', function(socket){
  Log.make("info", "MAIN", "User connected by socket.io");
  socket.on("stat", () => {
    socket.emit("stat", stat);
  });
  //----------------------------------------------------------------------------
  //New job order request
  //----------------------------------------------------------------------------
  socket.on("jobOrder", (jobConfig) => {
    jobList.push(jobConfig);
    tileList(jobConfig.x, jobConfig.y, jobConfig.zoom, jobConfig.requiredZoom);
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

let tileList = function(selectedX, selectedY, selectedZoom, requiredZoom, map = "google") {
  let startX = selectedX * Math.pow(2, requiredZoom - selectedZoom);
  let startY = selectedY * Math.pow(2, requiredZoom - selectedZoom);
  let stopX = startX + Math.pow(2, requiredZoom - selectedZoom);
  let stopY = startY + Math.pow(2, requiredZoom - selectedZoom);
  //let listTiles = [];
  for(let x = startX; x < stopX; x++) {
    for(let y = startY; y < stopY; y++) {
      //Добавляем в список координаты тайлов
      arrTilesList.push({
        x: parseInt(x),
        y: parseInt(y),
        z: parseInt(requiredZoom),
        responce: false,
        map: map
      });
    }
  }
  Log.make("info", "MAIN", "Added new job. Tile Count: " + arrTilesList.length);
  threadsStarter();
  //return listTiles;
};
