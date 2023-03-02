//------------------------------------------------------------------------------
//HTTP Engine
//------------------------------------------------------------------------------
let httpEngine = require("./http-engine.js");
//------------------------------------------------------------------------------
//General map handler
//------------------------------------------------------------------------------
class GPS {

  constructor(){
    this.callback = false;
    this.lastLng = 0;
    this.lastLat = 0;
    this.enable = false;
    this.record = true;
    this.sampleRateTime = 60000;
    //this.start();
  }

  async on(callback) {
    this.callback = callback
  }
  //----------------------------------------------------------------------------
  //Start GPS service function
  //----------------------------------------------------------------------------
  async start() {
    this.enable = true;
    Log.info("GPS", "GPS service started.");
    this.service();
  }
  //----------------------------------------------------------------------------
  //Stop GPS service function
  //----------------------------------------------------------------------------
  async stop() {
    this.enable = false;
    Log.info("GPS", "GPS service stoped.");
  }
  //----------------------------------------------------------------------------
  //Change sample rate time
  //----------------------------------------------------------------------------
  async sampleRate(rate = 60) {
    if(typeof rate == "number") {
      this.sampleRateTime = rate * 1000;
      Log.info("GPS", `Sample rate changed to ${rate} seconds.`);
      return true;
    }
    else {
      return false;
    }
  }
  //----------------------------------------------------------------------------
  //Toggle GPS Service state
  //----------------------------------------------------------------------------
  async toggle() {
    if(this.enable) {
      await this.stop();
    }
    else {
      await this.start();
    }
    return this.enable;
  }
  //----------------------------------------------------------------------------
  //Toggle gps record state
  //----------------------------------------------------------------------------
  async recordService() {
    this.record = !this.record;
    return this.record;
  }
  //----------------------------------------------------------------------------
  //Service function to get GPS coords from server constantly
  //----------------------------------------------------------------------------
  async service() {
    //Run cycle while service enabled
    while(this.enable) {
      //Get data from JSON server
      let gpsData = await httpEngine.get("http://192.168.1.110:8080/SDBnet/online/live/fetchLive", config, "json", true, "get", "", "JSESSIONID=2206FC81F0525B2E3900904237975B28");
      //If server return proper responce
      if(gpsData.data) {
        //Get Coords from JSON responce
        let lng = gpsData.data['lon_decimal'];
        let lat = gpsData.data['lat_decimal'];
        //If coords is different from last update and record enabled
        if((this.lastLng != lng || this.lastLat != lat) && this.record) {
          //Add coords to database
          await POI.routeAddPoint(lat, lng);
          //Make log
          Log.success("GPS", "GPS data recorded.");
        }
        //Save current coords into class vars
        this.lastLat = lat;
        this.lastLng = lng;
        //Call callback, if registered
        if(this.callback) {
          this.callback(gpsData.data);
        }
        //Send data to user, if any connected
        if(IO) {
          await IO.emit("gpsData", gpsData.data);
          Log.success("GPS", "GPS send to user.");
        }
      }
      await wait(this.sampleRateTime);
    }
  }
}

module.exports = new GPS();
