const request = require('request');

module.exports = (ip, site, keywords) => {
  return new Promise((resolve, reject) =>
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
        if (err) reject(err);
        resolve(res.body);
      }
    )
  );
};
