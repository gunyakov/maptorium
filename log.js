//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Color console
//------------------------------------------------------------------------------
let colors = require('colors');
//------------------------------------------------------------------------------
//Handle logs
//------------------------------------------------------------------------------
class Log {
  constructor() {
    this.arrLog = {
      'info': [],
      'error': []
    }
  }

  async make(type, module,  message) {
    if(type != "info" && type != "error") {
      type = "info";
    }
    //If entries counter more than set in config
    if(this.arrLog[type].length > config.log.length) {
      //Delete first entry from log
      this.arrLog[type].shift();
    }
    //Add new entry to the end of log
    this.arrLog[type].push(message);
    //If eneble display such type of mesage in block
    if(config.log[module][type]) {
      //Show info message
      if(type == "info") {
        console.log(colors.green(new Date().toLocaleString("en-GB")), colors.green.bold(type.toUpperCase()), colors.green.bold(module.toUpperCase()), colors.green(message));
      }
      //Show error message
      if(type == "error") {
        console.log(colors.red(new Date().toLocaleString("en-GB")), colors.red.bold(type.toUpperCase()), colors.red.bold(module.toUpperCase()), colors.red(message));
      }
    }
  }
  //Return log list
  async get() {
    return this.arrLog;
  }
}
module.exports = Log;
