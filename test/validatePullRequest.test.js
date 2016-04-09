import { validatePullRequest } from '../lib/validatePullRequest';
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('Testing validatePullRequest', () => {
  it('Check if validatePullRequest is a function', () => {
    return expect(validatePullRequest).to.be.a('function');
  });
  it('Call validatePullRequest: reopened', () => {
    let data = require('fs').readFileSync('test/files/reopened.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: closed', () => {
    let data = require('fs').readFileSync('test/files/closed.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: synchronize', () => {
    let data = require('fs').readFileSync('test/files/synchronize.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: invalidRepoName', () => {
    let data = require('fs').readFileSync('test/files/invalidRepoName.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: invalidUserName', () => {
    let data = require('fs').readFileSync('test/files/invalidUserName.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: invalidBaseBranchName', () => {
    let data = require('fs')
      .readFileSync('test/files/invalidBaseBranchName.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: invalidHeadBranchName', () => {
    let data = require('fs')
      .readFileSync('test/files/invalidHeadBranchName.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
  it('Call validatePullRequest: invalidCommitMessage', () => {
    let data = require('fs')
      .readFileSync('test/files/invalidCommitMessage.json');
    return expect(validatePullRequest(JSON.parse(data))).to
      .eventually.be.undefined;
  });
});
