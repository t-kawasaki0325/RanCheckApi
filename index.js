const AWS = require('aws-sdk');
const httpRequest = require('./modules/httpReqest');

const INSTANCE_ID = ['i-052d1395c28876647'];
const SITE = 'memorandumrail.com';
const KEYWORDS = ['ec2', 'php プログラミングスクール'];
AWS.config.region = 'ap-northeast-1';

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

const main = async () => {
  const ec2 = new AWS.EC2();
  const params = {
    InstanceIds: INSTANCE_ID,
  };

  // インスタンスの開始
  const ipAddresses = await startInstance(ec2, params);

  // ここに処理を書く
  const data = await httpRequest(ipAddresses.shift(), SITE, KEYWORDS);
  // console.log(data);

  // インスタンスの停止
  stopInstance(ec2, params);
};

main();
