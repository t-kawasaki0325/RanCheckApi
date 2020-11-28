const puppeteer = require('puppeteer');

const URL = 'https://google.co.jp/search?q=';
const SELECTOR = '.rc > div > a:not([class])';

const sleep = async () => {
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, 2000)
  );
};

const doRequest = async (page, keywords) => {
  const results = {};
  for (keyword of keywords) {
    await page
      .goto(URL + `${keyword}&num=100`, {
        waitUntil: 'networkidle2',
      })
      .catch((e) => {
        throw { code: 500 };
      });
    const result = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll(SELECTOR)).map(
          (element, index) => ({
            title: element.querySelector('h3 span').textContent,
            url: element.href,
            rank: index + 1,
          })
        )
      )
      .catch((e) => {
        throw { code: 500 };
      });
    results[keyword] = result;

    sleep();
  }
  return results;
};

module.exports = async (keywords) => {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '-–disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      ['images', 'stylesheet', 'font'].includes(request.resourceType())
        ? request.abort()
        : request.continue();
    });

    return await doRequest(page, keywords);
  } finally {
    await browser.close();
  }
};
