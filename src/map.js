//------------------------------------------------------------------------------
//CRC32 to store tiles hash in DB
//------------------------------------------------------------------------------
const CRC32 = require("crc-32");
//------------------------------------------------------------------------------
//Moment library to parse date from UI
//------------------------------------------------------------------------------
var moment = require('moment');
//------------------------------------------------------------------------------
//DB handler
//------------------------------------------------------------------------------
const DB = require("../DB/db.js");
const db = new DB();
//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
class Map {

  constructor(){
    this.storage = process.mainModule.path;
    this._mapVersion = 0;
    this._httpEngine = require("./http-engine.js");
    this.config = config;
  }
  //----------------------------------------------------------------------------
  //Return info of Map
  //----------------------------------------------------------------------------
  async getInfo() {
    return this._info;
  }
  //----------------------------------------------------------------------------
  //
  //----------------------------------------------------------------------------
  async getTile(z, x, y, mode = {mode: "enable", getFull: false}, config = {updateTiles: false, updateDifferent: false, updateDateTiles: false, emptyTiles: true, checkEmptyTiles: false, updateDateEmpty: false}) {
    let tileUrl = await this.getURL(z, x, y);
    Log.make("info", "HTTP", tileUrl);
    let tile = await this.getTileMain(z, x, y, tileUrl, mode, config);
    if(tile) {
      return tile;
    }
    else {
      return false;
    }
  }
  //----------------------------------------------------------------------------
  //Main tile handler
  //----------------------------------------------------------------------------
  async getTileMain (z, x, y, url, mode, config) {
    //Init default vars
    let tile = "";
    let downloadTile = false;
    let updateTile = false;
    let netTile = false;

    //Chech if tile exist in DB
    tile = await this.checkTile(z, x, y, mode.getFull);
    //proctiles.mark();
    //If disable get tiles from internet return any result
    if(mode.mode == "disable") return tile;

    //If tile empty and need check empty tiles
    if(tile.s == 0 && config.checkEmptyTiles && !config.updateDateEmpty) {
      //console.log("update tile 1");
      updateTile = true;
    }
    //If tile empty and set date of empty tiles to check
    else if (tile.s == 0 && config.checkEmptyTiles && config.updateDateEmpty) {
      //Parse date to unix time
      let tileEmptyDate = moment(config.dateEmpty).unix();
      //If tile was downloaded before date
      if(tile.d < tileEmptyDate) {
        //console.log("update tile 2");
        updateTile = true;
      }
    }

    //If empty tile and no need update this tile
    if(tile.s == 0 && !updateTile) return tile;

    //If tile missing or tile not empty
    if(!tile || tile.s > 0) {
      //If tile missing and network state get permition to download tile
      if(!tile && mode.mode != "disable") {
        //console.log("download tile 1");
        downloadTile = true;
      }

      //If tile exist but network mode set to force mode
      if(tile && mode.mode == "force") {
        //console.log("update tile 3");
        updateTile = true;
      }

      if(config.updateTiles && config.updateDateTiles) {
        let tileDate = moment(config.dateTiles).unix();
        if(tile.d < tileDate) {
          //console.log(tile.d, tileDate);
          //console.log("update tile 4");
          updateTile = true;
        }
      }
      else if (config.updateTiles && !config.updateDifferent && !config.updateDateTiles) {
        //console.log("update tile 5");
        updateTile = true;
      }
    }
    //--------------------------------------------------------------------------
    //If need to get tile from internet
    //--------------------------------------------------------------------------
    if(downloadTile || updateTile) {
      //Wait delay in config to prevent server request overloading
      await wait(this.config.request.delay);
      //Try to get tile from server
      netTile = await this._httpEngine.get(url, this.config, "arraybuffer");
      //reqtiles.mark();
    }
    //--------------------------------------------------------------------------
    //If tile image received from internet
    //--------------------------------------------------------------------------
    if(netTile && netTile != 404) {
      //If need to get tile from internet and tile missing in DB
      if(downloadTile && !tile) {
        //Insert tile into DB
        await db.saveTile(z, x, y, this.storage, netTile.data, netTile.data.byteLength, this._mapVersion);
      }
      //If need update tile only if different
      if(config.updateTiles && config.updateDifferent) {
        //Generate tile from net hash
        let tileHash = Math.abs(CRC32.bstr(new Buffer.from( netTile.data, 'binary' ).toString('utf8')));
        //If tile from net hash is different tile from DB hash
        if(tileHash != tile.h) {
          updateTile = true;
        }
      }
      //If need update tile
      if(updateTile) {
        if(tile) {
          //Insert or update tile in DB
          await db.updateTile(z, x, y, this.storage, netTile.data, netTile.data.byteLength, this._mapVersion);
        }
        else {
          //Insert tile into DB
          await db.saveTile(z, x, y, this.storage, netTile.data, netTile.data.byteLength, this._mapVersion);
        }
      }
      //Format tile info
      tile = {
        b: netTile.data,
        s: netTile.data.byteLength,
        //Set that tile was downloaded
        method: "http"
      }
      return tile;
      //If tile exist in db and need update
    }
    //--------------------------------------------------------------------------
    //If get empty tile from internet
    //--------------------------------------------------------------------------
    if(netTile == 404) {
      if(config.emptyTiles) {
        if(tile) {
          //Insert or update tile in DB
          await db.updateTile(z, x, y, this.storage, "", 0, this._mapVersion);
        }
        else {
          //Insert tile into DB
          await db.saveTile(z, x, y, this.storage, "", 0, this._mapVersion);
        }
      }
      //Show error message
      Log.make("warning", "MAP", url);
      //Return empty tile
      return 404;
    }
    //If tile in DB and we reach this point, just return tile from DB
    if(tile) return tile;
    //Show error message
    Log.make("error", "MAP", url);
    //Return false
    return false;
  }
  //----------------------------------------------------------------------------
  //Check if tile is present in DB
  //----------------------------------------------------------------------------
  async checkTile(z, x, y, getFull) {
    //Try to get tile from DB
    let tile = await db.getTile(z, x, y, this.storage, getFull);
    //If tile is present in DB
    if(tile) {
      //Set that tile was take from db
      tile.method = "db";
      //Return tile
      return tile;
    }
    //If tile is missing in DB
    else {
      //Return false
      return false;
    }
  }
  //----------------------------------------------------------------------------
  //Save tile (for generate map functions)
  //----------------------------------------------------------------------------
  async saveTile(z, x, y, tile) {
    //Insert or update tile in DB
    return await db.updateTile(z, x, y, this.storage, tile.data, tile.byteLength, 0);
  }
}

module.exports = Map;
