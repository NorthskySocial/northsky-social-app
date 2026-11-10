const common = require('./common.json')
const dom = require('./dom.config')

module.exports = {
  ...common,
  rootDir: '..',
  preset: 'jest-expo/ios',
  setupFilesAfterEnv: ['<rootDir>/jest/jestSetup.js'],
  testPathIgnorePatterns: dom.testMatch,
}
