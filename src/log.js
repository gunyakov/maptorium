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
      'error': [],
      'warning': [],
      'success': []
    }
  }

  async make(type, module,  message) {
    if(type != "info" && type != "error" && type != "warning" && type != "success") {
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
      //Show success message
      if(type == "success") {
        console.log(colors.green(new Date().toLocaleString("en-GB")), colors.green.bold(type.toUpperCase()), colors.green.bold(module.toUpperCase()), colors.green(message));
      }
      //Show error message
      if(type == "error") {
        console.log(colors.red(new Date().toLocaleString("en-GB")), colors.red.bold(type.toUpperCase()), colors.red.bold(module.toUpperCase()), colors.red(message));
      }
      //Show error message
      if(type == "warning") {
        console.log(colors.yellow(new Date().toLocaleString("en-GB")), colors.yellow.bold(type.toUpperCase()), colors.yellow.bold(module.toUpperCase()), colors.yellow(message));
      }
      //Show info message
      if(type == "info") {
        console.log(colors.blue(new Date().toLocaleString("en-GB")), colors.blue.bold(type.toUpperCase()), colors.blue.bold(module.toUpperCase()), colors.blue(message));
      }
      //Call callback, if registered
      if(IO) {
        let logData = {
          type: type,
          module: module,
          message: message
        }
        IO.emit("log", logData);
      }
    }
  }
  //Return log list
  async get() {
    return this.arrLog;
  }
}
module.exports = Log;
