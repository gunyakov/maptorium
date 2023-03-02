#!/usr/bin/env node
//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
global.config = require('./config.js');
//------------------------------------------------------------------------------
//Statistics
//------------------------------------------------------------------------------
global.stat = require('./src/statistics.js');
//------------------------------------------------------------------------------
//MD5 to hashed tile names
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//Wait функция
//------------------------------------------------------------------------------
global.wait = ms => new Promise(resolve => setTimeout(resolve, ms));
//------------------------------------------------------------------------------
//Express with socket IO
//------------------------------------------------------------------------------
let path = require('path');
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);
global.IO = new Server(httpServer, { /* options */ });
require("./src/IO.js");
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
global.Log = require("./src/log.js");
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
global.GPS = require("./src/gps.js");
//------------------------------------------------------------------------------
//Geometry handler
//------------------------------------------------------------------------------
global.POI = require("./src/poi");
//------------------------------------------------------------------------------
//Worker handler
//------------------------------------------------------------------------------
global.Downloader = require("./src/downloader.js");
//------------------------------------------------------------------------------
//Static files for browser map
//------------------------------------------------------------------------------
app.use(express.static(process.mainModule.path + '/public'));
app.use('/poi', require('./routes/poi.js'));
app.use('/map', require('./routes/map.js'));
app.use('/job', require('./routes/job.js'));
app.use('/tile', require('./routes/tile.js'));
app.use('/message', require('./routes/messages.js'));
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
    IO.emit("stat-generate", stat.generate);
  }
})();
