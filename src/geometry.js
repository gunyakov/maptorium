//------------------------------------------------------------------------------
//DB handler
//------------------------------------------------------------------------------
let sqlite3 = require('./sqlite3-promise.js');
sqlite3 = new sqlite3();
//------------------------------------------------------------------------------
//Checker tiles inside polygon or not
//------------------------------------------------------------------------------
let pointInPolygon = require('point-in-polygon');
//------------------------------------------------------------------------------
//General geometry storage
//------------------------------------------------------------------------------
class Geometry {

  constructor(){
    this._dbName = process.mainModule.path + "/Marks.db3";
    this.time = Math.floor(Date.now() / 1000);
    this.state = "close";
    this.routeID = false;
    this.routeGetID();
    this.service();
  }

  async open() {
    this.time = Math.floor(Date.now() / 1000);
    if(this.state != "open") {
      await sqlite3.open(this._dbName).catch((error) => {Log.make("error", "DB", error) });
      this.state = "open";
      //Make log
      Log.make("info", "DB", "OPEN -> " + this._dbName);
    }
    return;
  }

  async get(ID = 0) {
    await this.open();
    let result = false;
    if(ID == 0) {
      result = await sqlite3.all(this._dbName, "SELECT * FROM geometry;", []).catch((error) => {Log.make("error", "DB", error)  });
    }
    else {
      result = await sqlite3.all(this._dbName, "SELECT * FROM geometry WHERE ID = ?;", [ID]).catch((error) => {Log.make("error", "DB", error)  });
    }
    if(result.length > 0) {
      let points = false;
      let responce = [];
      for(i = 0; i < result.length; i++) {
        points = await sqlite3.all(this._dbName, "SELECT * FROM points WHERE geometryID = ?;", [result[i]['ID']]).catch((error) => {Log.make("error", "DB", error)  });
        if(points && points.length > 0) {
          let geometry = result[i];
          geometry.points = points;
          responce.push(geometry);
        }
      }
      return responce;
    }
    else {
      return false;
    }
  }

  async save(geometry) {
    await this.open();
    let SQL = "INSERT INTO geometry('categoryID', 'name', 'type', 'color', 'fillColor', 'fillOpacity', 'zoom', 'SWx', 'SWy', 'NEx', 'NEy') VALUES(1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    let SQLValues = ['', geometry.type, geometry.color, geometry.fillColor, geometry.fillOpacity, geometry.zoom, 0, 0, 0, 0];

    await sqlite3.run(this._dbName, SQL, SQLValues).catch((error) => { Log.make("error", "DB", error)  });
    let lastID = await sqlite3.get(this._dbName, "SELECT * FROM geometry WHERE name = ? ORDER BY ID DESC LIMIT 1;", ['']).catch((error) => { Log.make("error", "DB", error)  });
    if(typeof lastID !== "undefined") {
      if(geometry.bounds) {
        SQL = "UPDATE geometry SET SWx = ?, SWy = ?, NEx = ?, NEy = ? WHERE ID = ?;";
        SQLValues = [geometry.bounds._southWest.x, geometry.bounds._southWest.y, geometry.bounds._northEast.x, geometry.bounds._northEast.y, lastID.ID];
        await sqlite3.run(this._dbName, SQL, SQLValues).catch((error) => { Log.make("error", "DB", error)  });
      }
      await this.savePoints(lastID.ID, geometry.type, geometry.coords);
      return lastID.ID;
    }
    else {
      return false;
    }
  }

  async savePoints(ID, type, coords) {
      switch(type) {
        case "Polygon":
          coords = coords[0];
        case "Line":
          for(i = 0; i < coords.length; i++) {
            await sqlite3.run(this._dbName, "INSERT INTO points('geometryID', 'x', 'y') VALUES (?, ?, ?);", [ID, coords[i]['x'], coords[i]['y']]).catch((error) => { Log.make("error", "DB", error)  });
          }
          break;
        case "Marker":
          await sqlite3.run(this._dbName, "INSERT INTO points('geometryID', 'x', 'y') VALUES (?, ?, ?);", [ID, coords['x'], coords['y']]).catch((error) => { Log.make("error", "DB", error)  });
          break;
      }
  }

  async delete(ID, onlyPoints = false) {
    //Open DB (if not yet opened)
    await this.open();
    //If not update of geometry
    if(!onlyPoints) {
      //Delete entry of geometry
      await sqlite3.run(this._dbName, "DELETE FROM geometry WHERE ID = ?;", [ID]).catch((error) => {Log.make("error", "DB", error) });
    }
    //Delete points of geometry
    await sqlite3.run(this._dbName, "DELETE FROM points WHERE geometryID = ?;", [ID]).catch((error) => {Log.make("error", "DB", error) });
    //Exit
    return;
  }
  //----------------------------------------------------------------------------
  //Uodate geometry style/info/points in DB
  //----------------------------------------------------------------------------
  async update(geometry) {
    //Open DB (if not yet opened)
    await this.open();
    //Update style of geometry
    let SQL = "UPDATE geometry SET color = ?, fillColor = ?, fillOpacity = ?, zoom = ? WHERE ID = ?;"
    let SQLValues = [geometry.color, geometry.fillColor, geometry.fillOpacity, geometry.zoom, geometry.ID];
    await sqlite3.run(this._dbName, SQL, SQLValues).catch((error) => {Log.make("error", "DB", error) });
    //Update bounds of geometry if present
    if(geometry.bounds) {
      SQL = "UPDATE geometry SET SWx = ?, SWy = ?, NEx = ?, NEy = ? WHERE ID = ?;";
      SQLValues = [geometry.bounds._southWest.x, geometry.bounds._southWest.y, geometry.bounds._northEast.x, geometry.bounds._northEast.y, geometry.ID];
      await sqlite3.run(this._dbName, SQL, SQLValues).catch((error) => {Log.make("error", "DB", error) });
    }
    //Delete only points
    await this.delete(geometry.ID, true);
    //Insert new points in DB
    await this.savePoints(geometry.ID, geometry.type, geometry.coords);
    //Exit
    return;
  }

  async routeAddRoute(name = "New Route") {
    //Open DB (if not yet opened)
    await this.open();
    let SQL = "INSERT INTO routeList('name', 'distance') VALUES(?, ?);";
    await sqlite3.run(this._dbName, SQL, [name, 0]).catch((error) => {Log.make("error", "DB", error) });
    await this.routeGetID();
    Log.make("info", "DB", "INSERT -> " + this._dbName);
    return true;
  }

  async routeAddPoint(lat, lng) {
    if(lat != 0 && lng != 0) {
      if(this.routeID) {
        let SQL = "INSERT INTO routeCoords('routeID', 'lat', 'lon', 'date') VALUES(?, ?, ?, 'unixepoch')";
        //Open DB (if not yet opened)
        await this.open();
        await sqlite3.run(this._dbName, SQL, [this.routeID, lat, lng]).catch((error) => {Log.make("error", "DB", error) });
        Log.make("info", "DB", "INSERT -> " + this._dbName);
      }
      else {
        Log.make("warning", "GEOMETRY", "RouteID is still empty. Skip adding route point ot DB.");
      }
    }
    else {
      Log.make("warning", "GEOMETRY", "One of coords is empty. Skip adding route point ot DB.");
    }
  }

  async routeGetHistory(ID = 0) {
    //Open DB if closed
    await this.open();
    //Get current route ID
    let routeID = this.routeID;
    //If need to get history of route
    if(ID > 0) {
      routeID = ID;
    }
    //Exex SQL request
    let result = await sqlite3.all(this._dbName, "SELECT * FROM routeCoords WHERE routeID=? ORDER BY ID;", [routeID]).catch((error) => {Log.make("error", "DB", error)  });
    //If have point for route in DB
    if(result.length > 0) {
      //Form data
      let response = {
        ID: routeID,
        points: result
      }
      //Return
      return response;
    }
    //If have no points for route
    else {
      //Return
      return false;
    }
  }

  async routeGetID() {
    //Get last route ID in DB
    await this.open();
    let result = await sqlite3.all(this._dbName, "SELECT MAX(ID) as IDMAX FROM routeList;").catch((error) => {Log.make("error", "DB", error)  });
    if(result.length > 0) {
      if(this.routeID < result[0]['IDMAX']) {
        this.routeID = result[0]['IDMAX'];
        Log.make("success", "GEOMETRY", `RouteID was set to ${this.routeID}.`);
      }
      else {
        Log.make("error", "GEOMETRY", "Cant find new route ID in DB.");
      }
    }
  }

  async routeGetList() {
    await this.open();
    //Get routes list from DB
    let result = await sqlite3.all(this._dbName, "SELECT * FROM routeList;").catch((error) => {Log.make("error", "DB", error)});
    //If have route list in DB
    if(result.length > 0) {
      //Return
      return result;
    }
    else {
      //Return
      return false;
    }
  }
  //----------------------------------------------------------------------------
  //Service function to close DB file when reach iddle time out
  //----------------------------------------------------------------------------
  async service() {
    //Run neverended cycle
    while(true) {
      //Check last DB query time
      let dbTimeOpen = Math.floor(Date.now() / 1000) - this.time;
      if(dbTimeOpen > config.db.OpenTime && this.state == "open") {
        await sqlite3.close(this._dbName).catch((error) => { Log.make("error", "DB", error) });
        Log.make("info", "DB", "CLOSE -> " + this._dbName);
        this.state = "close";
      }
      //Run every 5 seconds
      await wait(5000);
    }
  }
  //----------------------------------------------------------------------------
  //Generate tiles list for job list
  //----------------------------------------------------------------------------
  async tileList(ID, requiredZoom, map = "google") {
    Log.make('info', "MAIN", `Start calculation tiles list for polygon ${ID} and zoom ${requiredZoom}`);
    let geometry = await this.get(parseInt(ID));
    geometry = geometry[0];
    if(geometry.type == "Polygon") {
      let arrJobTilesList = [];
      let zoom = geometry.zoom;
      let scaleFactor = requiredZoom - zoom;
      if(requiredZoom - zoom >= 0) {
        scaleFactor = Math.pow(2, scaleFactor);
      }
      else {
        Log.make('warning', "MAIN", "Abort tiles calculation. Required Zoom is same as selected zoom.");
        return false;
      }
      //Init empty polygon coords list
      let polygon = [];
      //For all points in polygon
      for(i = 0; i < geometry.points.length; i++) {
        //Form polygon array
        polygon.push([Math.round(geometry.points[i]['x'] * scaleFactor), Math.round(geometry.points[i]['y'] * scaleFactor)]);
      }
      var startX = Math.floor(geometry.SWx * scaleFactor / 256);
    	var startY = Math.floor(geometry.NEy * scaleFactor / 256);
    	var stopX = Math.ceil(geometry.NEx * scaleFactor / 256);
    	var stopY = Math.ceil(geometry.SWy * scaleFactor / 256);
      //Generate tiles list by polygon bounds
      for(let x = startX; x < stopX; x++) {
        for(let y = startY; y < stopY; y++) {
          //Init tile inside polygon state
          let tileInside = false;
          //Check all 4 corners to be inside polygon
          if(pointInPolygon([ x * 256, y * 256 ], polygon)) {
            //Set tile state inside
            tileInside = true;
          }
          if(pointInPolygon([ x * 256 + 256, y * 256 ], polygon)) {
            //Set tile state inside
            tileInside = true;
          }
          if(pointInPolygon([ x * 256 + 256, y * 256 + 256], polygon)) {
            //Set tile state inside
            tileInside = true;
          }
          if(pointInPolygon([ x * 256, y * 256 + 256], polygon)) {
            //Set tile state inside
            tileInside = true;
          }
          if(tileInside) {
            //?????????????????? ?? ???????????? ???????????????????? ????????????
            arrJobTilesList.push({
              x: parseInt(x),
              y: parseInt(y),
              z: parseInt(requiredZoom),
              response: false,
              map: map
            });
          }

        }
      }
      Log.make("info", "MAIN", `Calculation of tiles list is finished. Total ${arrJobTilesList.length} tiles.`);
      //Return tiles job list
      return arrJobTilesList;
    }
    else {
      Log.make('warning', "MAIN", "Abort tiles calculation. Geometry type isnt Polygon.");
      return false;
    }
  }
}

module.exports = Geometry;
