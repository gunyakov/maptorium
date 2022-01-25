#!/usr/bin/env node
//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
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
//Color console
//------------------------------------------------------------------------------
let colors = require('colors');
//------------------------------------------------------------------------------
//GooleSatMap
//------------------------------------------------------------------------------
const MAP = require("./map");
let googleMap = new MAP();
//Глобальный список тайлов для загрузки
let arrTilesList = [];
//Глобальный список статусов запущеных потоков
let threadRunList = [];
//----------------------------------------------------------------------------------------------------------------------
//Открытие порта для входящих соединений
//----------------------------------------------------------------------------------------------------------------------
httpServer.listen(config.service.port);
console.log(colors.green("Start service on port"), colors.green.bold(config.service.port));
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
  //Добавляем тайл в список загрузки
  arrTilesList.push({
    x: parseInt(q.x),
    y: parseInt(q.y),
    z: parseInt(q.z),
    responce: responce
  });
  //Запускаем потоки загрузки
  threadsStarter();
});
//------------------------------------------------------------------------------
//Функция, которая запускает потоки загрузки тайлов
//------------------------------------------------------------------------------
async function threadsStarter() {
  //Проходимся по списку потоков загрузки
  for(let i = 1; i <= config.service.threads; i++) {
    //Если поток никогда не был запущен
    if(typeof threadRunList[i] === "undefined") {
      //Запускаем поток
      tilesService(i);
    }
    //Если поток остановлен
    else if(threadRunList[i] == false) {
      //Запускаем поток
      tilesService(i);
    }
  }
}
//------------------------------------------------------------------------------
//Функция потока загрузки тайлов
//------------------------------------------------------------------------------
async function tilesService(threadNumber) {
  console.log(("Thread " + threadNumber + " was started.").blue);
  //Устанавливаем что поток запущен
  threadRunList[threadNumber] = true;
  //Переменная для хранения информации о загружаемом тайле
  let jobInfo = {};
  //Переменная для хранения ссылки на ресурс ответа
  let response = '';
  //Переменная для хранения изображения тайла
  let tile = '';
  //Пока поток запущен
  while(threadRunList[threadNumber]) {
    //Если список тайлов не пуст
    if(arrTilesList.length > 0) {
      //Берем первый тайл из списка
      jobInfo = arrTilesList[0];
      //Удаляем тайл из списка
      arrTilesList.shift();
      //Получаем тайл из базы или интернета
      tile = await googleMap.getTile(jobInfo.z, jobInfo.x, jobInfo.y);
      //If tile was asked by leaflet map
      if(jobInfo.responce) {
        //Получаем ссылку на ресурс ответа
        responce = jobInfo.responce;
        //console.log(tile);
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
    }
    //Если список тайлов пуст
    else {
      //Выходим из потока
      threadRunList[threadNumber] = false;
    }
  }
  console.log(("Thread " + threadNumber + " was stoped.").blue);
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
  console.log('a user connected');
  socket.on("stat", () => {
    socket.emit("stat", statistic);
  });
  socket.on("jobOrder", (jobConfig) => {
    jobList.push(jobConfig);
    tileList(jobConfig.x, jobConfig.y, jobConfig.zoom, jobConfig.requiredZoom);
  });
  socket.on("logHistory", () =>{
    socket.emit("logHistory", logList);
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

let tileList = function(selectedX, selectedY, selectedZoom, requiredZoom) {
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
        responce: false
      });
    }
  }
  console.log(arrTilesList.length);
  threadsStarter();
  //return listTiles;
};
