const express = require('express');
const puppeteer = require('../modules/puppeteer');
const router = express.Router();

router.post('/', async (req, res) => {
  const { keywords } = req.body;
  const result = await puppeteer(keywords);
  res.send(result);
});

module.exports = router;
