const express = require('express');
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
//------------------------------------------------------------------------------
//MARKS: Get category list
//------------------------------------------------------------------------------
router.get('/category', async (req, res) => {
  let categoryList = await POI.categoryList();
  if(categoryList) {
    categoryList['result'] = true;
    res.json({result: true, list: categoryList});
  }
  else {
    res.json({result: false, message: "Category list empty."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Add category to DB
//------------------------------------------------------------------------------
router.post("/category/add", async (req, res) => {
  let result = await POI.categoryAdd(req.body.name, req.body.parentID);
  if(result) {
    res.json({result: true, message: "Category was inserted in DB."});
  }
  else {
    res.json({result: false, message: "Some error to add Category to DB."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Get info about mark
//------------------------------------------------------------------------------
router.get('/info/:markID', async (req, res) => {
  let marks = await POI.get(req.params.markID);
  if(marks) {
    marks = marks[0];
    marks.result = true;
    res.json(marks);
  }
  else {
    res.json({result: false, message: "No data about mark in DB."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Update info about mark
//------------------------------------------------------------------------------
router.post('/update', async (req, res) => {
  let data = JSON.parse(req.body.data);
  //console.log(data);
  let result = false;
  if(data.update) {
    result = await POI.update(data);
  }
  else {
    result = await POI.update(data, true);
  }
  if (result) {
    res.json({result: true, message: "Mark was updated."});
  }
  else {
    res.json({result: false, message: "Fail to update mark. Check error log to find error."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Get marks list of specific category
//------------------------------------------------------------------------------
router.get('/list/:categoryID', async (req, res) => {
  let poi = await POI.get(0, req.params.categoryID);
  if(poi) {
    res.json({result: true, list: poi});
  }
  else {
    res.json({result: false, message: "Category is empty."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Get full marks list
//------------------------------------------------------------------------------
router.get('/', async (req, res) => {
  let poi = await POI.get();
  if(poi) {
    res.json({result: true, list: poi});
  }
  else {
    res.json({result: false, message: "Category is empty."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Delete from DB
//------------------------------------------------------------------------------
router.post('/delete', async (req, res) => {
  await POI.delete(req.body.markID);
  res.json({result: true, message: "Mark was deleted from map."});
});
//------------------------------------------------------------------------------
//MARKS: Add to DB
//------------------------------------------------------------------------------
router.post("/add", async (req, res) => {
  if(req.body.data) {
    let data = JSON.parse(req.body.data);
    let result = await POI.save(data);
    if(result) {
      res.json({result: true, markID: result});
    }
    else {
      res.json({result: false, message: "Error to add mark to DB."});
    }
  }
  else {
    res.json({result: false, message: "Empty data sended to server."});
  }
});

module.exports = router;
