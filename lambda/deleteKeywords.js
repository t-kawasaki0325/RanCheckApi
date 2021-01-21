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

const put = async (ddb, prevItems, token, site, keywords) => {
  const params = {
    TableName: TABLE,
    Item: {
      Token: token,
      Site: site,
      Result: Object.assign(
        {},
        ...Object.keys(prevItems)
          .filter((keyword) => !keywords.includes(keyword))
          .map((keyword) => ({ [keyword]: prevItems[keyword] }))
      ),
    },
  };

  return await new Promise((resolve, reject) =>
    ddb.put(params, (err) => {
      if (err) {
        reject();
        return;
      }
      resolve();
    })
  );
};

exports.handler = async (event) => {
  const { token, site, keywords } = event;
  if (typeof token !== 'string'
    || typeof site !== 'string'
    || !Array.isArray(keywords)
  ) {
    return {
      code: 500,
      message: 'リクエストパラメーターが不正です',
    };
  }

  const ddb = new AWS.DynamoDB.DocumentClient();

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

  const prevItem = isEmpty(item) ? item : item.Item.Result;
  return await put(ddb, prevItem, token, site, keywords)
    .then(() => ({
      code: 200,
      message: 'キーワードの削除に成功しました',
    }))
    .catch(() => ({
      code: 500,
      message: 'キーワードの削除に失敗しました',
    }));
};

// this.handler({
//   token: '1767f0eec54ee',
//   keywords: ['php プログラミングスクール', 'プログラミング 30代 遅い'],
//   site: 'memorandumrail.com',
// });
