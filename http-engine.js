//------------------------------------------------------------------------------
//Config
//------------------------------------------------------------------------------
let config = require('./config');
//------------------------------------------------------------------------------
//Axios
//------------------------------------------------------------------------------
let axios = require("axios");
//------------------------------------------------------------------------------
//Log
//------------------------------------------------------------------------------
let log = require('./log.js');
let Log = new log();
//------------------------------------------------------------------------------
//Socks Proxy Agent Generator
//------------------------------------------------------------------------------
const SocksProxyAgent = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
//------------------------------------------------------------------------------
//ТОР
//------------------------------------------------------------------------------
let tor = require("./tor");
let TorService = new tor();
//------------------------------------------------------------------------------
//HTTP GET request
//------------------------------------------------------------------------------
exports.get = async function(url, responseType = 'text') {
  return new Promise(function(resolve, reject) {
    //If proxy enable
    let httpsAgent = {};
    if(config.proxy.enable) {
      let proxyOptions = "";
      if(config.proxy.auth.username && config.proxy.auth.password) {
        proxyOptions = `${config.proxy.protocol}://${config.proxy.auth.username}:${config.proxy.auth.password}@${config.proxy.host}:${config.proxy.port}`;
      }
      else {
        proxyOptions = `${config.proxy.protocol}://${config.proxy.host}:${config.proxy.port}`;
      }
      switch (config.proxy.protocol) {
        case "socks":
        case "socks4":
        case "socks5":
          httpsAgent = new SocksProxyAgent(proxyOptions);
          break;
        case "http":
        case "https":
        default:
          httpsAgent = new HttpsProxyAgent(proxyOptions);
          break
      }
      //Generate axios config with proxy config
      axiosConfig = {
        method: "get",
        url: url,
        httpsAgent,
        timeout: config.request.timeout,
        responseType: responseType,
        decompress: false,
      }
    }
    else {
      //Generate axios config
      axiosConfig = {
        method: "get",
        url: url,
        timeout: config.request.timeout,
        responseType: responseType,
        decompress: false,
      }
    }
    axiosConfig.headers = {'User-Agent': config.request.userAgent};
    //If network state is enable
    if(config.network.state != "disable") {
      //Try to get urls
      axios(axiosConfig).then(async function (response) {
        //Show message
        Log.make("info", "HTTP", axiosConfig.url);
        //Return data from url
        resolve(response);
      }).catch(async function (error) {
        //Show error message
        if(error.response) {
          //Show error message
          switch (error.response.status) {
            case 404:
              Log.make("warning", "HTTP", error.response.status + " " + error.response.statusText);
              resolve(404);
              break;
            case 403:
              //If proxy type is TOR
              if(config.proxy.tor && config.proxy.enable) {
                //Try to change TOR ID
                await TorService.reset().catch((error) => { Log.make("error", "HTTP", error) });
              }
            default:
              Log.make("error", "HTTP", error.response.status + " " + error.response.statusText);
          }
        }
        else if(error.code == "ECONNREFUSED") {
          Log.make("error", "HTTP", "Proxy Error. Connection refused.");
        }
        else if(error.code == "ECONNABORTED") {
          Log.make("error", "HTTP", `Conection time out exceeded ${config.request.timeout}`);
        }
        else if(error.code = "ECONNRESET") {
          Log.make("error", "HTTP", 'Socket disconected before secure TLS connection was established.');
        }
        else {
          Log.make("error", "HTTP", error);
        }
        //Return false
        resolve(false);
      });
    }
    //If network state is disable
    else {
      //Show error message
      Log.make("error", "HTTP", "Network disabled " + axiosConfig.url);
      //Return false
      resolve(false);
    }
  });
}

exports.checkProxy = async function() {
  (async() => {
    if(config.proxy.enable) {
      const cheerio = require('cheerio');
      let data = await this.get("https://2ip.ru/");
      let proxyReqIP = "";
      let nonProxyReqIP = "";
      let $  = "";
      if(data) {
        $ = cheerio.load(data.data);
        proxyReqIP = $(".ip span").html();
      }
      config.proxy.enable = false;
      data = await this.get("https://2ip.ru/");
      if(data) {
        $ = cheerio.load(data.data);
        nonProxyReqIP = $(".ip span").html();
      }
      config.proxy.enable = true;
      if(proxyReqIP == nonProxyReqIP && proxyReqIP != "" && typeof proxyReqIP != "undefined") {
        Log.make("info", "MAIN", `Proxy isn't working. Real IP ${nonProxyReqIP}. Proxy IP ${proxyReqIP}`);
      }
      else {
        Log.make("info", "MAIN", `Proxy is working. Real IP ${nonProxyReqIP}. Proxy IP ${proxyReqIP}`);
      }
    }
  })();
}