const express = require('express');

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/list', async (req, res) => {
  jsonfile.readFile(path, (err, data) => {
    if (err) {
      res.json({lat: 39, lng: 0, zoom: 5, map: "googlesat"});
    }
    else {
      res.json(data);
    }
  });
});


module.exports = router;
