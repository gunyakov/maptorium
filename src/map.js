//------------------------------------------------------------------------------
//DB handler
//------------------------------------------------------------------------------
const DB = require("./db.js");
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
  async getTile(z, x, y) {
    let tileUrl = await this.getURL(z, x, y);
    Log.make("info", "HTTP", tileUrl);
    let tile = await this.getTileMain(z, x, y, tileUrl);
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
  async getTileMain(z, x, y, url) {
    //Reset tile info
    let tile = "";
    //Switch of network state
    switch (this.config.network.state) {
      //------------------------------------------------------------------------
      //Internet & Cache mode
      //------------------------------------------------------------------------
      case "enable":
        //Try to get tile from DB
        tile = await this.checkTile(z, x, y, this.storage);
        //If tile is present in DB
        if(tile) {
          //Return tile
          return tile;
        }
        //If tile is missing in DB
        else {
          //Wait delay in config to prevent server request overloading
          await wait(this.config.request.delay);
          //Try to get tile from server
          tile = await this._httpEngine.get(url, this.config, "arraybuffer").catch((error) => { Log.make("error", "MAP", error) });
          //If received tile from server or 404 code
          if(tile && tile != 404) {
            //Insert tile into DB
            await db.saveTile(z, x, y, this.storage, tile.data, tile.data.byteLength, this._mapVersion);
            //Format tile info
            tile = {
              b: tile.data,
              s: tile.data.byteLength,
              //Set that tile was downloaded
              method: "http"
            }
            //Return tile
            return tile;
          }
          //If tile missing on server
          else {
            if(tile == 404) {
              //Show error message
              Log.make("warning", "MAP", url);
              await db.saveTile(z, x, y, this.storage, '', 0, this._mapVersion);
              //Return empty tile
              return 404;
            }
            else {
              //Show error message
              Log.make("error", "MAP", url);
              //Return false
              return false;
            }
          }
        }
        break;
      //------------------------------------------------------------------------
      //Cache mode
      //------------------------------------------------------------------------
      case "disable":
        //Try to get tile from DB
        tile = await this.checkTile(z, x, y, this.storage);
        //Return result
        return tile;
        break;
      //------------------------------------------------------------------------
      //Internet mode
      //------------------------------------------------------------------------
      case "force":
        //Wait delay in config to prevent server request overloading
        await wait(this.config.request.delay);
        //Try to get tile from server
        tile = await this._httpEngine.get(url, this.config, "arraybuffer").catch((error) => { Log.make("error", "MAP", error) });
        //If received tile from server
        if(tile && tile != 404) {
          //If enable to write into DB
          if(this.config.db.ReadOnly === false) {
            //Insert or update tile in DB
            await db.updateTile(z, x, y, this.storage, tile.data, tile.data.byteLength, this._mapVersion);
          }
          //Format tile info
          tile = {
            b: tile.data,
            s: tile.data.byteLength,
            method: "http"
          }
          //Return tile
          return tile;
        }
        //If tile missing on server
        else {
          if(tile == 404) {
            //Show error message
            Log.make("warning", "MAP", url);
            //Return empty tile
            return 404;
          }
          else {
            //Show error message
            Log.make("error", "MAP", url);
            //Return false
            return false;
          }
        }
        break;
    }
  }
  //----------------------------------------------------------------------------
  //Check if tile is present in DB
  //----------------------------------------------------------------------------
  async checkTile(z, x, y) {
    //Try to get tile from DB
    let tile = await db.getTile(z, x, y, this.storage);
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
}

module.exports = Map;
