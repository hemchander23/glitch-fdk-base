'use strict';

const debuglog = __debug.bind(null, __filename);

const bodyParser = require('body-parser');
const express = require('express');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');
const ws = require('express-ws');
const basicAuth = require('express-basic-auth');
const websocket = require('ws');

const _ = require('lodash');

const appRouter = require('../routes/app');
const eventsRouter = require('../routes/beevents');
const dpRouter = require('../routes/data-pipe');
const configsRouter = require('../routes/configs');
const iframeRouter = require('../routes/iframe');
const oauthRouter = require('../routes/oauth2').oauthRouter;
const webEventsRouter = require('../routes/events');
const actionsRouter = require('../routes/actions');

const coverageUtil = require('../utils/coverage-util');
const dependencyInstaller = require('../utils/install-util');
const eh = require('../utils/error-util');
const httpUtil = require('../utils/http-util');
const manifest = require('../manifest');
const util = require('../utils/helper-util');
const validator = require('./validate');
const validationConst = require('../validations/constants').validationContants;
const watcher = require('../watcher');
const configUtil = require('../utils/config-util');

const app = express();
var cred = {};
cred[process.env.FW_GLITCH_USER || 'admin'] = process.env.FW_GLITCH_PASSWORD || 'password';
//Home
app.get("/",function(req,res){
	var homeContent = "Check the README.MD";
	try{
	  homeContent = fs.readFileSync("/app/index.html");
	}catch(e){
	}
	res.status(200).type('text/html').send(homeContent);
});
//Set the basic auth to protect unauthorized access
if(!process.env.INSEC)
app.use(basicAuth({
	users: cred
}));

const expressWs = ws(app);
const istanbulBodyParser = bodyParser.json({
  limit: '5MB'
});
const normalBodyParser = bodyParser.json();
const textBodyParser = bodyParser.text({ type: '*/*' });
const exWss = expressWs.getWss('/notify-change');
const productInfo = require('../utils/product-info-util');

const DOMAIN = productInfo.getTestLink();
const HTTP_PORT = 3000;
const WS_CLOSE_TIMEOUT = 400000;

const CACHED_VIEWS = {};

const CONFIG_ASSETS = '/custom_configs/assets';

global.PLATFORM_SOURCE = 'PLATFORM';
global.APP_SOURCE = 'APP';

async function createTunnel(authToken) {
  try {
  console.log('Establishing ngrok tunnel. Please wait...');
  const tunnelUrl = await ngrok.connect({
    authtoken: authToken || '',
    addr: HTTP_PORT
  });

  eventsRouter.setTunnel(tunnelUrl);
  console.log(`\nTunnel Open. Tunnel URL: ${tunnelUrl}\n`);
} catch (err){
  console.error(`Error while establishing connection with tunnel host:\n${JSON.stringify(err, null, 2)}\nPlease verify authorization details`);
}
}

function logServerStartMsg() {
  const product = Object.keys(manifest.product)[0];

  console.log(`Starting local testing server at http://*:${HTTP_PORT}/\
    \nAppend 'dev=true' to your ${util.capitalize(product)} account URL to start testing\
    \ne.g. ${DOMAIN[product]}\
    \nQuit the server with Control-C.`);

  if (manifest.features.includes('backend')) {
    console.log(`\nTo simulate product, app setup, and external events, visit - http://localhost:${HTTP_PORT}/web/test`);
  }

  if (configUtil.hasConfig()) {
    console.log(`To test the installation page, visit - http://localhost:${HTTP_PORT}/custom_configs`);
  }
}

module.exports = {
  run: (clearCoverage, skipCoverage, skipValidation, enableTunnel, authToken) => {
    const validationMessages = validator.run(validationConst.RUN_VALIDATION, skipValidation);

    eh.printError('The local server could not be started due to the following issue(s):', validationMessages);

    if (clearCoverage) {
      debuglog('Clearing Coverage.');
      coverageUtil.dispose();
    }

    if (skipCoverage) {
      debuglog('Skipping Coverage.');
      coverageUtil.snooze();
    }

    if (authToken &&!enableTunnel){
      console.error('WARNING: Please pass --tunnel flag to enable tunnel. Only auth token has been passed');
    }

    app.set('views', path.join(__dirname + '/../web/views'));

    app.engine('html', (templatePath, options = {}, callback) => {
      if (!(templatePath in CACHED_VIEWS)) {
        const templateContent = fs.readFileSync(templatePath);

        CACHED_VIEWS[templatePath] = templateContent;
      }

      /**
        * Provided selective template regex to make lodash skip ES6 template
        * literal ${}
        */
      return callback(null, _.template(CACHED_VIEWS[templatePath], {
        interpolate: /<%=([\s\S]+?)%>/g
      })(options));
    });

    /**
     *  Istanbul might send back massive coverage reports as JSON.
     *  So have a body-parser with higher limits for that route
     *  alone.
     */
    app.use((req, res, next) => {
      if (req.path === '/iframe/coverage') {
        return istanbulBodyParser(req, res, next);
      }

      return normalBodyParser(req, res, next);
    });

    app.use(textBodyParser);

    app.use((req, res, next) => {
      httpUtil.enableCORS(res, req);

      next();
    });

    app.ws('/notify-change', (ws) => {
      if (process.env.NODE_ENV === 'test') {
        setTimeout(() => {
          ws.close();
        }, WS_CLOSE_TIMEOUT);
      }
    });

    watcher.watch((data) => {
      exWss.clients.forEach((client) => {
        // Checking the websocket is OPEN before sending
        if (client.readyState === websocket.OPEN) {
          client.send(data);
        }
      });
    });

    app.use(CONFIG_ASSETS, express.static(`${process.cwd()}/config/assets`));

    app.use(dpRouter);
    app.use(iframeRouter);
    app.use(configsRouter);
    app.use(eventsRouter);
    app.use(appRouter);
    app.use(webEventsRouter);
    app.use(oauthRouter);
    app.use(actionsRouter);
    app.use('/coverage', express.static('/app/workspace/coverage'));
    // Finally, listen:
    const server = app.listen(HTTP_PORT, async () => {
      if (manifest.features.includes('backend')) {
        await dependencyInstaller.run(manifest.dependencies);
      }

      if (enableTunnel) {
        await createTunnel(authToken);
      }

      logServerStartMsg();
    });

    process.on('SIGINT', async () => {
      if (enableTunnel) {
        console.log('\nClosing tunnel');
        await ngrok.kill();
        console.log('Tunnel successfully closed');
      }
    });

    process.on('uncaughtException', async (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Another instance of server running? Port in use.');
      }
      else {
        console.error(err);
      }
      if (enableTunnel) {
        await ngrok.kill();
        console.log('Tunnel closed');
      }
      process.exit(1);
    });

    return server;
  }
};
