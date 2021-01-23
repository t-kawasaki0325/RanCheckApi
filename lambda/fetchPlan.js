const AWS = require('aws-sdk');

const TABLE = 'Rancheck';
const DEFAULT_SITE = 'example.com';

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
  const { token } = event;
  if (typeof token !== 'string') {
    return {
      code: 500,
      message: 'リクエストパラメーターが不正です',
    };
  }

  const ddb = new AWS.DynamoDB.DocumentClient();

  // キーワードの取得
  const item = await fetch(ddb, token, DEFAULT_SITE).catch(() => {
    return { code: 500 };
  })
  if ('code' in item) {
    return {
      code: 500,
      message: 'データベースのアクセスに失敗しました',
    };
  }
  if (isEmpty(item)) {
    return {
      code: 401,
      message: 'トークンが不正です',
    };
  }

  return {
    code: 200,
    body: {
      token: item.Item.Token,
      plan: item.Item.Plan,
      expiredAt: item.Item.ExpiredAt
    }
  };
};

// this.handler({
//   token: '177253ba364359',
// });
