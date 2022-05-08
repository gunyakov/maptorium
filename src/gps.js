//------------------------------------------------------------------------------
//HTTP Engine
//------------------------------------------------------------------------------
let httpEngine = require(__dirname + "/http-engine.js");
//------------------------------------------------------------------------------
//Logging service
//------------------------------------------------------------------------------
let log = require(__dirname + "/log.js");
const Log = new log();
//------------------------------------------------------------------------------
//Geometry handler
//------------------------------------------------------------------------------
let geometry = require(__dirname + "/geometry");
const Geometry = new geometry();
//------------------------------------------------------------------------------
//Wait function
//------------------------------------------------------------------------------
let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
class GPS {

  constructor(io = false, db = false){
    this.io = io;
    this.callback = false;
    this.start();
  }

  async on(callback) {
    this.callback = callback
  }
  //----------------------------------------------------------------------------
  //Start GPS service function
  //----------------------------------------------------------------------------
  async start() {
    this.enable = true;
    Log.make("info", "GPS", "GPS service started.");
    this.service();
  }
  //----------------------------------------------------------------------------
  //Stop GPS service function
  //----------------------------------------------------------------------------
  async stop() {
    this.enable = false;
    Log.make("info", "GPS", "GPS service stoped.");
  }
  //----------------------------------------------------------------------------
  //Service function to get GPS coords from server constantly
  //----------------------------------------------------------------------------
  async service() {
    while(this.enable) {
      let gpsData = await httpEngine.get("http://192.168.1.110:8080/SDBnet/online/live/fetchLive", "json", true, "get", "", "JSESSIONID=2206FC81F0525B2E3900904237975B28");
      if(gpsData.data) {
        let lng = gpsData.data['lon_decimal'];
        let lat = gpsData.data['lat_decimal'];
        await Geometry.routeAddPoint(lat, lng);
        Log.make("success", "GPS", "GPS data updated.");
        if(this.callback) {
          this.callback(gpsData.data);
        }
        if(this.io) {
          this.io.emit("gpsData", gpsData.data);
		  Log.make("success", "GPS", "GPS send to user.");
        }
      }
      await wait(60000);
    }
  }
}

module.exports = GPS;
