var express = require('express');
var systemOperations = require('./systemOperations');
var notificationController = require('./notification');
var usuarioController = require('./usuario');

var router = express.Router();
router.route('/System/Licenses').get(systemOperations.licensesAvailable);
router.route('/Notificacion/Enviar').post(notificationController.sendNotification);
router.route('/Usuario/Actualizar').post(usuarioController.actualizarInfoUsuarios);
router.route('/System/Update').post(systemOperations.updateSystemConfiguration);

module.exports = router;