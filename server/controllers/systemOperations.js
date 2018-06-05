var mongoose = require('mongoose');
var userModel = mongoose.model('user');
var request = require('request');
/*
 * Carga la configuracion Inicial
 */
exports.getSystemConfiguration = function(socket, callback) {
	if (socket.handshake.query.enterprise) {
		// request('http://52.207.170.18/Empresarial/Servicio.svc/json/Consultar?nombre=' + socket.handshake.query.enterprise, function (error, response, body) {
		// 	if(error) console.log('error:', error);
		// 	else if(response && response.statusCode == 200){
		// 		var responseJson = JSON.parse(body);
		// 		return callback(responseJson, false);
		// 	} else {			
		// 		return callback(null, error);		
		// 	}
		// });
		var query = "select * from Cliente where Nombre = '"+socket.handshake.query.enterprise+"' ";
		var request = new global.sql.Request();
			// query to the database and get the records
		request.query(query, function(err, resultado) {
			if (err) return callback(null, err);
			if (resultado.recordset.length > 0) {
				var cliente = resultado.recordset[0];
				console.log(cliente);
				return callback(cliente, false)
			}
		});

	}
}


/*
 * Checa las licencias por Enterprise
 */
exports.getTotalInstances = function(room, socket) {
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' }, 'room': room }, function(err, result) {
		if (result && result.length) {
			io.sockets.emit('total instance', {
				total: result.length,
				limit: socket.configEnterprise.Licencias,
			});
		}
	});
}
/**
 * Obtener el total de licencias disponibles for room (cliente)
 * @param {*} req 
 * @param {*} res 
 */
exports.licensesAvailable = function(req, res) {
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' } }, function(err, result) {
		if (err) res.send(500, err.message);
		console.log('GET /Licencias')
		var resValue = { available: true };
		if (result && result.length) //Ya no existe esta  propiedad
			resValue.available = true;
		else
			resValue.available = false;
		res.status(200).jsonp(resValue);
	});
};
