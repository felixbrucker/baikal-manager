'use strict';

var express = require('express');

module.exports = function(app) {
  var router = express.Router();

  var configController = require(__basedir + 'api/controllers/configController');
  var statsController = require(__basedir + 'api/controllers/statsController');

  router.get('/config', configController.getConfig);
  router.post('/config', configController.setConfig);
  router.post('/config/update', configController.update);
  router.get('/config/deploy', configController.deploy);

  router.get('/mining/stats', statsController.getStats);

  app.use('/api', router);
};
