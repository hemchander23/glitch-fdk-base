'use strict';

const debuglog = __debug.bind(null, __filename);

const oauth2Util = require('../routes/oauth2');

module.exports = {
  refresh: (req, res) => {
    debuglog('Refreshing oauth tokens');
    oauth2Util.refresh(req, res);
    debuglog('Refreshed OAuth.');
  }
};
