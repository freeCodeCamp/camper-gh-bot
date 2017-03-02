/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the docs directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import validatePullRequest from './lib/validatePullRequest';
import {
  connectionValidator,
  bodyParser
} from './lib/middleware';

const app = require('express')();
const path = require('path');

app.use(bodyParser());
app.use(connectionValidator);

const work = async (body) => {
  validatePullRequest(body);
};

app.post('/', (req, res) => {
  if (req.body) {
    work(req.body).then(() => { res.end(); });
  } else {
    res.status(400).end();
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), () => {
  console.log('Listening on port', app.get('port'));
});
