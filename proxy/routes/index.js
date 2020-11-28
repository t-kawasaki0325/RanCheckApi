const express = require('express');
const puppeteer = require('../modules/puppeteer');
const router = express.Router();

router.post('/', async (req, res) => {
  puppeteer(req.body)
    .then((result) => res.status(200).send(result))
    .catch((error) => res.status(500).send(error));
});

module.exports = router;
