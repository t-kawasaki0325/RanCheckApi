const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const TOKEN = 'aaaa';
const SITE = 'example.com';

AWS.config.region = 'ap-northeast-1';

const isEmpty = (obj) => Object.keys(obj).length === 0;

const main = async () => {
  const ddb = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: TABLE,
    Key: {
      Token: TOKEN,
      Site: SITE,
    },
  };

  const Result = await new Promise((resolve, reject) => {
    ddb.get(params, (err, data) => {
      if (err) {
        reject({
          code: 500,
          stack: err.stack,
          message: 'データ取得に失敗しました',
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

main();
