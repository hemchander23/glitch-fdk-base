'use strict';

// Webpack imports
const webpack = require('webpack');
const fileUtil = require('../utils/file-util');
const { promisify } = require('util');

// Constants

// Webpack config paths
const WEBPACK_CONFIG_PATHS = {
  react: '../webpack_configs/webpack.react.config',
  vue: '../webpack_configs/webpack.vue.config',
  vue3: '../webpack_configs/webpack.vue3.config'
};

// Supported Frameworks
const SUPPORTED_FRAMEWORKS = [
  'react',
  'vue',
  'vue3'
];

/**
 * Function to check for custom webpack Config defined by the developer.
 * @param {Object} customConfig   object defined in package.json.
 * @returns {Promise}              returns path of the config file as a promise
 */
async function getWebpackConfigPath(customConfig) {

  if (customConfig.hasOwnProperty('configPath')) {
    if (customConfig.configPath !== '' && fileUtil.existsFile(`${process.cwd()}/${customConfig.configPath}`)) {
      return `${process.cwd()}/${customConfig.configPath}`;
    }
  }
  return WEBPACK_CONFIG_PATHS[customConfig.frontendFramework];
}


/**
 *
 * @param {Object} webpackConfig  Webpack config defined by the user.
 * @returns {Promise}             returns a promise with build status.
 */
async function buildWebpack(webpackConfig) {

  webpackConfig.mode = 'production';
  const compiler = webpack(webpackConfig);
  const runCompiler = promisify(compiler.run, { context: compiler });

  return await runCompiler.call(compiler)
    .then(function (stats) {
      return stats;
    }).catch(function (err) {
      console.error(err);
      return err;
    });
}

async function run(customConfig) {

  const frameworkSupport = SUPPORTED_FRAMEWORKS.includes(customConfig.frontendFramework);

  if (!frameworkSupport) {
    console.error(`${customConfig.frontendFramework} is not supported in the current version of FDK`);
    return;
  }

  if (customConfig.frontendFramework && frameworkSupport) {
    const configPath = await getWebpackConfigPath(customConfig);
    const frameWorkConfig = require(configPath);

    return buildWebpack(frameWorkConfig);
  }
}

module.exports = {
  run
};