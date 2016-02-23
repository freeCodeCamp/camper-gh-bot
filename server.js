/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
require('dotenv').load();

var bl = require('bl'),
config = require('./package.json').config,
express = require('express'),
fs = require('fs'),
util = require('util'),
request = require('request'),
GitHubApi = require('github4');

if (!process.env.GITHUB_TOKEN) {
  console.error('The bot was started without a github account to post with.');
  console.error('To get started:');
  console.error('1) Create a new account for the bot');
  console.error('2) Settings > Personal access tokens > Generate new token');
  console.error('3) Only check `public_repo` and click Generate token');
  console.error('4) Run the following command:');
  console.error('GITHUB_TOKEN=insert_token_here npm start');
  console.error('5) Run the following command in another tab:');
  console.error('curl -X POST -d @__tests__/data/23.webhook http://localhost:5000/');
  console.error('6) Check that it commented here: https://github.com/fbsamples/bot-testing/pull/23');
  process.exit(1);
}

if (!process.env.GITHUB_USER) {
  console.warn(
    'There was no github user detected.',
    'This is fine, but TestPRBot won\'t work with private repos.'
  );
  console.warn(
    'To make TestPRBot work with private repos, please expose',
    'GITHUB_USER and GITHUB_PASSWORD as environment variables.',
    'The user and password must have access to the private repo',
    'you want to use.'
  );
}

var github = new GitHubApi({
  version: '3.0.0',
  host: config.gheHost || 'api.github.com',
  protocol: config.gheProtocol || 'https',
  port: config.ghePort || '443'
});

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

var app = express(),
  messageText = '';

async function work(body) {
  var data = {};
  try {
    data = JSON.parse(body.toString());
  } catch (e) {
    console.error(e);
  }

  if (data.action === 'opened' || data.action === 'reopened') {
    github.pullRequests.getCommits({
      user: data.repository.owner.login,
      repo: data.repository.name,
      number: data.pull_request.number,
    }, function(err, body) {
      if (!err) {
        messageText = [
          'This PR is ' + data.action,
          'Pushed branch is `' + data.pull_request.head.ref + '`',
          'PR is opened against `' + data.pull_request.base.ref + '` branch',
          'PR has ' + data.pull_request.commits + ' commit(s)'
        ].join('\n');

        console.log(messageText);

        if (body.length) {
          for (var i = 0; i < body.length; i++) {
            console.log(i + ': ' + body[i].commit.message);
            messageText += '\n' + (i + 1) + ': `' + body[i].commit.message + '`';
          }
        }

        github.issues.createComment({
          user: data.repository.owner.login,
          repo: data.repository.name,
          number: data.pull_request.number,
          body: messageText
        });
      } else {
        console.error(error);
      }
    });
  }
  return;
}

app.post('/', function(req, res) {
  req.pipe(bl(function(err, body) {
    work(body).then(function() { res.end(); });
 }));
});

app.get('/', function(req, res) {
  res.send(
    'FreeCodeCamp PR Bot is Active. ' +
    'Go to https://github.com/bugron/TestPRBot for more information.'
  );
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.log('Listening on port', app.get('port'));
});
