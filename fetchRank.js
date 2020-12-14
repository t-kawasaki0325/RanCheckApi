const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const TOKEN = 'aaaa';

AWS.config.region = 'ap-northeast-1';

const main = async () => {
  const ddb = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: TABLE,
    Key: {
      Token: TOKEN,
    },
  };

  const { Item } = await new Promise((resolve, reject) => {
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
  });

  return Item;
};

main();
