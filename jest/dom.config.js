const common = require('./common.json')

module.exports = {
  ...common,
  rootDir: '..',
  displayName: 'DOM',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/features/bluemoji/__tests__/BluemojiNode.test.ts',
    '<rootDir>/src/features/bluemoji/__tests__/editorVisibility.test.ts',
  ],
}
