//------------------------------------------------------------------------------
//Files reader
//------------------------------------------------------------------------------
const fs = require('fs');
//------------------------------------------------------------------------------
//Array manipulation
//------------------------------------------------------------------------------
let arrayFunc = import("array-move");
//------------------------------------------------------------------------------
//Image manipulation
//------------------------------------------------------------------------------
const sharp = require("sharp");
//------------------------------------------------------------------------------
//Job List handler
//------------------------------------------------------------------------------
class Downloader {

  constructor() {
    this.arrJobList = [];
    this.arrTilesList = [];
    this.arrJobTileList = [];
    this.threadRunList = [];
    this.currentJob = {};
    this.arrMapInfo = [];
    this.arrMaps = [];
    this.tileCachedList = {};
    this.arrJobGenerateList = [];
    this.arrJobTilesGenerateList = [];
    this.arrJobTilesList = [];
    this.service();
  }

  async addTile(tileInfo) {
    //Add tile to download list
    this.arrTilesList.unshift(tileInfo);
    //Start threads
    this.threadsStarter();
  }

  async emitTileUpdate(map, x, y, zoom, state) {
    if(typeof this.tileCachedList.map !== "undefined" && typeof this.tileCachedList.zoom !== "undefined") {
      if(this.tileCachedList.map == map && this.tileCachedList.zoom == zoom) {
        if(typeof this.tileCachedList.tiles[x] !== "undefined") {
          if(typeof this.tileCachedList.tiles[x][y] !== "undefined") {
            this.tileCachedList.tiles[x][y] = state;
            IO.emit("updateTileCachedMap", {x: x, y: y, state: state});
          }
        }
      }
    }
    return;
  }
  //----------------------------------------------------------------------------
  //Функция, которая запускает потоки загрузки тайлов
  //----------------------------------------------------------------------------
  async threadsStarter() {
    //If we have tiles in list for GET or in list for Job
    if(this.arrTilesList.length > 0 || this.arrJobTilesList.length > 0) {
      //Reset thread counter
      let threadCounter = 0;
      //If we have tiles on job list
      if(this.arrJobTilesList.length > 0) {
        threadCounter = this.arrJobTilesList.length;
      }
      //If size of request tiles in job list less than request tiles in GET
      if(this.arrTilesList.length > threadCounter) {
        threadCounter = this.arrTilesList.length;
      }
      //If threads counter more then threads enabled
      if(threadCounter > config.service.threads) {
        //Set threads counter to max enabled threads
        threadCounter = config.service.threads;
      }
      //Start loop
      for(let i = 1; i <= threadCounter; i++) {
        //If thread never run
        if(typeof this.threadRunList[i] === "undefined") {
          //Start thread
          this.tilesService(i);
        }
        //If thread is stopped
        else if(this.threadRunList[i] == false) {
          //Start thread
          this.tilesService(i);
        }
      }
    }
  }
  //----------------------------------------------------------------------------
  //Функция потока загрузки тайлов
  //----------------------------------------------------------------------------
  async tilesService(threadNumber) {
    //Устанавливаем что поток запущен
    this.threadRunList[threadNumber] = true;
    //Пока поток запущен
    while(this.threadRunList[threadNumber]) {
      //If any list of tiles isn`t empty
      if(this.arrTilesList.length > 0 || this.arrJobTilesList.length > 0) {
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
        if(this.arrTilesList.length > 0) {
          //Take first tile and delete it
          jobTile = this.arrTilesList.shift();
          //Set stat type
          statType = "tiles";
        }
        //If GET list empty but job list isn`t
        else if(this.arrJobTilesList.length > 0) {
          //If download in random mode
          if(this.currentJob.randomDownload) {
            //Get random tile
            jobTile = this.arrJobTilesList.splice(Math.floor(Math.random() * this.arrJobTilesList.length), 1);
            jobTile = jobTile[0];
          }
          //If download in normal mode
          else {
            //Take first tile and delete it
            jobTile = this.arrJobTilesList.shift();
          }
          //Set stat type
          statType = "job";
        }
        //if get tile info before
        if(jobTile) {
          //console.log(jobTile);
          if(!jobTile.mode) {
            jobTile.mode = config.network.state;
          }
          //Get response
          let response = jobTile.response;
          //Chech if we already init requred map handler
          if(typeof this.arrMaps[jobTile.map] !== "undefined") {
            //If have conected map handler just get it
            map = this.arrMaps[jobTile.map];
            //Handle tile download logick
            if(statType == "job") {
              tile = await map.getTile(jobTile.z, jobTile.x, jobTile.y, {mode: "internet", getFull: false}, this.currentJob);
            }
            else {
              tile = await map.getTile(jobTile.z, jobTile.x, jobTile.y, jobTile.mode);
            }
            //If tile handled
            if (tile && tile != 404) {
              //If tile was received by http request
              if(tile.method == "http") {
                await this.emitTileUpdate(jobTile.map, jobTile.x, jobTile.y, jobTile.z, "present");
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
                response.writeHead(200, {'Content-Type': map._info.content, "Content-Length": tile.s});
                response.end(tile.b);
              }
            }
            //If tile didn`t handle or some error in tile downloading
            else {
              if(tile == 404) {
                await this.emitTileUpdate(jobTile.map, jobTile.x, jobTile.y, jobTile.z, "empty");
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
            stat.general.queue = this.arrTilesList.length + this.arrJobTilesList.length;
            stat.job.queue = this.arrJobTilesList.length;
            //Send stat to UI
            if(threadNumber == 1) {
              IO.emit("stat", stat);
            }
          }
          //If haven`t connect map handler
          else {
            Log.warning("WORKER", `Can't find ${jobTile.map} map handler on server. Skip request.`);
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
        this.threadRunList[threadNumber] = false;
      }
    }
  }
  //----------------------------------------------------------------------------
  //Read maps list on server
  //----------------------------------------------------------------------------
  async readMaps() {
    //Reset map info array
    let arrMapInfo = [];
    //console.log(process);
    //Get list of files
    let mapsList = fs.readdirSync(process.mainModule.path + "/maps");
    //Walk files list
    for(let i = 0; i < mapsList.length; i++) {
      //Require module of map handler
      let map = require(process.mainModule.path + "/maps/" + mapsList[i]);
      //Init map handler
      map = new map();
      let mapInfo = await map.getInfo();
      //Save map handler for future use
      this.arrMaps[mapInfo.id] = map;
      //Push info of map into array
      this.arrMapInfo.push(mapInfo);
    }
  }

  async getMapList() {
    if(this.arrMapInfo.length == 0) {
      await this.readMaps();
    }
    return this.arrMapInfo;
  }

  async setTileCachedMap(cachedMap) {
      this.tileCachedList = cachedMap;
  }

  async getMapByID(mapID) {
    //await this.readMaps();
    if(this.arrMaps[mapID]) {
      return this.arrMaps[mapID];
    }
    else {
      return false;
    }
  }
  async getJobsList() {
    return this.arrJobList;
  }

  async addJob(jobConfig) {
    this.arrJobList.push(jobConfig);
    return this.arrJobList;
  }

  async jobDelete(ID) {
    for(let i = 0; i < this.arrJobList.length; i++) {
      if(this.arrJobList[i]['ID'] == ID) {
        this.arrJobList.splice(i, 1);
        break;
      }
    }
    if(this.currentJob.ID == ID) {
      this.arrJobTilesList = [];
    }
    return this.arrJobList;
  }

  async jobUP(ID) {
    for(let i = 0; i < this.arrJobList.length; i++) {
      if(this.arrJobList[i]['ID'] == ID) {
        this.arrJobList = arrayFunc.arrayMoveImmutable(this.arrJobList, i, i - 1);
        break;
      }
    }
    return this.addJobList;
  }

  async jobDown(ID) {
    for(let i = 0; i < this.arrJobList.length; i++) {
      if(this.arrJobList[i]['ID'] == data.ID) {
        this.arrJobList = arrayFunc.arrayMoveImmutable(this.arrJobList, i, i + 1);
        break;
      }
    }
    return this.arrJobList;
  }
  //----------------------------------------------------------------------------
  //Generate map tiles from lover zoom levels
  //----------------------------------------------------------------------------
  async generateMap(map, config, width = 255, height = 256) {
    config.updateTiles = (typeof config.updateTiles === "string") ? (config.updateTiles.toLowerCase() === "true") : config.updateTiles;
    config.completeTiles = (typeof config.completeTiles === "string") ? (config.completeTiles.toLowerCase() === "true") : config.completeTiles;

    stat.generate.skip = 0;
    stat.generate.procesed = 0;
    stat.generate.total = this.arrJobTilesGenerateList.length;
    Log.info("WORKER", "Start generate map.");
    for(let i = 0; i < this.arrJobTilesGenerateList.length; i++) {
      stat.generate.procesed++;
      //If disable to update tiles
      if(!config.updateTiles) {
        //Check tile in DB
        let checkTile = await map.checkTile(this.arrJobTilesGenerateList[i]['z'], this.arrJobTilesGenerateList[i]['x'], this.arrJobTilesGenerateList[i]['y']);
        //If tile present ant tile size more than 0 skip generate this tile
        if(checkTile && checkTile.s > 0) {
          stat.generate.skip++;
          continue;
        }
      }

      let x = this.arrJobTilesGenerateList[i]['x'] * 2;
      let y = this.arrJobTilesGenerateList[i]['y'] * 2;
      let z = this.arrJobTilesGenerateList[i]['z'] + 1;

      //Create tile
      const container = await sharp({
        create: {
          width: width,
          height: height,
          background: "#FFFFFF"
        }
      });
      //Generate list of 4 tiles from lover zoom
      let tilesList = [
        {x: x, y: y, drawX: 0, drawY: 0},
        {x: x + 1, y: y, drawX: width / 2, drawY: 0},
        {x: x, y: y + 1, drawX: 0, drawY: height / 2},
        {x: x + 1, y: y + 1, drawX: width / 2, drawY: height / 2}
      ];
      //Go throughtout tiles list
      for(let a = 0; a < tilesList.length; a++) {
        //Get tile from lover zoom
        let tile = await map.checkTile(z, tilesList[a]['x'], tilesList[a]['y']);
        //If tile exist
        if(tile && tile.s > 0) {
          //create image instance
          let img = await sharp(tile.b);
          await img.resize({width: width / 2, height: height / 2});
          //Draw lower tile to curent tile
          await container.composite([{input: img, top: tilesList[a]['drawX'], left: tilesList[a]['drawY']}]);
        }
        //If tile missing
        else {
          //If save only full tiles skip generate of this tile
          if(config.fullTile) continue;
        }
      }
      let newTile = {
        data: await container.jpeg().toBuffer()
      }

      newTile.byteLength = Buffer.byteLength(newTile.data);
      await map.saveTile(this.arrJobTilesGenerateList[i]['z'], this.arrJobTilesGenerateList[i]['x'], this.arrJobTilesGenerateList[i]['y'], newTile);
      //Release resources for other tasks
      await wait(10);
    }
    Log.info("WORKER", "Generating map completed");
    this.arrJobTilesGenerateList = [];
    return true;
  }

  async service() {
    //Generate list of maps
    await this.readMaps();
    while(true) {
      //If job tile list empty and job list isnt
      if(this.arrJobTilesList.length == 0 && this.arrJobList.length > 0) {
        //If first job in list already downloaded
        if(this.arrJobList[0].running) {
          Log.success("WORKER", `Job for Polygon ${this.currentJob.polygonID} and Map ${this.currentJob.mapID} completed. Error: ${stat.job.error}. Skip: ${stat.job.skip}. Download: ${stat.job.download}.`);
          //Delete job from list
          this.arrJobList.shift();
        }
        //If first job in list isnt started yet
        else {
          //Take first job
          this.currentJob = this.arrJobList[0];
          //Sate state of firstlet url = require('url'); job
          this.arrJobList[0].running = true;
          //Reset job statistics
          stat.job.download = 0;
          stat.job.error = 0;
          stat.job.empty = 0;
          stat.job.size = 0;
          stat.job.skip = 0;
          stat.job.time = 0;
          //Loop for all available zoom levels for download
          for(let i = 4; i <= 20; i++) {
            //If zoom level required for download
            if(this.currentJob['z' + i] === 'true') {
              //Create tile list for job
              let tempArr = await POI.tileList(this.currentJob.polygonID, i, this.currentJob.mapID);
              //If create tile list for current zoom
              if(Array.isArray(tempArr)) {
                //Add tiles list to main Array
                this.arrJobTilesList = this.arrJobTilesList.concat(tempArr);
              }
            }
          }
          //If main tile list isn`t empty
          if(this.arrJobTilesList.length > 0) {
            //Make stat
            stat.job.total = this.arrJobTilesList.length;
            stat.job.queue = this.arrJobTilesList.length;
            Log.success("WORKER", `Job started for Polygon ${this.currentJob.polygonID} and Map ${this.currentJob.mapID}. Tile Count: ${this.arrJobTilesList.length}`);
            //Start threads
            this.threadsStarter();
          }
        }
      }

      if(this.arrJobTilesGenerateList.length == 0 && this.arrJobGenerateList.length > 0) {
        //If first job in list already downloaded
        if(this.arrJobGenerateList[0].running) {
          //Delete job from list
          this.arrJobGenerateList.shift();
        }
        //If first job in list isnt started yet
        else {
          //Sate state of first job
          this.arrJobGenerateList[0].running = true;
          //Loop for all available zoom levels for download
          for(let i = 20; i > 4; i--) {
            //If zoom level required for download
            if(this.arrJobGenerateList[0]['z' + i] === 'true') {
              //Create tile list for job
              let tempArr = await POI.tileList(this.arrJobGenerateList[0]['polygonID'], i, this.arrJobGenerateList[0]['mapID']);
              //If create tile list for current zoom
              if(Array.isArray(tempArr)) {
                //Add tiles list to main Array
                this.arrJobTilesGenerateList = this.arrJobTilesGenerateList.concat(tempArr);
              }
            }
          }
          //If main tile list isn`t empty
          if(this.arrJobTilesGenerateList.length > 0) {
            Log.info("WORKER", "Job generate started. Tile Count: " + this.arrJobTilesGenerateList.length);
            //Start threads
            this.generateMap(this.arrMaps[this.arrJobGenerateList[0]['mapID']], {
              updateTiles: this.arrJobGenerateList[0]['updateTiles'] || false,
              completeTiles: this.arrJobGenerateList[0]['completeTiles'] || true
            });
          }
        }
      }
      //Check jobs list every 5 seconds to start
      await wait(5000);
    }
  }
}

module.exports = new Downloader();
