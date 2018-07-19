var express = require('express');
var systemOperations = require('./systemOperations');
var notificationController = require('./notification');

var router = express.Router();
router.route('/System/Licenses').get(systemOperations.licensesAvailable);
router.route('/Notificacion/Enviar').post(notificationController.sendNotification);
//-- Limpiar los usuarios 
router.route('/clear').get(systemOperations.clearDataBase);
router.route('/session/close').get(systemOperations.cerrarSession);
//-- 
router.route('/licencias').get(systemOperations.getLicenciasEmpresa);
router.route('/licencias/agentes').get(systemOperations.getAgentes);
router.route('/licencias/clientes').get(systemOperations.getClientes);
//-- Get infor de empresa enviando el parametros de "empresa={nombre}"
router.route('/').get(systemOperations.getInfoEmpresa);
module.exports = router;