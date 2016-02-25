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
GitHubApi = require('github4'),
crypto = require("crypto"),
compare = require('secure-compare');

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
    'This is fine, but FccPrBot won\'t work with private repos.'
  );
  console.warn(
    'To make FccPrBot work with private repos, please expose',
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

var app = express();

function validatePullRequest(data) {
  // default config
  var repoConfig = {
    userBlacklistForPR: [
      'greenkeeperio-bot',
      'QuincyLarson',
      'BerkeleyTrue'
    ],
    actions: [
      'opened',
      'reopened',
      'synchronize'
    ],
    rules: {
      critical: {
        blacklistedBaseBranchNames: ['master'],
        blacklistedHeadBranchNames: [
          'master',
          'staging'
        ]
      },
      allowedBranchNames: [
        'fix/',
        'feature/'
      ],
      closeKeywords: [
        'close',
        'closes',
        'closed',
        'fix',
        'fixes',
        'fixed',
        'resolve',
        'resolves',
        'resolved'
      ],
      maxCommitCount: 1
    }
  },
  debugInfo = '',
  validCommit = '(?:' + repoConfig.rules.closeKeywords.join('|') +
    ')\\s+([\\w\\d-.]*\\/?[\\w\\d-.]*)?#\\d+';
  validCommit = new RegExp(validCommit, 'ig');

  if (repoConfig.actions.indexOf(data.action) === -1) {
    console.log(
      'Skipping because action is ' + data.action + '.',
      'We only care about: \'' + repoConfig.actions.join("', '") + '\''
    );
    return;
  }

  if (data.action === 'opened' || data.action === 'reopened') {
    if (
      repoConfig.userBlacklistForPR
        .indexOf(data.pull_request.user.login) >= 0
    ) {
      console.log('Skipping because blacklisted user created Pull Request.');
      return;
    }

    github.pullRequests.getCommits({
      user: data.repository.owner.login,
      repo: data.repository.name,
      number: data.pull_request.number,
    }, function(err, body) {
      if (!err) {
        warnArray = ['@' + data.sender.login + ' thanks for the PR.'];
        debugInfo = [
          'This PR (' + data.pull_request.base.repo.full_name + '#' +
            data.number + ') is ' + data.action,
          'Pushed branch is `' + data.pull_request.head.ref + '`',
          'PR is opened against `' + data.pull_request.base.ref + '` branch',
          'PR has ' + data.pull_request.commits + ' commit(s)'
        ].join('\n');

        console.log(debugInfo);

        var shouldBeClosed = false;
        if (
          repoConfig
            .rules.critical.blacklistedBaseBranchNames
            .indexOf(data.pull_request.base.ref) >= 0
        ) {
          warnArray.push(
            'This PR is opened against `' + data.pull_request.base.ref +
            '` branch and will be closed.'
          );
          shouldBeClosed = true;
        }

        if (
          repoConfig
            .rules.critical.blacklistedHeadBranchNames
            .indexOf(data.pull_request.head.ref) >= 0
        ) {
          warnArray.push(
            'You\'ve done your changes in `' + data.pull_request.head.ref +
            '` branch. Always work in a separate, correctly named branch. ' +
            'Closing this PR.'
          );
          shouldBeClosed = true;
        }

        var isPrefix = repoConfig.rules.allowedBranchNames.some(function(val) {
          var reg = new RegExp(val, 'i');
          return data.pull_request.head.ref.match(reg);
        });

        if (!isPrefix) {
          warnArray.push(
            'Your branch name should start with one of `' + 
            repoConfig.rules.allowedBranchNames.join(', ') +
            '` prefixes. Name, your branches correctly next time, please.'
          );
        }

        var msg = 'Do not include issue numbers and following [keywords]' +
          '(https://help.github.com/articles/closing-issues-via-commit-' +
          'messages/#keywords-for-closing-issues)';

        if (data.pull_request.title.match(validCommit)) {
          warnArray.push(
            msg + ' in pull request\'s title.'
          );
        }

        if (body.length) {
          for (var l = 0; l < body.length; l++) {
            // show more debug info (commits of the current PR)
            console.log((l + 1) + ': ' + body[l].commit.message);
          }

          for (var m = 0; m < body.length; m++) {
            if (body[m].commit.message.match(validCommit)) {
              warnArray.push(
                msg + ' in commit messages.'
              );
              break;
            }
          }

          if (body.length > repoConfig.rules.maxCommitCount) {
            warnArray.push(
              'You have pushed more than one commit. ' +
              'When you finish editing, [squash](https://github.com/' +
              'FreeCodeCamp/FreeCodeCamp/wiki/git-rebase#squashing-' +
              'multiple-commits-into-one) your commits into one.'
            );
          }
        }

        if (warnArray.length > 1) {
          warnArray.push(
            'Please, review our [**Guidelines for Contributing**]' +
            '(https://github.com/FreeCodeCamp/FreeCodeCamp/blob/staging/' +
            'CONTRIBUTING.md), thank you!.'
          );

          github.issues.createComment({
            user: data.repository.owner.login,
            repo: data.repository.name,
            number: data.pull_request.number,
            body: warnArray.join('\n')
          });
        }

        if (shouldBeClosed) {
          github.pullRequests.update({
            user: data.repository.owner.login,
            repo: data.repository.name,
            number: data.pull_request.number,
            state: 'closed'
          });
        }
      } else {
        console.error(err);
      }
    });
  } else if (data.action === 'synchronize') {
    var msgTest = '@' + data.sender.login + ' updated the pull request.';
    console.log(msgTest);

    github.issues.createComment({
      user: data.repository.owner.login,
      repo: data.repository.name,
      number: data.pull_request.number,
      body: msgTest
    });
  }
}

async function work(body) {
  var data = {};
  try {
    data = JSON.parse(body.toString());
  } catch (e) {
    console.error(e);
  }

  validatePullRequest(data);
}

app.post('/', function(req, res) {
  req.pipe(bl(function(err, body) {
    var signature = req.headers['x-hub-signature'],
      computedSignature = 'sha1=' + crypto.
        createHmac("sha1", process.env.SECRET_TOKEN).update(body.toString()).
        digest("hex");
    if (
      res.req.headers['x-hub-signature'] === signature &&
      res.req.headers['x-hub-signature'] === computedSignature &&
      computedSignature === signature &&
      compare(computedSignature, signature)  &&
      compare(computedSignature, res.req.headers['x-hub-signature']) &&
      compare(signature, res.req.headers['x-hub-signature'])
    ) {
      work(body).then(function() { res.end(); });
    } else {
      console.error('This request is not secured! Aborting.');
    }
 }));
});

app.get('/', function(req, res) {
  res.send(
    'FreeCodeCamp PR Bot is Active. ' +
    'Go to https://github.com/bugron/FccPrBot for more information.'
  );
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function() {
  console.log('Listening on port', app.get('port'));
});
