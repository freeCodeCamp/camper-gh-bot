import {
  github,
  configRules,
  getFiles,
  getCommits,
  camelCase
} from './utils';

export const validatePullRequest = async (data) => {
  // load rules configuration for current repository
  const baseRepoFullName = data.pull_request.base.repo.full_name,
    repoConfig = configRules[baseRepoFullName];
  let githubConfig = {
    user: data.repository.owner.login,
    repo: data.repository.name,
    number: data.pull_request.number
  };

  if (repoConfig && typeof repoConfig !== 'undefined') {

    let debugInfo = '', warnArray = [];

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
        console.log(`A blacklisted user ${data.action} this PR. Skipping.`);
        return;
      }

      if (repoConfig.userForbiddenForPR) {
        let msg = '';
        if (
          repoConfig.userForbiddenForPR.indexOf('*') >= 0 &&
          repoConfig.closeAllPRsMessage
        ) {
          msg = `Dear @${data.pull_request.user.login}.\n` +
            repoConfig.closeAllPRsMessage + ' Thanks.';
        } else if (
          repoConfig.userForbiddenForPR
            .indexOf(data.pull_request.user.login) >= 0
        ) {
          msg = `@${data.pull_request.user.login}, ` +
          'unfortunately you\'re not allowed to open PRs in this repository.' +
          ' Closing this PR.';
        }

        if (msg) {
          githubConfig.body = msg;
          github.issues.createComment(githubConfig);
          delete githubConfig.body;

          githubConfig.state = 'closed';
          github.pullRequests.update(githubConfig);
          delete githubConfig.state;
          return;
        }
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

      let shouldBeClosed = false;
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
          let filesArr = await getFiles(githubConfig),
            isValidFileName = true;

          if (filesArr && filesArr.length) {
            filesArr.every((file) => {
              if (file.filename) {
                isValidFileName =
                repoConfig.rules.critical.allowedFileNames.some((val) => {
                  let reg = new RegExp(val, 'i'),
                    lastElem = file.filename.
                      split('/')[file.filename.split('/').length - 1];
                  return (
                    file.filename.match(reg) &&
                    file.filename.match(reg)[0].length === lastElem.length &&
                    camelCase(lastElem, '-')
                  );
                });
                return isValidFileName;
              }
              return false;
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
        let isPrefix = repoConfig.rules.allowedBranchNames.some((val) => {
          return data.pull_request.head.ref.match(new RegExp(val, 'i'));
        });

        if (!isPrefix) {
          warnArray.push(
            'Your branch name should start with one of `' +
            repoConfig.rules.allowedBranchNames.join(', ') +
            '` prefixes. Name your branches correctly next time, please.'
          );
        }
      }

      if (
        repoConfig.rules.closeKeywords &&
        repoConfig.rules.closeKeywords.length
      ) {
        let validCommit = '(?:' + repoConfig.rules.closeKeywords.join('|') +
          ')\\s+([\\w\\d-.]*\\/?[\\w\\d-.]*)?#\\d+';
        validCommit = new RegExp(validCommit, 'ig');
        let msg = 'Do not include issue numbers and following [keywords]' +
          '(https://help.github.com/articles/closing-issues-via-commit-' +
          'messages/#keywords-for-closing-issues)';

        if (validCommit && data.pull_request.title.match(validCommit)) {
          warnArray.push(
            msg + ' in pull request\'s title.'
          );
        }

        try {
          let commitsArr = await getCommits(githubConfig);
          if (commitsArr && commitsArr.length) {
            for (let l = 0; l < commitsArr.length; l++) {
              // show more debug info (commits of the current PR)
              console.log((l + 1) + ': ' + commitsArr[l].commit.message);
            }

            for (let m = 0; m < commitsArr.length; m++) {
              if (
                validCommit &&
                commitsArr[m].commit.message.match(validCommit)
              ) {
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
      }

      if (warnArray.length > 1) {
        warnArray.push(
          'Please review our [**Guidelines for Contributing**]' +
          '(https://github.com/' + baseRepoFullName +
          repoConfig.repoContribPath + '), thank you!'
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
      let msgTest = '@' + data.sender.login +
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
};
