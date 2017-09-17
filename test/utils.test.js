import * as utils from '../lib/utils';
const chai = require('chai'),
  expect = chai.expect,
  chaiAsPromised = require('chai-as-promised');
let githubConfig = {
  owner: 'raisedadead',
  repo: 'bot-tests-repo',
  number: 4
},
fakeGithubConfig = {
  owner: 'raisedadead',
  repo: 'bot-tests-repo',
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
      return expect(utils.getFiles).to.be.function;
    });
    it('Successful call getFiles function', (done) => {
      utils.getFiles(githubConfig).then((value) => {
        done();
        return expect(value).to.be.an('array');
      });
    });
    it('Fail call getFiles function', () => {
      return expect(utils.getFiles(fakeGithubConfig)).to.be.rejected;
    });
    it('getCommits is a function', () => {
      return expect(utils.getCommits).to.be.function;
    });
    it('Successful call getCommits function', (done) => {
      utils.getCommits(githubConfig).then((value) => {
        done();
        return expect(value).to.be.an('array');
      });
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
