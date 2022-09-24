const express = require('express');
const router = express.Router();
const crypto = require("crypto");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const {arrayMoveImmutable} = import('array-move');
//------------------------------------------------------------------------------
//HTTP Server: Request to get jobs list
//------------------------------------------------------------------------------
router.post("/list", async function(req, res) {
  res.json({result: true, list: arrJobList});
});
//------------------------------------------------------------------------------
//HTTP Server: Request to download job
//------------------------------------------------------------------------------
router.post("/add", async function(req, res){
  //Получаем данный для загрузки тайлов
  let jobConfig = JSON.parse(req.body.data);
  //Push job order to list
  jobConfig.running = false;
  jobConfig.mode = config.network.state;
  jobConfig.ID = crypto.randomBytes(16).toString("hex");
  arrJobList.push(jobConfig);
  res.json({result: true, list: arrJobList});
});
//------------------------------------------------------------------------------
//HTTP Server: Request to generate map job
//------------------------------------------------------------------------------
router.post("/generate", async function(req, res){
  //Получаем данный для загрузки тайлов
  let jobConfig = JSON.parse(req.body.data);
  //Push job order to list
  jobConfig.running = false;
  arrJobGenerateList.push(jobConfig);
  res.json({result: true, message: "Generate job added/started."});
});

router.post("/manage", async (req, res) => {
  let data = JSON.parse(req.body.data);
  switch (data.mode) {
    case "delete":
      for(let i = 0; i < arrJobList.length; i++) {
        if(arrJobList[i]['ID'] == data.ID) {
          arrJobList.splice(i, 1);
          break;
        }
      }
      if(currentJob.ID == data.ID) {
        arrJobTilesList = [];
      }
      res.json({result: true,message: "Job was deleted from list.", list: arrJobList});
      break;
    case "up":
      for(let i = 0; i < arrJobList.length; i++) {
        if(arrJobList[i]['ID'] == data.ID) {
          arrJobList = arrayMoveImmutable(arrJobList, i, i - 1);
        }
      }
      res.json({result: true,message: "Job was moved up.", list: arrJobList});
      break;
    case "down":
      for(let i = 0; i < arrJobList.length; i++) {
        if(arrJobList[i]['ID'] == data.ID) {
          arrJobList = arrayMoveImmutable(arrJobList, i, i + 1);
        }
      }
      res.json({result: true,message: "Job was moved down.", list: arrJobList});
      break;
    default:
      res.json({result: false, message: "Manage mode for job is wrong."});
      break;
  }
});

module.exports = router;
