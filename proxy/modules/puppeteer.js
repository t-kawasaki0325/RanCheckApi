const puppeteer = require('puppeteer');

const URL = 'https://google.co.jp/search?q=';
const baseResponse = {
  title: '',
  url: '',
  rank: '',
};
const selectorList = ['.rc > div > a:not([class])', '.yuRUbf a:not([class])'];

const sleep = async () => {
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, 2000)
  );
};

const doRequest = async (page, keywords, site) => {
  const results = {};
  for (keyword of keywords) {
    await page
      .goto(URL + `${keyword}&num=100`, {
        waitUntil: 'networkidle2',
      })
      .catch((e) => {
        throw { code: 500, message: 'ページのアクセスに失敗しました' };
      });
    const res = await page
      .evaluate((selectorList) => {
        const selector = selectorList.find(
          (v) => document.querySelectorAll(v).length !== 0
        );
        return Array.from(document.querySelectorAll(selector)).map(
          (element, index) => ({
            title: element.querySelector('h3 span').textContent,
            url: element.href,
            rank: index + 1,
          })
        );
      }, selectorList)
      .catch((e) => {
        throw { code: 500, message: '要素の取得に失敗しました' };
      });
    results[keyword] = res.find((v) => v.url.includes(site)) || baseResponse;

    sleep();
  }
  return results;
};

module.exports = async ({ keywords, site }) => {
  if (!keywords || !site) {
    throw { code: 500, message: 'リクエストが不正です' };
  }

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

    return await doRequest(page, keywords, site);
  } finally {
    await browser.close();
  }
};
