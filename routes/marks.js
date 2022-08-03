const express = require('express');
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
//------------------------------------------------------------------------------
//MARKS: Get category list
//------------------------------------------------------------------------------
router.get('/category', async (req, res) => {
  let categoryList = await GEOMETRY.categoryList();
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
  let result = await GEOMETRY.categoryAdd(req.body.name, req.body.parentID);
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
  let marks = await GEOMETRY.get(req.params.markID);
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
  let result = await GEOMETRY.update(req.body);
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
  let geometry = await GEOMETRY.get(0, req.params.categoryID);
  if(geometry) {
    res.json({result: true, list: geometry});
  }
  else {
    res.json({result: false, message: "Category is empty."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Get full marks list
//------------------------------------------------------------------------------
router.get('/', async (req, res) => {
  let geometry = await GEOMETRY.get();
  if(geometry) {
    res.json({result: true, list: geometry});
  }
  else {
    res.json({result: false, message: "Category is empty."});
  }
});
//------------------------------------------------------------------------------
//MARKS: Delete from DB
//------------------------------------------------------------------------------
router.post('/delete', async (req, res) => {
  await GEOMETRY.delete(req.body.markID);
  res.json({result: true, message: "Mark was deleted from map."});
});
module.exports = router;
