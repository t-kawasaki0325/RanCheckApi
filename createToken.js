const AWS = require('aws-sdk');

const TABLE = 'Rancheck';

AWS.config.region = 'ap-northeast-1';

const genUuid = () =>
  new Date().getTime().toString(16) +
  Math.floor(1000 * Math.random()).toString(16);

const save = async (ddb) => {
  const uuid = genUuid();
  const params = {
    TableName: TABLE,
    Item: {
      Token: uuid,
      Site: 'example.com',
    },
  };

  return new Promise((resolve, reject) =>
    ddb.put(params, (err) => {
      if (err) {
        reject();
        return;
      }
      resolve(uuid);
    })
  );
};

exports.handler = async () => {
  const ddb = new AWS.DynamoDB.DocumentClient();

  return await save(ddb)
    .then((data) => ({
      code: 200,
      body: {
        token: data,
      },
    }))
    .catch(() => ({
      code: 500,
      message: 'トークンの保存に失敗しました',
    }));
};

this.handler();
