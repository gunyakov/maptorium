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
  storPath: "./maps/",
  db: {
    openTime: 15,
    checkForError: true,
    onlyCheck: false
  },
  network: {
    state: "enable"
  },
  dbTimeOpen: 15,
  checkDBForError: true,
  onlyDBCheck: false,
  logLength: 20,
  tor: {
    host: '10.200.33.97',
    port: 8080
  },
  log: {
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
