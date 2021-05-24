'use strict';

const debuglog = __debug.bind(null, __filename);
// Webpack imports
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const fileUtil = require('../utils/file-util');

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
 * Function to mount webpack config
 * @param {Object} webpackConfig   webpack config defined for the framework.
 * @param {Object} app             app instance.
 * @returns {Object}               Mounted middleware.
 */
function mountConfig(webpackConfig, app) {
  webpackConfig.mode = 'development';

  const compiler = webpack(webpackConfig);

  return app.use(webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    writeToDisk: true
  })
  );
}

/**
 * Function to check for custom webpack Config defined by the developer.
 * @param {Object} customConfig   object defined in package.json.
 * @returns {String}              returns path of the config file.
 */
async function getWebpackConfigPath(customConfig) {

  if (customConfig.hasOwnProperty('configPath')) {
    if (customConfig.configPath !== '' && fileUtil.existsFile(`${process.cwd()}/${customConfig.configPath}`)) {
      debuglog(`Found Custom Config at ${customConfig.configPath}`);
      return `${process.cwd()}/${customConfig.configPath}`;
    }
  }
  debuglog('Mounting the default Webpack config');
  return WEBPACK_CONFIG_PATHS[customConfig.frontendFramework];
}

async function run(customConfig, app) {

  const frameworkSupport = SUPPORTED_FRAMEWORKS.includes(customConfig.frontendFramework);

  if (!frameworkSupport) {
    console.error(`${customConfig.frontendFramework} is not supported in the current version of FDK`);
    return;
  }

  if (customConfig.frontendFramework && frameworkSupport) {
    const configPath = await getWebpackConfigPath(customConfig);
    const frameWorkConfig = require(configPath);

    return mountConfig(frameWorkConfig, app);
  }
}

module.exports = {
  run
};
