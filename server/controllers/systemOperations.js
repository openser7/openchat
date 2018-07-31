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
/**
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.clearSockets = function (req, res) {//Metodo para limpiar las licencias y usuarios
	try {
		userModel.find({}, function (err, users) {
			if (err) res.send(500, err);
			else {
				var modifiedUsers =[];
				users.forEach(function(user){
					if(user.sockets.length > 0){
						var sinConexion = 0;
						for ( i= 0; i < user.sockets.length; i++){
							if( io.sockets.sockets[user.sockets[i]] != null){
								io.sockets.sockets[user.sockets[i]].emit('session close');//Se envia cerrar session a todos los sockets conectados
							}  else {
								sinConexion ++; //Si se encuentra alguno sin conexion
							}
						}
						if(sinConexion  == user.sockets.length){//Se marca como desconectado y se vacia el arreglo de conexiones
							user.Status = 0;
							user.sockets = [];
							user.disconnect = true;
							modifiedUsers.push(user.NombreCompleto+'-'+user.empresa);
							user.save(function (err, user) {
								if (err) console.log(err);         
							});
						}
					}
				});
				res.send(200, modifiedUsers);
			}
		});
	} catch (error) {
		res.send(500, error.toString());
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

exports.cerrarSessionUsuario = function (empresa, idUsuario, socketAdministrador) {
	var adminSocket = socketAdministrador;
	userModel.find({ 'room': empresa, 'IdUsuario': idUsuario }, function (err, result) {
		try {
			if (err) res.send(500, err);
			else if (result && result.length > 0) {
				var usuario = result[0];
				var sinConexion = false;
				for ( i= 0; i < usuario.sockets.length; i++){
					if( io.sockets.sockets[usuario.sockets[i]] != null){
						io.sockets.sockets[usuario.sockets[i]].emit('session close');//Se envia cerrar session a todos los sockets conectados
					}  else {
						sinConexion = true; //Si se encuentra alguno sin conexion
					}
				}
				if(sinConexion ){//Se marca como desconectado y se vacia el arreglo de conexiones
					var statusAnterior = usuario.Status;
					usuario.Status = 0;
					usuario.sockets = [];
					usuario.disconnect = true;
					usuario.save(function (err, user) {
						if (err) console.log(err);         
						io.to(user.room).emit('update user status', { userData: user._doc, oldStatus: statusAnterior }); //Enviar que se decremento el total de licencias usadas
						//Enviar el enviar el total de intancias si es desde webservice
						var socket = adminSocket;
						if(socket != null)global.Controllers.systemOperations.getTotalInstances(user.room, socket.configEnterprise.Nombre, socket.configEnterprise.Licencias, null);
					});
				}
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
		this.Controllers.systemOperations.cerrarSessionUsuario(req.query.empresa, req.query.usuario, null);
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
				io.to(roomEntrada).emit('total instance', {
					total: result.length,
					limit: limiteLicencias,
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
