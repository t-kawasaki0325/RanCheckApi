const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const PLAN = {
  BETA: 10,
};

AWS.config.region = 'ap-northeast-1';

const genUuid = () =>
  new Date().getTime().toString(16) +
  Math.floor(1000 * Math.random()).toString(16);

const zeroPadding = (num, length) => `${num}`.padStart(length, '0');

const getDate = () => {
  const date = new Date();
  return `${date.getFullYear()}/${zeroPadding(
    date.getMonth() + 1,
    2
  )}/${zeroPadding(date.getDate(), 2)}`;
};

// TODO: プランを分けるなら引数をもとに算出
const getExpireDate = () => {
  const date = new Date();
  return `${date.getFullYear() + 1}/${zeroPadding(
    date.getMonth() + 1,
    2
  )}/${zeroPadding(date.getDate(), 2)}`;
};

const save = async (ddb) => {
  const uuid = genUuid();
  const params = {
    TableName: TABLE,
    Item: {
      Token: uuid,
      Site: 'example.com',
      Result: {},
      Plan: PLAN.BETA,
      CreatedAt: getDate(),
      ExpiredAt: getExpireDate(),
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

// this.handler();
