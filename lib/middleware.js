const crypto = require('crypto'),
  compare = require('secure-compare'),
  parser = require('body-parser');

export function connectionValidator(req, res, next) {
  if (req.method === 'POST') {
    let signature = req.headers['x-hub-signature'],
      computedSignature = 'sha1=' + crypto.
        createHmac('sha1', process.env.SECRET_TOKEN).
        update(new Buffer(JSON.stringify(req.body), 'utf8')).digest('hex');
    if (!(
      res.req.headers['x-hub-signature'] === signature &&
      res.req.headers['x-hub-signature'] === computedSignature &&
      computedSignature === signature &&
      compare(computedSignature, signature) &&
      compare(computedSignature, res.req.headers['x-hub-signature']) &&
      compare(signature, res.req.headers['x-hub-signature'])
    )) {
      res.sendStatus(403);
      console.error('This request is not secured! Aborting.');
      return;
    }
  }
  next();
}

export function checkCredentials() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(`
      The bot was started without a github account to post with.
      To get started:
      1) Create a new account for the bot
      2) Settings > Personal access tokens > Generate new token
      3) Only check public_repo and click Generate token
      4) Save your token in .env file:

         GITHUB_TOKEN=insert_token_here
    `);
  }

  if (!process.env.SECRET_TOKEN) {
    throw new Error(`
      Missing your GitHub webhook's secret token
      Read https://developer.github.com/webhooks/securing and
      add one to .env file like shown in the example below:

         SECRET_TOKEN=insert_token_here
    `);
  }

  if (!process.env.GITHUB_USER) {
    console.warn(`
      There was no github user detected.
      This is fine, but freeCodeCamp-github-bot won\'t work with private repos.
      To make freeCodeCamp-github-bot work with private repos, please expose
      GITHUB_USER and GITHUB_PASSWORD as environment variables.
      The user and password must have access to the private repo
      you want to use.
    `);
  }
}

export const bodyParser = parser.json;
