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
  storPath: "./maps/google",
  dbTimeOpen: 15,
  checkDBForError: true,
  onlyDBCheck: false,
  logLength: 20,
  tor: {
    host: '10.200.33.97',
    port: 8080
  }
};

module.exports = config;
