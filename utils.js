const GitHubApi = require('github4'),
  config = require('./package.json').config;

const github = new GitHubApi({
  version: '3.0.0',
  host: config.gheHost || 'api.github.com',
  protocol: config.gheProtocol || 'https',
  port: config.ghePort || '443'
});

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

module.exports = {
  getFiles(conf) {
    return new Promise((resolve, reject) => {
      github.pullRequests.getFiles(conf, (err, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
  },

  getCommits(conf) {
    return new Promise((resolve, reject) => {
      github.pullRequests.getCommits(conf, (err, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
  },

  camelCase(str, separator) {
    let words = str.toLowerCase().split(separator);
    return words.map((word) => {
      return word.charAt(0).toUpperCase() + word.substr(1);
    }).join(separator) === str;
  }
}
