var express = require('express');
var systemOperations = require('./systemOperations');
var notificationController = require('./notification');

var router = express.Router();
router.route('/System/Licenses').get(systemOperations.licensesAvailable);
router.route('/Notificacion/Enviar').post(notificationController.sendNotification);

module.exports = router;