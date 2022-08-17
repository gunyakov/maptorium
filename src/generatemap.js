//------------------------------------------------------------------------------
//Canvas draw for NodeJS
//------------------------------------------------------------------------------
const { createCanvas, Image } = require("canvas");
//Set default tile size
const width = 256;
const height = 256;

//------------------------------------------------------------------------------
//Generate cached map main function
//------------------------------------------------------------------------------
exports.GenerateMap = async function(map, config) {
  config.updateTiles = (typeof config.updateTiles === "string") ? (config.updateTiles.toLowerCase() === "true") : config.updateTiles;
  config.completeTiles = (typeof config.completeTiles === "string") ? (config.completeTiles.toLowerCase() === "true") : config.completeTiles;

  stat.generate.skip = 0;
  stat.generate.procesed = 0;
  stat.generate.total = arrJobTilesGenerateList.length;

  for(let i = 0; i < arrJobTilesGenerateList.length; i++) {
    stat.generate.procesed++;
    //If disable to update tiles
    if(!config.updateTiles) {
      //Check tile in DB
      let checkTile = await map.checkTile(arrJobTilesGenerateList[i]['z'], arrJobTilesGenerateList[i]['x'], arrJobTilesGenerateList[i]['y']);
      //If tile present ant tile size more than 0 skip generate this tile
      if(checkTile && checkTile.s > 0) {
        stat.generate.skip++;
        continue;
      }
    }

    let x = arrJobTilesGenerateList[i]['x'] * 2;
    let y = arrJobTilesGenerateList[i]['y'] * 2;
    let z = arrJobTilesGenerateList[i]['z'] + 1;

    //Create tile
    const canvas = createCanvas(width, height);
    //Get tile draw content
    const ctx = canvas.getContext('2d');
    //Fill tile with white color
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fillRect(0, 0, width, height);
    //Generate list of 4 tiles from lover zoom
    let tilesList = [
      {x: x, y: y, drawX: 0, drawY: 0},
      {x: x + 1, y: y, drawX: width / 2, drawY: 0},
      {x: x, y: y + 1, drawX: 0, drawY: height / 2},
      {x: x + 1, y: y + 1, drawX: width / 2, drawY: height / 2}
    ];
    //Go throughtout tiles list
    for(let a = 0; a < tilesList.length; a++) {
      //Get tile from lover zoom
      let tile = await map.checkTile(z, tilesList[a]['x'], tilesList[a]['y']);
      //If tile exist
      if(tile && tile.s > 0) {
        //create image instance
        let img = new Image();
        //Convert tile blob to nodejs buffer

        //Create image from buffer
        img.src = tile.b;
        //Draw lower tile to curent tile
        ctx.drawImage(img, tilesList[a]['drawX'], tilesList[a]['drawY'], width / 2, height / 2);
      }
      //If tile missing
      else {
        //If save only full tiles skip generate of this tile
        if(config.fullTile) continue;
      }
    }
    let newTile = {
      data: canvas.toBuffer()
    }

    newTile.byteLength = Buffer.byteLength(newTile.data);
    await map.saveTile(arrJobTilesGenerateList[i]['z'], arrJobTilesGenerateList[i]['x'], arrJobTilesGenerateList[i]['y'], newTile);
    //Release resources for other tasks
    await wait(10);
  }
  console.log("finish");
  arrJobTilesGenerateList = [];
  return true;

}
