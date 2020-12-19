const AWS = require('aws-sdk');
const request = require('request');

const INSTANCE_ID = ['i-052d1395c28876647'];
const TABLE = 'Rancheck';

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
          reject(err);
        }
        resolve(res.body);
      }
    )
  );

const isEmpty = (obj) => Object.keys(obj).length === 0;

const getDate = () => {
  const date = new Date();
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const startInstance = async (ec2, params) => {
  await ec2
    .startInstances(params, (err) => {
      if (err) {
        throw {
          code: 500,
          stack: err.stack,
          message: 'インスタンス起動に失敗しました',
        };
      }
    })
    .promise();
  const { Reservations } = await new Promise((resolve) =>
    ec2.waitFor('instanceRunning', params, (err, data) => {
      if (err) {
        throw {
          code: 500,
          stack: err.stack,
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
          stack: err.stack,
          message: 'ステータスok待機に失敗しました',
        };
      }
    })
    .promise();

  return Reservations.map((reservation) =>
    reservation.Instances.map((instance) => instance.PublicIpAddress).shift()
  );
};

const stopInstance = (ec2, params) => {
  ec2.stopInstances(params, (err) => {
    if (err) {
      throw {
        code: 500,
        stack: err.stack,
        message: 'インスタンス停止に失敗しました',
      };
    }
  });
};

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

const save = (ddb, token, site, data) => {
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
  const site = 'memorandumrail.com';
  const token = 'aaaa';

  const ec2 = new AWS.EC2();
  const ddb = new AWS.DynamoDB.DocumentClient();
  const params = {
    InstanceIds: INSTANCE_ID,
  };

  // キーワードの取得
  const data = await fetch(ddb, token, site);
  if (!!data.code) {
    return data;
  }
  const keywords = Object.keys(data.Result);
  console.log(keywords);

  // インスタンスの開始
  const ipAddresses = await startInstance(ec2, params);

  // ここに処理を書く
  const result = await httpRequest(ipAddresses.shift(), site, keywords);
  save(ddb, token, site, result);

  // インスタンスの停止
  stopInstance(ec2, params);
};

main();
