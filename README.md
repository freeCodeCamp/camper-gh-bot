This bot will automatically check if pull requests follow repositories contribution guidelines. It helps moderate pull requests and notifies when a pull request is synchronized (see this [blog post](https://github.com/blog/964-all-of-the-hooks)).

## How To Contribute or Run Your Own Bot?

```bash
git clone https://github.com/bugron/FccPrBot.git
cd FccPrBot
npm install
```

-  Create a new account for the bot (or use an existing one)
-  Settings > Personal access tokens > Generate new token
-  Only check `public_repo` and click Generate token
-  Create an `.env` file in project's root with the following in it:
`GITHUB_TOKEN=insert_token_here`
-  Set in your `.env` file a Secret key which will be used for [securing your webhook](https://developer.github.com/webhooks/securing/):
`SECRET_TOKEN=insert_key_here`
- Define rules for your repositories in `repo-rules.json` file (see below)
-  `npm start`

## How To Use?

- Go to
 - your project on GitHub > Settings > Webhooks & services > Add Webhook or
 - your organization on GitHub > Settings > Webhooks > Add Webhook
- Payload URL: For example, `https://fcc-pr-bot.herokuapp.com/`
- Let me select individual events > Check only `Pull Request`
- Set your Secret key (the same as in `.env` file)
- Add Webhook

And you are done. **Note that bot must have write access to the repository to be able to close pull requests.**

## Configuration

All configuration goes to `repo-rules.json` file. You can specify different configs for your repositories.

```js
{
  "bugron/FccPrBot": {
    "userBlacklistForPR": [], // PR made by users in this list will be ignored
    "actions": [], // List of PR actions that FccPrBot will listen to
    "repoContribPath": "" // Path to you CONTRIBUTION.md file (should start with a slash, for example, /blob/master/.github/CONTRIBUTING.md)
    "rules": {
      "critical": {
        "blacklistedBaseBranchNames": [], // Do not open PR's against branches from this list
        "blacklistedHeadBranchNames": [], // Do not open PR's from branches in this list
        "allowedFileNames": [] // Test all filenames against this (for expamle, "[\\w\\d-]+\\.md$"). Close the PR if not all filenames satisfy this rule
      },
      "allowedBranchNames": [], // Allowed branch name prefixes
      "closeKeywords": [], //  Keywords which PR titles and commit messages should not contain
      "maxCommitCount": 1 // Max number of allowed commit messages count. If exceeded, bot will ask to squash commits.
    }
  }
}
```

If you would like the FccPrBot to function on private repositories, set the `GITHUB_USER` and `GITHUB_PASSWORD` environment variables or add them to `.env` file. You must disable two-factor authentication or you will receive a console log like this: `Login to ${USERNAME} failed`.

#### This project is based on a heavily changed version of Facebook's [mention-bot](https://github.com/facebook/mention-bot).

## License

mention-bot is BSD-licensed. We also provide an additional patent grant.
