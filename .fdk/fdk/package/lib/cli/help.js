'use strict';

const boldify = text => `\n\x1b[1m${text}\x1b[0m\n\t`;

const MESSAGES = {
  'create'  : `${boldify('USAGE:')}fdk create [--app-dir DIR] [--products PRODUCT] [--template TEMPLATE]
              ${boldify('OPTIONS:')}--app-dir   DIR where DIR is the path to the directory where the app will be created. If this option is not specified, the app will be created in the current directory.\n\t--products  PRODUCT where PRODUCT is a Freshworks product. If this option is not specified, a prompt is displayed with the list of supported products.\n\t--template  TEMPLATE where TEMPLATE is the name of one of the templates that can be used as a starting point for development. If this option is not specified, a prompt is displayed with the list of supported templates for the given product.
              ${boldify('EXAMPLE:')}$ fdk create\n\t$ fdk create --products freshservice --template your_first_app\n\t$ fdk create --app-dir /Users/user/myfirstapp
              \nCreates a new app. The directories and files created will vary depending on the chosen template.`,
  'run'     : `${boldify('USAGE:')}fdk run [--app-dir DIR]
              ${boldify('OPTIONS:')}--app-dir         DIR where DIR is the path to the directory that contains the manifest file. If this option is not specified, the current directory is assumed to contain the manifest file.\n\t--clear-coverage  Reset coverage data collected so far.\n\t--skip-coverage   Skip instrumenting code during the current run.\n\t--tunnel          To start a tunnel using ngrok.\n\t--tunnel-auth <auth-token>   Authorization token to be used for ngrok.\n\t--resync-entities Flush local entity database and resync
              ${boldify('EXAMPLE:')}$ fdk run\n\t$ fdk run --app-dir /Users/user/myfirstapp
              \nRuns the app on a local server for testing.\
              \nOnce the server has started, append 'dev=true' to your Freshdesk support URL to start testing\
              \ne.g. https://domain.freshdesk.com/helpdesk/tickets/1?dev=true"]`,
  'validate': `${boldify('USAGE:')}fdk validate [--app-dir DIR]
              ${boldify('OPTIONS:')}--app-dir    DIR where DIR is the path to the directory that contains the manifest file. If this option is not specified, the current directory is assumed to contain the manifest file.
              ${boldify('EXAMPLE:')}$ fdk validate\n\t$ fdk validate --app-dir /Users/user/myfirstapp
              \nRuns validation suite on the app`,
  'pack'    : `${boldify('USAGE:')}fdk pack [--app-dir DIR]
              ${boldify('OPTIONS:')}--app-dir    DIR where DIR is the path to the directory that contains the manifest file. If this option is not specified, the current directory is assumed to contain the manifest file.
             ${boldify('EXAMPLE:')}$ fdk pack\n\t$ fdk pack --app-dir /Users/user/myfirstapp
              \nPacks the app into a zip file after running a validation suite. You can upload this file to the marketplace by following the instructions at https://developer.freshdesk.com/v2/docs/freshdesk-apps/`,
  'version' : `${boldify('USAGE:')}fdk version
              ${boldify('EXAMPLE:')}$ fdk version
              \nDisplays the installed and latest version of the Freshworks CLI tool`,
  'generate': `${boldify('USAGE:')}fdk generate
              ${boldify('EXAMPLE:')}$ fdk generate
              \nGenerates configuration files like oauth_config.json, iparams.json, iparams.html etc.`
};

function printProductDocUrls() {
  /**
    * Lazy loading productInfoUtil to ensure addon is available (downloaded)
    */
  const productInfoUtil = require('../utils/product-info-util');
  const productDocUrls = productInfoUtil.getProductDoc();

  console.log('For fdk documentation please visit:');
  Object.keys(productDocUrls).forEach(product => console.log(`${product}\t${productDocUrls[product]}`));
}

function printHelp(command) {
  console.log(MESSAGES[command]);
}

module.exports = {
  printHelp,
  printProductDocUrls
};
