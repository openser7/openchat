var mongoose = require('mongoose');
var userModel = mongoose.model('user');
var request = require('request');
/*
 * Carga la informacion de una empresa "WebService"
 */
exports.getInfoEmpresa = function(req, res)  {
	if (req.query && req.query.empresa) {
		console.log("Get Info - "+req.query.empresa);
		var query = ' select Cliente.*, IdGoogle as GoogleId, Google.Secreto as GoogleSecret,'+
					' FolderWeb '+
					' SAML, Google, LogOut, LogOutSAML, '+
					' IdTipoVersion, Version.Comercial as Version, Version.Nombre as VersionApp'+
					' from Cliente'+
					' left join Google on Google.IdCliente = Cliente.IdCliente'+
					' left join Cognito on Cognito.IdCliente = Cliente.IdCliente'+
					' left join Configuracion on Configuracion.IdCliente = Cliente.IdCliente '+
					' left join Version on Version.IdVersion = Cliente.IdVersion '+
					" where Cliente.Nombre = '"+req.query.empresa+"' ";
		var request = new global.sql.Request();
		request.query(query, function(err, resultado) {
			if(err){
				res.send(500, err);
			}
			if (resultado.recordset.length > 0) {
				var cliente = resultado.recordset[0];
				res.status(200).jsonp(cliente);
			}
		});
	} else {
		res.send(500, 'Peticion no valida');
	}
}
/*
 * Carga la configuracion Inicial (socket.io ) del evento Connect
 */
exports.getSystemConfiguration = function(socket, callback) {
	if (socket.handshake.query.enterprise) {
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
exports.getTotalInstances = function(room, nombreEmpresa, limiteLicencias) {
	var roomEntrada = room;
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' }, 'room': room }, function(err, result) {
		if (result && result.length > 0 ) {
			Object.keys(io.sockets.connected).forEach(function(key) {
			  var socket = io.sockets.connected[key];
			  if(socket.rooms[roomEntrada] != null){
					socket.emit('total instance', {
							total: result.length,
							limit: limiteLicencias,
					});
			  }
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
