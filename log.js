//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Color console
//------------------------------------------------------------------------------
let colors = require('colors');

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

    this.arrLog[type].push(message);
    if(config.log[module][type]) {
      if(type == "info") {
        console.log(colors.green(new Date().toLocaleString("en-GB")), colors.green.bold(type.toUpperCase()), colors.green.bold(module.toUpperCase()), colors.green(message));
      }
      if(type == "error") {
        console.log(colors.red(new Date().toLocaleString("en-GB")), colors.red.bold(type.toUpperCase()), colors.red.bold(module.toUpperCase()), colors.red(message));
      }
    }
  }

}
module.exports = Log;
