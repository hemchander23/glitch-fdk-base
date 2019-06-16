'use strict';

const debuglog = __debug.bind(null, __filename);

const os = require('os');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const path = require('path');
const ws = require('express-ws');

const _ = require('lodash');

const addonVersion = require('../utils/product-info-util').getAddonVersion();
const appRouter = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/routes/app.js`);
const eventsRouter = require('../routes/beevents.js');
const dpRouter = require('../routes/data-pipe.js');
const configsRouter = require('../routes/configs.js');
const iframeRouter = require('../routes/iframe');
const oauthRouter = require('../routes/oauth2').oauthRouter;
const webEventsRouter = require('../routes/events.js');
const actionsRouter = require('../routes/actions.js');

const coverageUtil = require('../utils/coverage.js');
const dependencyInstaller = require('../utils/install');
const eh = require('../utils/err');
const fileUtil = require('../utils/file-util');
const httpUtil = require('../utils/http-util');
const manifest = require('../manifest');
const util = require('../utils/helper');
const validator = require('./validate');
const validationConst = require('../validations/constants').validationContants;
const watcher = require('../watcher');

const app = express();
const expressWs = ws(app);
const istanbulBodyParser = bodyParser.json({
  limit: '5MB'
});
const normalBodyParser = bodyParser.json();
const exWss = expressWs.getWss('/notify-change');
const productInfo = require('../utils/product-info-util');

const DOMAIN = productInfo.getTestLink();
const HTTP_PORT = 3000;
const WS_CLOSE_TIMEOUT = 4000;

const CACHED_VIEWS = {};

global.PLATFORM_SOURCE = 'PLATFORM';
global.APP_SOURCE = 'APP';

function logServerStartMsg() {
  const product = Object.keys(manifest.product)[0];

  console.log(`Starting local testing server at http://*:${HTTP_PORT}/\
    \nAppend 'dev=true' to your ${util.capitalize(product)} account URL to start testing\
    \ne.g. ${DOMAIN[product]}\
    \nQuit the server with Control-C.`);

  if (manifest.features.includes('backend')) {
    console.log(`\nTo simulate product, app setup, and external events, visit - http://localhost:${HTTP_PORT}/web/test`);
  }

  if (fileUtil.fileExists(`${process.cwd()}/config/iparams.html`)) {
    console.log(`To test the custom installation page, visit - http://localhost:${HTTP_PORT}/custom_configs`);
  }
}

module.exports = {
  run: (clearCoverage, skipCoverage, skipValidation) => {
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

    app.set('views', path.join(__dirname + '/../web/views'));

    app.engine('html', (templatePath, options = {}, callback) => {
      if (templatePath in CACHED_VIEWS) {
        return callback(null, _.template(CACHED_VIEWS[templatePath])(options));
      }

      fs.readFile(templatePath, (err, templateContent) => {
        if (err) {
          return callback(err);
        }

        CACHED_VIEWS[templatePath] = templateContent;

        /**
          * Provided selective template regex to make lodash skip ES6 template
          * literal ${}
          */
        return callback(null, _.template(templateContent, {
          interpolate: /<%=([\s\S]+?)%>/g
        })(options));
      });
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
        client.send(data);
      });
    });

    app.use(dpRouter);
    app.use(iframeRouter);
    app.use(configsRouter);
    app.use(eventsRouter);
    app.use(appRouter);
    app.use(webEventsRouter);
    app.use(oauthRouter);
    app.use(actionsRouter);

    // Finally, listen:
    const server = app.listen(HTTP_PORT, () => {
      if (manifest.features.includes('backend')) {
        dependencyInstaller.run((err) => {
          if (err) {
            console.log(err);
            process.exit(1);
          }
          logServerStartMsg();
        });
      } else {
        logServerStartMsg();
      }
    });

    process.on('uncaughtException', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Another instance of server running? Port in use.');
      }
      else {
        console.error(err);
      }
      process.exit(1);
    });

    return server;
  }
};
