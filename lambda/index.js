const AWS = require('aws-sdk');
const request = require('request');

const INSTANCE_IDS = ['i-052d1395c28876647', 'i-033b0fa62f3cd8fab'];
const TABLE = 'Rancheck';
const DEFAULT_SITE = 'example.com';
const REQUEST_PER_INSTANCE = 5;

AWS.config.region = 'ap-northeast-1';

const httpRequest = (ip, site, keywords) =>
  new Promise((resolve, reject) =>
    request(
      {
        method: 'POST',
        url: `http://${ip}:3000`,
        json: {
          site,
          keywords,
        },
      },
      (err, res) => {
        if (err) {
          reject({
            code: 500,
          });
          return;
        }
        resolve(res.body);
      }
    )
  );

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

const startInstance = async (ec2, params) => {
  await ec2
    .startInstances(params, (err) => {
      if (err) {
        throw {
          code: 500,
          message: 'インスタンス起動に失敗しました',
        };
      }
    })
    .promise();
  const instances = await new Promise((resolve) =>
    ec2.waitFor('instanceRunning', params, (err, data) => {
      if (err) {
        throw {
          code: 500,
          message: 'インスタンス起動待機に失敗しました',
        };
      } else {
        resolve(data);
      }
    })
  );
  await ec2
    .waitFor('instanceStatusOk', params, (err) => {
      if (err) {
        throw {
          code: 500,
          message: 'ステータスok待機に失敗しました',
        };
      }
    })
    .promise();

  return instances;
};

const stopInstance = async (ec2, params) => {
  return await new Promise((resolve, reject) =>
    ec2.stopInstances(params, (err) => {
      if (err) {
        reject({
          code: 500,
        });
        return;
      }
      resolve({});
    })
  );
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

const save = async (ddb, token, site, data) => {
  const params = {
    TableName: TABLE,
    Item: {
      Token: token,
      Site: site,
      Result: Object.assign(
        {},
        ...Object.entries(data).map(([key, value]) => ({
          [key]: {
            title: value.title,
            url: value.url,
            result: [
              {
                date: getDate(),
                rank: value.rank,
              },
            ],
          },
        }))
      ),
    },
  };
  return await new Promise((resolve, reject) =>
    ddb.put(params, (err) => {
      if (err) {
        reject({
          code: 500,
        });
        return;
      }
      resolve({});
    })
  );
};

exports.handler = async (event) => {
  const { site, token } = event;
  if (typeof token !== 'string' || typeof site !== 'string') {
    return {
      code: 500,
      message: 'リクエストパラメーターが不正です',
    };
  }

  const ec2 = new AWS.EC2();
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
  const keywords = Object.keys(item.Item.Result);
  const instanceNum = Math.ceil(keywords.length / REQUEST_PER_INSTANCE);
  const params = {
    InstanceIds: INSTANCE_IDS.slice(0, instanceNum),
  };

  // インスタンスの開始
  const startInstanceResponse = await startInstance(ec2, params).catch(
    (err) => err
  );
  if ('code' in startInstanceResponse) {
    return startInstanceResponse;
  }
  const ipAddresses = startInstanceResponse.Reservations.map((reservation) =>
    reservation.Instances.map((instance) => instance.PublicIpAddress).shift()
  );

  // ここに処理を書く
  const request = ipAddresses.map((ip) =>
    httpRequest(ip, site, keywords.splice(0, REQUEST_PER_INSTANCE))
  );
  const results = await Promise.all(request).catch((err) => err);
  if ('code' in results) {
    return {
      code: 500,
      message: 'ランキングの取得に失敗しました',
    };
  }
  const result = Object.assign({}, ...results.map((result) => result));

  // キーワードの保存およびインスタンスの停止
  const saveResponse = await save(ddb, token, site, result).catch((err) => err);
  if ('code' in saveResponse) {
    return {
      code: 500,
      message: 'ランキングの保存に失敗しました',
    };
  }
  const stopInstanceResponse = await stopInstance(ec2, params).catch(
    (err) => err
  );
  if ('code' in stopInstanceResponse) {
    return {
      code: 500,
      message: 'インスタンスの停止に失敗しました',
    };
  }

  return {
    code: 200,
    message: 'ランキングの保存に成功しました',
  };
};

// this.handler({
//   token: '1767f0eec54ee',
//   site: 'memorandumrail.com',
// });
