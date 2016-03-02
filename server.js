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
GitHubApi = require('github4'),
crypto = require('crypto'),
compare = require('secure-compare'),
configRules = require('./repo-rules.json');

if (typeof configRules !== 'object') {
  try {
    configRules = JSON.parse(configRules);
  } catch (e) {
    console.log('Repository\'s configuration is not an object, exiting.');
    console.log(e);
    process.exit(1);
  }
}

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

function getFiles(conf) {
  return new Promise(function(resolve, reject) {
    github.pullRequests.getFiles(conf, function(err, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

function getCommits(conf) {
  return new Promise(function(resolve, reject) {
    github.pullRequests.getCommits(conf, function(err, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

function camelCase(str, separator) {
  var words = str.toLowerCase().split(separator);
  return words.map(function(word) {
    return word.charAt(0).toUpperCase() + word.substr(1);
  }).join(separator) === str;
}

async function validatePullRequest(data) {
  // load rules configuration for current repository
  var baseRepoFullName = data.pull_request.base.repo.full_name,
    repoConfig = configRules[baseRepoFullName],
    githubConfig = {
      user: data.repository.owner.login,
      repo: data.repository.name,
      number: data.pull_request.number
    };

  if (repoConfig && typeof repoConfig !== 'undefined') {

    var debugInfo = '', warnArray = [];
    if (
      repoConfig.rules.closeKeywords &&
      repoConfig.rules.closeKeywords.length
    ) {
      validCommit = '(?:' + repoConfig.rules.closeKeywords.join('|') +
        ')\\s+([\\w\\d-.]*\\/?[\\w\\d-.]*)?#\\d+';
      validCommit = new RegExp(validCommit, 'ig');
    }

    if (
      repoConfig.actions &&
      repoConfig.actions.indexOf(data.action) === -1
    ) {
      console.log(
        'Skipping because action is ' + data.action + '.',
        'We only care about: \'' + repoConfig.actions.join("', '") + '\''
      );
      return;
    }

    if (data.action === 'opened' || data.action === 'reopened') {
      if (
        repoConfig.userBlacklistForPR &&
        repoConfig.userBlacklistForPR
          .indexOf(data.pull_request.user.login) >= 0
      ) {
        console.log('Skipping because blacklisted user created Pull Request.');
        return;
      }

      warnArray = ['@' + data.pull_request.user.login + ' thanks for the PR.'];
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
        repoConfig.rules.critical.blacklistedBaseBranchNames &&
        repoConfig.rules.critical.blacklistedBaseBranchNames
          .indexOf(data.pull_request.base.ref) >= 0
      ) {
        warnArray.push(
          'This PR is opened against `' + data.pull_request.base.ref +
          '` branch and will be closed.'
        );
        shouldBeClosed = true;
      }

      if (
        repoConfig.rules.critical.blacklistedHeadBranchNames &&
        repoConfig.rules.critical.blacklistedHeadBranchNames
          .indexOf(data.pull_request.head.ref) >= 0
      ) {
        warnArray.push(
          'You\'ve done your changes in `' + data.pull_request.head.ref +
          '` branch. Always work in a separate, correctly named branch. ' +
          'Closing this PR.'
        );
        shouldBeClosed = true;
      }

      if (
        repoConfig.rules.critical.allowedFileNames &&
        repoConfig.rules.critical.allowedFileNames.length
      ) {
        try {
          var filesArr = await getFiles(githubConfig), isValidFileName = true;

          if (filesArr && filesArr.length) {
            filesArr.every(function(file) {
              if (file.filename) {
                isValidFileName = 
                repoConfig.rules.critical.allowedFileNames.some(function(val) {
                  var reg = new RegExp(val, 'i');
                  var lastElem = file.filename.
                    split('/')[file.filename.split('/').length - 1];
                  return (
                    file.filename.match(reg) &&
                    file.filename.match(reg)[0].length === lastElem.length &&
                    camelCase(lastElem, '-')
                  );
                });
                return isValidFileName;
              }
            });
          }

          if (!isValidFileName) {
            warnArray.push(
              'Filenames should not contain any special characters or ' +
              'spaces. Use only `-` to separate words. ' +
              'Files should have the `.md` extension. ' +
              'Filenames should follow a Camel-Case format. Closing this PR.'
            );
            shouldBeClosed = true;
          }
        } catch (e) {
          console.log('Something went wrong while getting PR\'s files.');
          console.log(e);
          return;
        }
      }

      if (
        repoConfig.rules.allowedBranchNames &&
        repoConfig.rules.allowedBranchNames.length
      ) {
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
      }

      var msg = 'Do not include issue numbers and following [keywords]' +
        '(https://help.github.com/articles/closing-issues-via-commit-' +
        'messages/#keywords-for-closing-issues)';

      if (validCommit && data.pull_request.title.match(validCommit)) {
        warnArray.push(
          msg + ' in pull request\'s title.'
        );
      }

      try {
        var commitsArr = await getCommits(githubConfig);
        if (commitsArr && commitsArr.length) {
          for (var l = 0; l < commitsArr.length; l++) {
            // show more debug info (commits of the current PR)
            console.log((l + 1) + ': ' + commitsArr[l].commit.message);
          }

          for (var m = 0; m < commitsArr.length; m++) {
            if (validCommit && commitsArr[m].commit.message.match(validCommit)) {
              warnArray.push(
                msg + ' in commit messages.'
              );
              break;
            }
          }

          if (
            typeof repoConfig.rules.maxCommitCount === 'number' &&
            commitsArr.length > repoConfig.rules.maxCommitCount
          ) {
            warnArray.push(
              'You have pushed more than one commit. ' +
              'When you finish editing, [squash](https://github.com/' +
              'FreeCodeCamp/FreeCodeCamp/wiki/git-rebase#squashing-' +
              'multiple-commits-into-one) your commits into one.'
            );
          }
        }
      } catch (e) {
        console.log('Something went wrong while getting PR\'s commits.');
        console.log(e);
        return;
      }

      if (warnArray.length > 1) {
        warnArray.push(
          'Please, review our [**Guidelines for Contributing**]' +
          '(https://github.com/' + baseRepoFullName +
          repoConfig.repoContribPath + '), thank you!.'
        );
 
        githubConfig.body = warnArray.join('\n');
        github.issues.createComment(githubConfig);
        delete githubConfig.body;
      }

      if (shouldBeClosed) {
        githubConfig.state = 'closed';
        github.pullRequests.update(githubConfig);
        delete githubConfig.state;
      }
    } else if (data.action === 'synchronize') {
      var msgTest = '@' + data.pull_request.user.login +
        ' updated the pull request.';
      console.log(msgTest);

      githubConfig.body = msgTest;
      github.issues.createComment(githubConfig);
      delete githubConfig.body;
    }
  } else {
    console.log(baseRepoFullName + ' is not listed in rules configuration' +
      ' file. Skipping.');
  }
}

async function work(body) {
  var data = {};
  try {
    data = JSON.parse(body.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  validatePullRequest(data);
}

app.post('/', function(req, res) {
  req.pipe(bl(function(err, body) {
    var signature = req.headers['x-hub-signature'],
      computedSignature = 'sha1=' + crypto.
        createHmac("sha1", process.env.SECRET_TOKEN).
        update(new Buffer(body.toString(), 'utf8')).digest("hex");
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
