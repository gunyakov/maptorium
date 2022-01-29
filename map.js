//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//DB handler
//------------------------------------------------------------------------------
const DB = require("./db.js");
const db = new DB();
//------------------------------------------------------------------------------
//Log
//------------------------------------------------------------------------------
let Log = require('./log.js');
//------------------------------------------------------------------------------
//Statistics
//------------------------------------------------------------------------------
let stat = require('./statistics');
//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
class Map {

  constructor(){
    this.storage = __dirname;
    this._mapVersion = 0;
    this._httpEngine = require("./http-engine.js");
    this._log = new Log();
  }
  //----------------------------------------------------------------------------
  //Return info of Map
  //----------------------------------------------------------------------------
  async getInfo() {
    return this._info;
  }
  //----------------------------------------------------------------------------
  //Main tile handler
  //----------------------------------------------------------------------------
  async getTileMain(z, x, y, storage, url) {
    //Reset tile info
    let tile = "";
    //Switch of network state
    switch (config.network.state) {
      //------------------------------------------------------------------------
      //Internet & Cache mode
      //------------------------------------------------------------------------
      case "enable":
        //Try to get tile from DB
        tile = await db.getTile(z, x, y, storage);
        //If tile is present in DB
        if(tile) {
          //Return tile
          return tile;
        }
        //If tile is missing in DB
        else {
          //Try to get tile from server
          tile = await this._httpEngine.get(url, "arraybuffer").catch((error) => { this._log.make("error", "MAP", error) });
          //If received tile from server or 404 code
          if(tile) {
            //If enable to write into DB
            if(config.db.ReadOnly === false) {
              //Insert tile into DB
              await db.saveTile(z, x, y, this.storage, tile.data, tile.data.byteLength, this._mapVersion);
            }
            //Format tile info
            tile = {
              b: tile.data,
              s: tile.data.byteLength
            }
            //Make stat
            stat.tiles.download++;
            stat.tiles.size += tile.s;
            //Return tile
            return tile;
          }
          //If tile missing on server
          else {
            //Show error message
            this._log.make("error", "MAP", url);
            //Make stat
            stat.tiles.error++;
            //Return false
            return false;
          }
        }
        break;
      //------------------------------------------------------------------------
      //Cache mode
      //------------------------------------------------------------------------
      case "disable":
        //Try to get tile from DB
        tile = await db.getTile(z, x, y, storage);
        //If tile is present in DB
        if(tile) {
          //Return tile
          return tile;
        }
        //If tile is missing in DB
        else {
          //Return false
          return false;
        }
        break;
      //------------------------------------------------------------------------
      //Internet mode
      //------------------------------------------------------------------------
      case "force":
        //Try to get tile from server
        tile = await this._httpEngine.get(url, "arraybuffer").catch((error) => { this._log.make("error", "MAP", error) });
        //If received tile from server
        if(tile) {
          //If enable to write into DB
          if(config.db.ReadOnly === false) {
            //Insert or update tile in DB
            await db.updateTile(z, x, y, this.storage, tile.data, tile.data.byteLength, this._mapVersion);
          }
          //Format tile info
          tile = {
            b: tile.data,
            s: tile.data.byteLength
          }
          //Make stat
          stat.tiles.download++;
          stat.tiles.size += tile.s;
          //Return tile
          return tile;
        }
        //If tile missing on server
        else {
          //Show error message
          this._log.make("error", "MAP", url);
          //Make stat
          stat.tiles.error++;
          //Return false
          return false;
        }
        break;
    }
  }
}

module.exports = Map;
