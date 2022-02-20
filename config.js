let config = {
  //Service
  service: {
    //Listen port
    port: 9000,
    //Threads for http request
    threads: 4,
  },
  //Request for mass tile download
  request: {
    delay: 0,
    //Milliseconds
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0'
  },
  db: {
    //Prevent write in DB any tiles in any mode
    ReadOnly: false,
    //Idle time in seconds to close DB file if idle
    OpenTime: 15
  },
  network: {
    //(enable, disable, force)
    state: "enable"
  },
  proxy: {
    //Use proxy or not (true or false)
    enable: true,
    //Enable tor change ID
    tor: true,
    //Type of proxy(socks, socks4, socks5, http, https)
    protocol: "http",
    //Host can be IP or domain
    host: '127.0.0.1',
    //Port
    port: 8999,
    auth: {
      username: '',
      password: '',
      tor: {
        HashedControlPassword: "16:872860B76453A77D60CA2BB8C1A7042072093276A3D701AD684053EC4C",
        ControlPort: 9051
      }
    }
  },
  //----------------------------------------------------------------------------
  //Log service
  //----------------------------------------------------------------------------
  log: {
    //How many entries keep in logs
    length: 20,
    DB: {
      success: true,
      info: true,
      error: true,
      warning: true
    },
    MAP: {
      success: true,
      info: true,
      error: true,
      warning: true
    },
    SQLITE3: {
      success: true,
      info: false,
      error: true,
      warning: true
    },
    HTTP: {
      success: true,
      info: false,
      error: true,
      warning: true
    },
    GPS: {
      success: true,
      info: true,
      error: true,
      warning: true
    },
    MAIN: {
      success: true,
      info: true,
      error: true,
      warning: true
    }
  }
};

module.exports = config;
