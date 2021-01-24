const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const DEFAULT_SITE = 'example.com';

AWS.config.region = 'ap-northeast-1';

const isEmpty = (obj) => Object.keys(obj).length === 0;

const zeroPadding = (num, length) => `${num}`.padStart(length, '0');

const getDate = () => {
  const date = new Date();
  return `${date.getFullYear()}/${zeroPadding(
    date.getMonth() + 1,
    2
  )}/${zeroPadding(date.getDate(), 2)}`;
};

const isExipired = (date) => {
  const today = parseInt(getDate());
  return today > parseInt(date);
};

const fetch = async (ddb, token, site) => {
  const params = {
    TableName: TABLE,
    Key: {
      Token: token,
      Site: site,
    },
  };

  return await new Promise((resolve, reject) => {
    ddb.get(params, (err, data) => {
      if (err) {
        reject({
          code: 500,
        });
        return;
      }
      resolve(data);
    });
  });
};

exports.handler = async (event) => {
  const { site, token } = event;
  if (typeof token !== 'string' || typeof site !== 'string') {
    return {
      code: 500,
      message: 'リクエストパラメーターが不正です',
    };
  }

  const ddb = new AWS.DynamoDB.DocumentClient();

  // キーワードの取得
  const [itemForToken, item] = await Promise.all([
    fetch(ddb, token, DEFAULT_SITE),
    fetch(ddb, token, site),
  ]).catch(() => {
    return [{ code: 500 }, { code: 500 }];
  });
  if ('code' in item || 'code' in itemForToken) {
    return {
      code: 500,
      message: 'データベースのアクセスに失敗しました',
    };
  }
  if (isEmpty(itemForToken)) {
    return {
      code: 401,
      message: 'トークンが不正です',
    };
  }
  if (isExipired(itemForToken.Item.ExpiredAt)) {
    return {
      code: 410,
      message: 'トークンの期限が切れています',
    };
  }

  return {
    code: 200,
    body: isEmpty(item) ? item : item.Item.Result,
  };
};

// this.handler({
//   token: '1767f0eec54ee',
//   site: 'memorandumraila.com',
// });
