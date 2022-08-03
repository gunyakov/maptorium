const express = require('express');
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const jsonfile = require('jsonfile');
const path = 'config.map.js';
//------------------------------------------------------------------------------
//CONFIG: Get map center
//------------------------------------------------------------------------------
router.get('/center', async (req, res) => {
  jsonfile.readFile(path, (err, data) => {
    if (err) {
      res.json({lat: 39, lng: 0, zoom: 5});
    }
    else {
      res.json({lat: data.lat, lng: data.lng, zoom: data.zoom});
    }
  });
});

router.post('/position', async (req, res) => {
  if(typeof req.body.lat == "undefined" || typeof req.body.lng == "undefined" || typeof req.body.zoom == "undefined") {
    res.json({result: false, message: "Error update map center. Data is empty"});
  }
  else {
    jsonfile.writeFile(path, req.body, function (err) {
      if (err) {
        res.json({result: false, message: "Error update map center."});
      }
      else {
        res.json({result: true, message: "Map center updated."});
      }
    });
  }
});


module.exports = router;
