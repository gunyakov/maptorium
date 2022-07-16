//------------------------------------------------------------------------------
//Canvas draw for NodeJS
//------------------------------------------------------------------------------
const { createCanvas } = require("canvas");
//Set default tile size
const width = 256;
const height = 256;
var fs = require('fs');
//------------------------------------------------------------------------------
//MD5 to hashed tile names
//------------------------------------------------------------------------------
const md5 = require('md5');
//------------------------------------------------------------------------------
//Generate cached map main function
//------------------------------------------------------------------------------
exports.generateMap = async function(cachedMap) {
  let tiles = cachedMap.tiles;

  let tileCachedMap = {};
  let i = 0;
  //Colors list for tile types
  let colors = {
    missing: "rgba(0, 0, 0, 0.5)",
    empty: "rgba(255, 0, 0, 0.5)",
    present: "rgba(0, 255, 0, 0.5)"
  }
  //----------------------------------------------------------------------------
  //Generate standart tiles by color (size 256x256) to reduce memory usage
  //----------------------------------------------------------------------------
  for (let [key, value] of Object.entries(colors)) {
    let canvas = createCanvas(width, height);
    //Get canvas content
    let context = canvas.getContext("2d");
    context.fillStyle = value;
    context.fillRect(0, 0, 256, 256);
    tileCachedMap[key] = canvas;
  }
  for (let [key, value] of Object.entries(tiles)) {
    for(let z = cachedMap.zoom; z > 7; z--) {
      //Calculate scale factor to draw tile
      let scaleFactor = Math.pow(2, Math.abs(cachedMap.zoom - z));
      let x = Math.floor(value.x / scaleFactor);
      let y = Math.floor(value.y / scaleFactor);

      let tileName = md5('' + z + x + y);
      //If tile is current zoom tile
      if(scaleFactor == 1) {
        //Make link to standart tile
        tileCachedMap[tileName] = value.state;
      }
      //If scale factor less 256 mean tile size on curent tile is more than 1 px
      else if(scaleFactor < 256) {
        let context = '';
        let canvas = "";
        //Check if tile of this zoom and size is missing in array
        if(typeof tileCachedMap[tileName] === "undefined") {
          //Create canvas
          canvas = createCanvas(width, height);
        }
        //If tile is present in array
        else {
          canvas = tileCachedMap[tileName];
        }
        //Get canvas content
        context = canvas.getContext("2d");
        //Set rectangular colors depend tile state
        context.fillStyle = colors[value.state];
        let coordStep = 256 / scaleFactor;
        //Draw tile state rect inside canvas tile
        let canvasX = (value.x / scaleFactor - Math.floor(value.x / scaleFactor)) * scaleFactor * coordStep;
        let canvasY = (value.y / scaleFactor - Math.floor(value.y / scaleFactor)) * scaleFactor * coordStep;
        context.fillRect(canvasX, canvasY, coordStep, coordStep);
        //Save canvas content
        tileCachedMap[tileName] = canvas;
      }
    }
  }
  for (let [key, value] of Object.entries(tileCachedMap)) {
    //If tile isnt link to standart tile
    if(tileCachedMap[key] != "empty" && tileCachedMap[key] != "missing" && tileCachedMap[key] != "present") {
      //Get canvas
      let canvas = tileCachedMap[key];
      //Convert canvas to PNG image
      tileCachedMap[key] = canvas.toBuffer("image/png");
    }
  }
  //Return full cached map tile array
  return tileCachedMap;
}
