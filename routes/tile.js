const express = require('express');
let url = require('url');

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
//------------------------------------------------------------------------------
//HTTP Server: GET request for tiles
//------------------------------------------------------------------------------
router.get(["/"], async function(request, response){
  //Получаем данные из запроса
  let parseReq = url.parse(request.url, true);
  //Получаем данный для загрузки тайлов
  let q = parseReq.query;
  //Переводим все значения в числовые
  q.z = parseInt(q.z);
  q.x = parseInt(q.x);
  q.y = parseInt(q.y);
  switch(q.mode) {
    case "force":
    case "enable":
    case "disable":
      break;
    default:
      q.mode = config.network.state;
      break;
  }
  //Устанавливаем максимальное значение координат тайла
  let maxTileNumber = 1;
  //Изменяем максимальный номер тайла в соответсвии с уровнем увеличения
  for(let i = 1; i <= parseInt(q.z); i++) {
    maxTileNumber = maxTileNumber * 2;
  }
  maxTileNumber--;
  //console.log(maxTileNumber);
  //Если координата тайла превышает максимально возможное значение
  if(q.x > maxTileNumber || q.y > maxTileNumber) {
    Log.error("MAIN", "Tile request. Tile coords is out of max limit");
    //Пишем пустой тайл
    response.writeHead(200, { "Content-Length": 0 });
    response.end('');
  }
  else if(typeof q.map == "undefined") {
    Log.error("MAIN", "Tile request. Map don't set");
    //Пишем пустой тайл
    response.writeHead(200, { "Content-Length": 0 });
    response.end('');
  }
  else {
    Downloader.addTile({
      map: q.map,
      x: q.x,
      y: q.y,
      z: q.z,
      response: response,
      mode: {
        mode: q.mode,
        getFull: true
      }
    });
  }
});

module.exports = router;
