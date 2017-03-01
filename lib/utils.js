const path = require('path');
require('dotenv')
  .load({path: path.resolve(path.dirname(__filename), '../.env')});
require('./middleware').checkCredentials();

const GitHubApi = require('github'),
  gitConfig = require('../package.json').config;

let config = require('../repo-rules.json');

if (typeof config !== 'object') {
  try {
    config = JSON.parse(config);
  } catch (e) {
    console.log('Repository\'s configuration is not an object, exiting.');
    throw e;
  }
}

export const configRules = config;

export const github = new GitHubApi({
  version: '3.0.0',
  host: gitConfig.gheHost || 'api.github.com',
  protocol: gitConfig.gheProtocol || 'https',
  port: gitConfig.ghePort || '443'
});

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

export function getFiles(conf) {
  return new Promise((resolve, reject) => {
    github.pullRequests.getFiles(conf, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

export function getCommits(conf) {
  return new Promise((resolve, reject) => {
    github.pullRequests.getCommits(conf, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

export function camelCase(str, separator) {
  let words = str.toLowerCase().split(separator);
  return words.map((word) => {
    return word.charAt(0).toUpperCase() + word.substr(1);
  }).join(separator) === str;
}
