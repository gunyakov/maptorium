let config = {
  //Service
  service: {
    //Listen port
    port: 9000,
    //Threads for http request
    threads: 4,
    //Use tor or not
    tor: false
  },
  //Request for mass tile download
  request: {
    delay: 200
  },
  db: {
    //Prevent write in DB any tiles in any mode
    ReadOnly: false,
    //Idle time to close DB file if idle
    OpenTime: 15
  },
  network: {
    state: "enable"
  },
  tor: {
    host: '10.200.33.97',
    port: 8080
  },
  //----------------------------------------------------------------------------
  //Log service
  //----------------------------------------------------------------------------
  log: {
    //How many entries keep in logs
    length: 20,
    DB: {
      info: false,
      error: true
    },
    MAP: {
      info: true,
      error: true
    },
    SQLITE3: {
      info: false,
      error: true
    },
    HTTP: {
      info: true,
      error: true
    },
    GPS: {
      info: true,
      error: true
    },
    MAIN: {
      info: true,
      error: true
    }
  }
};

module.exports = config;
