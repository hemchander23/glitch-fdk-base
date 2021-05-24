module.exports = {
  setupFilesAfterEnv: ['<rootDir>/setUpTests.js'],
  "moduleNameMapper": {
    "\\.svg": "<rootDir>/__mocks__/svgrMock.js",
    "\\.(css|less|scss|sss|styl)$": "<rootDir>/node_modules/jest-css-modules"
  },
  coverageReporters: [["json"], ["lcov"]]

};