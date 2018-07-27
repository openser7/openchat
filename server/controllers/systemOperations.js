var mongoose = require('mongoose');
var userModel = mongoose.model('user');
var request = require('request');
/*
 * Carga la informacion de una empresa "WebService"
 */
exports.getInfoEmpresa = function (req, res) {
	if (req.query && req.query.empresa) {
		if(global.config.debug)console.log("Get Info - " + req.query.empresa);
		var query = ' select Cliente.*, IdGoogle as GoogleId, Google.Secreto as GoogleSecret,' +
			' FolderWeb ' +
			' SAML, Google, LogOut, LogOutSAML, ' +
			' IdTipoVersion, Version.Comercial as Version, Version.Nombre as VersionApp' +
			' from Cliente' +
			' left join Google on Google.IdCliente = Cliente.IdCliente' +
			' left join Cognito on Cognito.IdCliente = Cliente.IdCliente' +
			' left join Configuracion on Configuracion.IdCliente = Cliente.IdCliente ' +
			' left join Version on Version.IdVersion = Cliente.IdVersion ' +
			" where Cliente.Nombre = '" + req.query.empresa + "' ";
		var request = new global.sql.Request();
		request.query(query, function (err, resultado) {
			if (err) {
				res.send(500, err);
			}
			if (resultado.recordset.length > 0) {
				var cliente = resultado.recordset[0];
				res.status(200).jsonp(cliente);
			} else if (resultado.length == 0) {
				res.status(200).jsonp('empty');
			}
		});
	} else {
		res.send(500, 'Request Error');
	}
}

exports.clearDataBase = function (req, res) {//Metodo para limpiar las licencias y usuarios
	try {
		userModel.remove({ 'room': req.query.empresa }, function (err) {
			if (err) res.send(500, err);
			else {
				res.send(200, 'ClearDatabase');
			}
		});
	} catch (error) {
		res.send(500, error.toString());
	}
}

exports.cerrarSessionUsuario = function (empresa, idUsuario) {
	userModel.find({ 'room': empresa, 'IdUsuario': idUsuario }, function (err, result) {
		try {
			if (err) res.send(500, err);
			else if (result && result.length > 0) {
				Object.keys(io.sockets.connected).forEach(function (key) { //Enviar el total a todos, para que vean que se incremento los usuarios conectados
					var socket = io.sockets.connected[key];
					if (socket.Model.IdUsuario == result[0].IdUsuario) {//Cerrar session del usuario encontrado
						socket.emit('session close');
					}
				});
			} else if (result.length == 0) {
				if(global.config.debug)console.log('Usuario para cerrar session no encontrado systemoperations.62');
			}
		}
		catch (x) {
			if(global.config.debug)console.log('Usuario para cerrar session no encontrado systemoperations'+x.toString());
		}
	});
}
/**
 * Servicio web /session/close
 * @param {} req 
 * @param {*} res 
 */
exports.cerrarSession = function (req, res) {
	if (req.query && req.query.empresa && req.query.usuario) {
		this.Controllers.systemOperations.cerrarSessionUsuario(req.query.empresa, req.query.usuario);
		res.status(200).jsonp('session close send ');
	} else {
		res.send(500, 'Request Error');
	}
}
/**
 * Servicio para regresar los agentes 
 * @param {*} req 
 * @param {*} res 
 */
exports.getAgentes = function (req, res) {
	if (req.query && req.query.empresa) {
		userModel.find({ 'room': req.query.empresa }, function (err, result) {
			if (err) res.send(500, err);
			else if (result && result.length > 0) {
				var agentes = [];
				result.forEach(function (usuario) {
					if (usuario.sockets.length > 0) {
						if (usuario.IdTipoRol != "2") {
							usuario.Imagen = '';
							agentes.push(usuario);
						}
					}
				});
				res.status(200).jsonp(agentes);
			} else if (result.length == 0) {
				res.status(200).jsonp('empty');
			}
		});
	} else {
		res.send(500, 'Request Error');
	}
}
/**
 * Servicio para regresar los clientes
 * @param {*} req 
 * @param {*} res 
 */
exports.getClientes = function (req, res) {
	if (req.query && req.query.empresa) {
		userModel.find({ 'room': req.query.empresa }, function (err, result) {
			if (err) res.send(500, err);
			else if (result && result.length > 0) {
				var clientes = [];
				result.forEach(function (usuario) {
					if (usuario.sockets.length > 0) {
						if (usuario.IdTipoRol == "2") {
							usuario.Imagen = '';
							clientes.push(usuario);
						}
					}
				});
				res.status(200).jsonp(clientes);
			} else if (result.length == 0) {
				res.status(200).jsonp('empty');
			}
		});
	} else {
		res.send(500, 'Request Error');
	}
}
/**
 * Servicio para regresar los agentes y los clientes conectados
 * @param {*} req 
 * @param {*} res 
 */
exports.getLicenciasEmpresa = function (req, res) {
	if (req.query && req.query.empresa) {
		userModel.find({ 'room': req.query.empresa }, function (err, result) {
			if (err) res.send(500, err);
			else if (result && result.length > 0) {
				var agentes = [], clientes = [];
				result.forEach(function (usuario) {
					if (usuario.sockets.length > 0) {
						if (usuario.IdTipoRol != "2")
							agentes.push(usuario.NombreCompleto);
						else
							clientes.push(usuario.NombreCompleto);
					}
				});
				res.status(200).jsonp({
					'agents': agentes,
					'customers': clientes
				});
			} else if (result.length == 0) {
				res.status(200).jsonp('empty');
			}
		});
	} else {
		res.send(500, 'Request Error');
	}
}
/*
 * Carga la configuracion Inicial (socket.io ) del evento Connect
 */
exports.getSystemConfiguration = function (socket, callback) {
	if (socket.handshake.query.enterprise) {
		var query = "select * from Cliente where Nombre = '" + socket.handshake.query.enterprise + "' ";
		var request = new global.sql.Request();
		// query to the database and get the records
		request.query(query, function (err, resultado) {
			if (err) return callback(null, err);
			if (resultado.recordset.length > 0) {
				var cliente = resultado.recordset[0];
				if(global.config.debug)console.log(cliente);
				return callback(cliente, false)
			}
		});
	}
}


/*
 * Checa las licencias por Enterprise, validar si se llega al tope cerrar la session al usuario nuevo...
 */
exports.getTotalInstances = function (room, nombreEmpresa, limiteLicencias, socketInicioSession) {
	var roomEntrada = room;
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' }, 'room': room }, function (err, result) {

		if (result && result.length > 0) {
			if (result.length > limiteLicencias) {
				if (socketInicioSession != null) {
					socketInicioSession.emit('limite license');
				}
			} else {
				Object.keys(io.sockets.connected).forEach(function (key) { //Enviar el total a todos, para que vean que se incremento los usuarios conectados
					var socket = io.sockets.connected[key];
					if (socket.rooms[roomEntrada] != null) {
						socket.emit('total instance', {
							total: result.length,
							limit: limiteLicencias,
						});
					}
				});
			}
		}
	});
}
/**
 * Obtener el total de licencias disponibles for room (cliente)
 * @param {*} req 
 * @param {*} res 
 */
exports.licensesAvailable = function (req, res) {
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' } }, function (err, result) {
		if (err) res.send(500, err.message);
		if(global.config.debug)('GET /Licencias')
		var resValue = { available: true };
		if (result && result.length) //Ya no existe esta  propiedad
			resValue.available = true;
		else
			resValue.available = false;
		res.status(200).jsonp(resValue);
	});
};
