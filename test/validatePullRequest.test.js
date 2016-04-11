import { validatePullRequest } from '../lib/validatePullRequest';
const chai = require('chai'),
  expect = chai.expect,
  chaiAsPromised = require('chai-as-promised'),
  fs = require('fs'),
  path = require('path');

chai.use(chaiAsPromised);

function getFile(filename) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '/files/', filename))
  );
}

function runTest(data, done) {
  data = getFile(data);
  validatePullRequest(data).then((value) => {
    done();
    return expect(value).to.be.undefined;
  });
}

describe('Testing validatePullRequest', () => {
  it('Check if validatePullRequest is a function', () => {
    return expect(validatePullRequest).to.be.function;
  });
  it('Call validatePullRequest: reopened', (done) => {
    runTest('reopened.json', done);
  });
  it('Call validatePullRequest: closed', (done) => {
    runTest('closed.json', done);
  });
  it('Call validatePullRequest: synchronize', (done) => {
    runTest('synchronize.json', done);
  });
  it('Call validatePullRequest: invalidRepoName', (done) => {
    runTest('invalidRepoName.json', done);
  });
  it('Call validatePullRequest: invalidUserName', (done) => {
    runTest('invalidUserName.json', done);
  });
  it('Call validatePullRequest: invalidBaseBranchName', (done) => {
    runTest('invalidBaseBranchName.json', done);
  });
  it('Call validatePullRequest: invalidHeadBranchName', (done) => {
    runTest('invalidHeadBranchName.json', done);
  });
  it('Call validatePullRequest: invalidCommitMessage', (done) => {
    runTest('invalidCommitMessage.json', done);
  });
});
