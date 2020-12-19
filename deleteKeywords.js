const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const TOKEN = 'aaaa';
const KEYWORDS = ['2'];
const SITE = 'memorandumrail.com';

AWS.config.region = 'ap-northeast-1';

const isEmpty = (obj) => Object.keys(obj).length === 0;

const fetch = async (ddb, token, site) => {
  const params = {
    TableName: TABLE,
    Key: {
      Token: token,
      Site: site,
    },
  };

  const Result = await new Promise((resolve, reject) => {
    ddb.get(params, (err, data) => {
      if (err) {
        reject({
          code: 500,
          stack: err.stack,
          message: 'データ削除に失敗しました',
        });
      } else {
        resolve(data);
      }
    });
  }).catch((err) => err);

  if (isEmpty(Result)) {
    return {
      code: 401,
      message: 'トークンが不正です',
    };
  }
  if (!Result.Item) {
    return Result;
  }
  return Result.Item;
};

const put = (ddb, prevItems, token, site, keywords) => {
  const params = {
    TableName: TABLE,
    Item: {
      Token: token,
      Site: site,
      Result: Object.assign(
        {},
        Object.keys(prevItems).filter((keyword) => !keywords.includes(keyword))
      ),
    },
  };

  ddb.put(params, (err) => {
    if (err) {
      throw {
        code: 500,
        stack: err.stack,
        message: '保存に失敗しました',
      };
    }
  });
};

const main = async () => {
  const token = TOKEN;
  const site = SITE;
  const keywords = KEYWORDS;

  const ddb = new AWS.DynamoDB.DocumentClient();

  const item = await fetch(ddb, token, site);
  if (!item.Result) {
    return item;
  }

  put(ddb, item.Result, token, site, keywords);
};

main();
