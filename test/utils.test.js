import * as utils from '../lib/utils';
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
let githubConfig = {
  user: 'bugron',
  repo: 'FccPrBot',
  number: 4
};
let fakeGithubConfig = {
  user: 'bugron',
  repo: 'FccPrBot',
  number: -1
};

chai.use(chaiAsPromised);

describe('Testing utils', () => {
  describe('Check configuration global object', () => {
    it('Config is an object', () => {
      return expect(utils.configRules).to.be.an('object');
    });
  });
  describe('Check configuration object\'s properties', () => {
    it('github is an object', () => {
      return expect(utils.github).to.be.an('object');
    });
    it('getFiles is a function', () => {
      return expect(utils.getFiles).to.be.a('function');
    });
    it('Successful call getFiles function', () => {
      return expect(utils.getFiles(githubConfig)).to
        .eventually.be.an('array');
    });
    it('Fail call getFiles function', () => {
      return expect(utils.getFiles(fakeGithubConfig)).to.be.rejected;
    });
    it('getCommits is a function', () => {
      return expect(utils.getCommits).to.be.a('function');
    });
    it('Successful call getCommits function', () => {
      return expect(utils.getCommits(githubConfig)).to
        .eventually.be.an('array');
    });
    it('Fail call getCommits function', () => {
      return expect(utils.getCommits(fakeGithubConfig)).to.be.rejected;
    });
    it('Test camelCase function to be true', () => {
      return expect(utils.camelCase('Infix-Caps', '-')).to.be.true;
    });
    it('Test camelCase function to be false', () => {
      return expect(utils.camelCase('infix Caps', ' ')).to.be.false;
    });
  });
});
