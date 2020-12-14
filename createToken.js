const AWS = require('aws-sdk');

const TABLE = 'Rancheck';

AWS.config.region = 'ap-northeast-1';

const genUuid = () =>
  new Date().getTime().toString(16) +
  Math.floor(1000 * Math.random()).toString(16);

const main = () => {
  const ddb = new AWS.DynamoDB.DocumentClient();

  const uuid = genUuid();
  const params = {
    TableName: TABLE,
    Item: {
      Token: uuid,
    },
  };

  ddb.put(params, (err) => {
    if (err) {
      throw {
        code: 500,
        stack: err.stack,
        message: 'トークンの保存に失敗しました',
      };
    }
  });
};

main();
