const config = require("./config.js");
let Promise = require("bluebird");
let axios = require("axios");
let log = require('./log.js');
let Log = new log();

exports.get = function(url, responseType = 'text') {
  return new Promise(function(resolve, reject) {
    let axiosConfig = {
      method: 'get',
      url: url,
      headers: {

      },
      timeout: config.httpTimeOut,
      responseType: responseType,
      decompress: false
    }
    if(config.proxyEnabled) {
      axiosConfig.proxy = {
        protocol: 'http',
        host: config.proxy.host,
        port: config.proxy.port
      }
    }
    if(config.networkState != "disable") {
      axios(axiosConfig).then(function (response) {
        Log.make("info", "HTTP", axiosConfig.url);
        resolve(response);
      }).catch(function (error) {
        //Log.make("error", "HTTP", error);
        reject(false);
      });
    }
    else {
      Log.make("error", "HTTP", "Network disabled " + axiosConfig.url);
      reject(false);
    }

  });
}
