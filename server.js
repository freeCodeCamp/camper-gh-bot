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

import { validatePullRequest } from './lib/validatePullRequest';

const bl = require('bl'),
  app = require('express')(),
  crypto = require('crypto'),
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
  console.error('curl -X POST -d @__tests__/data/23.webhook ' +
    'http://localhost:5000/');
  console.error('6) Check that it commented here: https://github.com/' +
    'fbsamples/bot-testing/pull/23');
  throw new Error();
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

let work = async (body) => {
  let data = {};
  try {
    data = JSON.parse(body.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  validatePullRequest(data);
};

app.post('/', (req, res) => {
  req.pipe(bl((err, body) => {
    if (err) { throw err; }
    let signature = req.headers['x-hub-signature'],
      computedSignature = 'sha1=' + crypto.
        createHmac('sha1', process.env.SECRET_TOKEN).
        update(new Buffer(body.toString(), 'utf8')).digest('hex');
    if (
      res.req.headers['x-hub-signature'] === signature &&
      res.req.headers['x-hub-signature'] === computedSignature &&
      computedSignature === signature &&
      compare(computedSignature, signature) &&
      compare(computedSignature, res.req.headers['x-hub-signature']) &&
      compare(signature, res.req.headers['x-hub-signature'])
    ) {
      work(body).then(() => { res.end(); });
    } else {
      console.error('This request is not secured! Aborting.');
    }
  }));
});

app.get('/', (req, res) => {
  res.send(
    'FreeCodeCamp PR Bot is Active. ' +
    'Go to https://github.com/bugron/FccPrBot for more information.'
  );
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), () => {
  console.log('Listening on port', app.get('port'));
});
