var express = require('express');
var systemOperations = require('./systemOperations');
var notificationController = require('./notification');

var router = express.Router();
router.route('/System/Licenses').get(systemOperations.licensesAvailable);
router.route('/Notificacion/Enviar').post(notificationController.sendNotification);
//-- Limpiar los usuarios 
router.route('/clear').get(systemOperations.clearDataBase); //?empresa 
router.route('/session/close').get(systemOperations.cerrarSession);//?empresa & idUsuario
router.route('/sockets/clear').get(systemOperations.clearSockets);//
//-- 
router.route('/licencias').get(systemOperations.getLicenciasEmpresa);//?empresa
router.route('/licencias/agentes').get(systemOperations.getAgentes);//?empresa
router.route('/licencias/clientes').get(systemOperations.getClientes);//?empresa
//-- Get infor de empresa enviando el parametros de "empresa={nombre}"
router.route('/').get(systemOperations.getInfoEmpresa);//?empresa
module.exports = router;