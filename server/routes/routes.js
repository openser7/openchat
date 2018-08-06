var express = require('express');
var systemOperations = require('./../controllers/webservice/systemOperations');
var notificationController = require('./../controllers/webservice/notification');

var router = express.Router();
router.route('/System/Licenses').get(systemOperations.licensesAvailable);//consulta obtener la cantidad de licencias disponibles
router.route('/Notificacion/Enviar').post(notificationController.sendNotification);//Utilizado por openser, para notificar a los usuarios que esten online
router.route('/webservice').post(function (req, res){ //Test WorfkFlow - WebService
    res.status(200).jsonp({
        body : req.body,
        query : req.query
    });  
});
router.route('/webservice').get(function (req, res){//Test WorkFlow - WebService
    res.status(200).jsonp({ 
        query : req.query
    });  
});
//-- Limpiar los usuarios 
router.route('/clear').get(systemOperations.clearDataBase); //?empresa 
router.route('/session/close').get(systemOperations.cerrarSession);//?empresa & idUsuario
router.route('/sockets/clear').get(systemOperations.clearSockets);
//-- Consultar Licencias
router.route('/licencias').get(systemOperations.getLicenciasEmpresa);//?empresa
router.route('/licencias/agentes').get(systemOperations.getAgentes);//?empresa
router.route('/licencias/clientes').get(systemOperations.getClientes);//?empresa
//-- Get infor de empresa enviando el parametros de "empresa={nombre}"
router.route('/').get(systemOperations.getInfoEmpresa);//?empresa
router.route('/lead/save').post(systemOperations.saveLead);//
module.exports = router;