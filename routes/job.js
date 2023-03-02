const express = require('express');
const router = express.Router();
const crypto = require("crypto");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
//------------------------------------------------------------------------------
//HTTP Server: Request to get jobs list
//------------------------------------------------------------------------------
router.post("/list", async function(req, res) {
  let jobList = await Downloader.getJobsList();
  res.json({result: true, list: jobList});
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
  let jobList = await Downloader.addJob(jobConfig);
  res.json({result: true, list: jobList});
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
  let jobsList = [];
  switch (data.mode) {
    case "delete":
      jobsList = await Downloader.jobDelete(data.ID);
      res.json({result: true, message: "Job was deleted from list.", list: jobsList});
      break;
    case "up":
      jobsList = await Downloader.jobUP(data.ID);
      res.json({result: true,message: "Job was moved up.", list: jobsList});
      break;
    case "down":
      jobsList = await Downloader.jobDown(data.ID);
      res.json({result: true,message: "Job was moved down.", list: jobsList});
      break;
    default:
      res.json({result: false, message: "Manage mode for job is wrong."});
      break;
  }
});

module.exports = router;
