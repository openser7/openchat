var mongoose = require('mongoose');
var userModel = mongoose.model('user');
var mailer = require('nodemailer');
var fs = require('fs');
var path = require('path');
var geoip = require('geoip-lite');

var DynamicsWebApi = require('dynamics-web-api');
var AuthenticationContext = require('adal-node').AuthenticationContext;

//OAuth Token Endpoint
var authorityUrl = "https://login.microsoftonline.com/fba44ac0-ba12-4ce6-9c49-3f2f2454a93c/oauth2/token";
//CRM Organization URL
var resource = 'https://grupoopen.crm.dynamics.com/';
//Dynamics 365 Client Id when registered in Azure
var clientId = 'd450e6b9-c6c7-46b3-97ac-eaf8992774c6';
var username = 'maleman@openservice.mx';
var password = 'qpr$37tt';
var adalContext = new AuthenticationContext(authorityUrl);

var correoscopiados = 'opensermx@gmail.com, maleman@openservice.mx, brodriguezs@openser.com, gmoran@openservice.mx, darevalo@openser.com,echavez@open.mx, mcastro@openservice.mx, ailed@openser.com, dreyes@openser.com';
var correoscopiadosError = 'opensermx@gmail.com, maleman@openservice.mx, brodriguezs@openser.com, gmoran@openservice.mx, darevalo@openser.com, rsaldivar@openser.com'
var correoPrincipal = "maleman@openser.com";
var debug = global.config.debug;

if (debug) {
	correoscopiados = 'rsaldivar@openser.com';
	correoscopiadosError = correoscopiados;
	correoPrincipal = 'roberto.saldivararm@gmail.com';
}

/*
 * Carga la informacion de una empresa "WebService"
 */
exports.getInfoEmpresa = function (req, res) {
	
	if (req.query && req.query.empresa) {
		//global.logger.info("Se Requirio la informacion de la empresa:"+ req.query.empresa+ " __ " + req.ip + "  __ "+ req.host + " __"+ req.connection.remoteAddress );
		if (global.config.debug) console.log("Get Info - " + req.query.empresa);
		var query = ' select Cliente.*, IdGoogle as GoogleId, Google.Secreto as GoogleSecret,' +
			' FolderWeb ,' +
			' Cognito.SAML as SAML, Google, LogOut, LogOutSAML, ' +
			' IdTipoVersion, Version.Comercial as Version, Version.Nombre as VersionApp' +
			' from Cliente' +
			' left join Google on Google.IdCliente = Cliente.IdCliente' +
			' left join Cognito on Cognito.IdCliente = Cliente.IdCliente' +
			' left join Configuracion on Configuracion.IdCliente = Cliente.IdCliente ' +
			' left join Version on Version.IdVersion = Cliente.IdVersion ' +
			" where Cliente.Nombre = '" + req.query.empresa + "' ";
		var request = new global.sql.Request(global.pool);
		request.query(query, function (err, resultado) {
			if (err) {
				res.send(500, err);
				return false;
			}
			if (resultado.recordset.length > 0) {
				var cliente = resultado.recordset[0];
				res.status(200).jsonp(cliente);
			} else if (resultado.length == 0) {
				res.status(200).jsonp('empty');
			}
		});
	} else {
		res.send(200, 'Ready');
	}
}


exports.saveLead = function (req, res) {
	global.logger.info("Guardar Lead:"+ req.query.empresa+ " __ " + req.ip + "  __ "+ req.host + " __"+ req.connection.remoteAddress );
	var PETICION  = req;
	var INFO = req.body;//INFO
	global.logger.info("LEAD INFO :"+ JSON.stringify(INFO));
	if (req.body.landing == null) {
		res.set({ 'content-type': 'application/json; charset=utf-8' });
		res.send(500, "Campaña requerida");
		return false;
	}
	if (INFO.nombre && INFO.email && INFO.telefono && INFO.landing && INFO.empresa) {

		//GUARDAR LED Base de datos empresarial.
		var query = "insert into Leads (Nombre, Descripcion, Email, Telefono, NumEmpleado, Origen, Landing, Empresa)" +
			" VALUES ('" + INFO.nombre + "','" + INFO.descripcion + "','" + INFO.email + "','" + INFO.telefono + "','" + INFO.numempleado + "','" + "" + "','" + INFO.landing + "','" + INFO.empresa + "')";
		var request = new global.sql.Request(global.pool);
		request.query(query, (err, resultado) => {
			if (err) {
				mailOptions.subject = "Lead " + req.body.landing + " " + req.body.nombre + " " + req.body.empresa;
				mailOptions.html = "Error Guardar Lead DB OpenSer <br>";
				mailOptions.html += "Ocurrio un error al guardar el LEAD en la base de datos : " + err.toString();
				mailOptions.html += reportError;
				mailOptions.from = "info@openser.com";
				mailOptions.to = correoPrincipal;
				mailOptions.cc = correoscopiadosError;
				//EMAIL A OPENSER
				mailerTransporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					}
					else {
						console.log(' Reporte error, Email enviado' + info.response);
					}
				});
				return false;
			}
		});

		var queryBuscarLead = "select Canal, Campania, IdCrmField from LeadLanding" +
			" where LandingPage = '" + INFO.landing + "' ";

		var ARMARTRACKING  = PETICION;
		request.query(queryBuscarLead, function (err, resultado) {
			if (err) {
				//res.send(500, "Canal y campaña no registrados en la base de datos.");
				console.log("Error no se encontro lead");
			} else {
				//Ahora que conocemos la info podemos guardar el LEAD en CRM
				//add a callback as a parameter for your function
				function acquireToken(dynamicsWebApiCallback) {
					//a callback for adal-node
					function adalCallback(error, token) {
						if (!error) {
							dynamicsWebApiCallback(token);
						}
						else {
							console.log('Token has not been retrieved. Error: ' + error.stack);
						}
					}
					//call a necessary function in adal-node object to get a token
					adalContext.acquireTokenWithUsernamePassword(resource, username, password, clientId, adalCallback);
				}

				//create DynamicsWebApi object
				var dynamicsWebApi = new DynamicsWebApi({
					webApiUrl: 'https://grupoopen.api.crm.dynamics.com/api/data/v9.1/',
					onTokenRefresh: acquireToken
				});

				var CrmField = 1000000 ;
				var idCanal = 8;
				if(resultado.recordset.length > 0){
					if (resultado.recordset.length > 0 && resultado.recordset[0].Canal == "Web") {
						idCanal = 8;
					} else {
						idCanal = 1;
					}
					CrmField = resultado.recordset[0].IdCrmField;
				}

				var numeroEmpleado = 10;
				
				if( INFO.numempleado.indexOf("500") > 0 && INFO.numempleado.indexOf("200") < 0){
					numeroEmpleado = 1000; 
				} else if (INFO.numempleado.indexOf("500") > 0 && INFO.numempleado.indexOf("200") > 0) {
					numeroEmpleado = 500; 
				} else if (INFO.numempleado.indexOf("50") > 0 && INFO.numempleado.indexOf("200") > 0) {
					numeroEmpleado = 200; 
				} else {
					numeroEmpleado = 50; 
				}

				var nombreCompletoArray = INFO.nombre.split(" ");
				var apellido = nombreCompletoArray[nombreCompletoArray.length - 1];
				var nombre = INFO.nombre.replace(apellido, "");

				var requestCrm = {
					collection: "leads",
					entity: {
						subject: "Openser",
						firstname: nombre,
						lastname: apellido,
						jobtitle: "",
						companyname: INFO.empresa,
						mobilephone: INFO.telefono,
						telephone1: INFO.telefono,
						description: INFO.descripcion != "" ? "Sin mensaje" : INFO.descripcion,
						emailaddress1: INFO.email,
						new_openser_landing_page : CrmField, 
						numberofemployees: numeroEmpleado,
						leadsourcecode: idCanal/**Sera consulta base de datos para conocer el dato, default 8 */
					},
					returnRepresentation: true
				}

				// //call dynamicsWebApi.createRequest function
				console.log("Emitiendo el guardar el lead");
				dynamicsWebApi.createRequest(requestCrm).then(function (record) {
					console.dir(record, { color: true });
					var subject = record.subject;
					var link = 'https://grupoopen.crm.dynamics.com/main.aspx?appid=bcd312fd-55b5-e811-a85d-000d3a14026a&pagetype=entityrecord&etn=lead&id='
					link += record.leadid;


					var mailerTransporter = mailer.createTransport(global.config.mail);

					var mailOptions = {};
					var reportError = "";
					mailOptions.subject = "Lead " + INFO.landing + " " + INFO.empresa;
					mailOptions.html = "Solicitud OpenSer <br>";
					mailOptions.html += "<hr>";
					mailOptions.html += "<br> <b>Nombre : </b>" + INFO.nombre;
					mailOptions.html += "<br> <b>Descripción : </b>" + INFO.descripcion;
					mailOptions.html += "<br> <b>Email : </b>" + INFO.email;
					mailOptions.html += "<br> <b>Teléfono : </b>" + INFO.telefono;
					mailOptions.html += "<br> <b>Empresa : </b>" + INFO.empresa;
					mailOptions.html += "<br> <b>Num Empleados : </b>" + INFO.numempleado;
					//mailOptions.html += "<br> <b>Origen : </b>" + INFO.origen;
					mailOptions.html += "<hr>";
					mailOptions.html += "<br> <b>Landing : </b>" + INFO.landing;
					mailOptions.html += "<br> <b>DynamicsLead : </b>  <a href='" + link + "'>Link</a>";
					mailOptions.html += "<br><br><br><br><br><br><br><br><br> " +ARMARTRACKING.rawHeaders.toString() ;
					mailOptions.html += "<br>Referrer : "+ INFO.referrer;
					mailOptions.html += "<br> GEO : " + JSON.stringify(geoip.lookup(ARMARTRACKING.rawHeaders[1]));
					mailOptions.from = "info@openser.com";
					mailOptions.to = correoPrincipal;
					mailOptions.cc = correoscopiados;

					reportError = mailOptions.html;

					var EMAILPROSPECTO = INFO.email;
					//EMAIL A OPENSER
					mailerTransporter.sendMail(mailOptions, function (error, info) {
						if (error) {
							console.log(error);
						}
						else {
							console.log('Email enviado al vendedor' + info.response);
							//=============================
							//EMAIL A PROSPECTO 

							var mailerTransporter = mailer.createTransport(global.config.mail);

							var mailOptionsProspecto = {};
							mailOptionsProspecto.from = "info@openser.com";//Email de Robot de marketing, ventas o info.
							mailOptionsProspecto.subject = "Gracias! "; // Subject de gratitud
							mailOptionsProspecto.to = EMAILPROSPECTO;//Enviar al que lleno la forma
							var rutaTemplate = path.resolve(global.appRoot + '/../client/public/lead/template.html');
							var template = fs.readFileSync(rutaTemplate);
							mailOptionsProspecto.html = template.toString();
							mailerTransporter.sendMail(mailOptionsProspecto, function (error, info) {
								if (error) {
									console.log(error);
								}
								else {
									console.log('Email enviado a Prospecto' + info.response);
								}
							});
						}
					});

				}).catch(function (error) {
					//catch error here
					console.log(error);
					var mailerTransporter = mailer.createTransport(global.config.mail);

					var mailOptions = {};
					var reportError = "";
					mailOptions.subject = "Lead " + INFO.landing + " " + INFO.empresa;
					mailOptions.html = "Solicitud OpenSer <br>";
					mailOptions.html += "<hr>";
					mailOptions.html += "<br> <b>Nombre : </b>" + INFO.nombre;
					mailOptions.html += "<br> <b>Descripción : </b>" + INFO.descripcion;
					mailOptions.html += "<br> <b>Email : </b>" + INFO.email;
					mailOptions.html += "<br> <b>Teléfono : </b>" + INFO.telefono;
					mailOptions.html += "<br> <b>Empresa : </b>" + INFO.empresa;
					mailOptions.html += "<br> <b>Num Empleados : </b>" + INFO.numempleado;
					//mailOptions.html += "<br> <b>Origen : </b>" + INFO.origen;
					mailOptions.html += "<hr>";
					mailOptions.html += "<br> <b>Landing : </b>" + INFO.landing;
					mailOptions.html += "<br> <b>DynamicsLead : </b>" + error.message ;
					mailOptions.html += "<br><br><br><br><br><br><br><br><br> " +ARMARTRACKING.rawHeaders.toString() ;
					mailOptions.html += "<br>Referrer : "+ INFO.referrer;
					mailOptions.html += "<br> GEO : " + JSON.stringify(geoip.lookup(ARMARTRACKING.rawHeaders[1]));
					mailOptions.from = "info@openser.com";
					mailOptions.to = correoPrincipal;
					mailOptions.cc = correoscopiados;

					reportError = mailOptions.html;

					var EMAILPROSPECTO = INFO.email;
					//EMAIL A OPENSER
					mailerTransporter.sendMail(mailOptions, function (error, info) {
						if (error) {
							console.log(error);
						}
						else {
							console.log('Email enviado al vendedor' + info.response);
							//=============================
							//EMAIL A PROSPECTO 

							var mailerTransporter = mailer.createTransport(global.config.mail);

							var mailOptionsProspecto = {};
							mailOptionsProspecto.from = "info@openser.com";//Email de Robot de marketing, ventas o info.
							mailOptionsProspecto.subject = "Gracias! "; // Subject de gratitud
							mailOptionsProspecto.to = EMAILPROSPECTO;//Enviar al que lleno la forma
							var rutaTemplate = path.resolve(global.appRoot + '/../client/public/lead/template.html');
							var template = fs.readFileSync(rutaTemplate);
							mailOptionsProspecto.html = template.toString();
							mailerTransporter.sendMail(mailOptionsProspecto, function (error, info) {
								if (error) {
									console.log(error);
								}
								else {
									console.log('Email enviado a Prospecto' + info.response);
								}
							});
						}
					});

				});
			}
		});

		res.status(200).jsonp(true);
	} else {
		res.send(500, 'Faltan Parametros Requeridos')
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
			if (err) {
				res.send(500, err);
				return false;
			}
			else {
				var modifiedUsers = [];
				users.forEach(function (user) {
					if (user.sockets.length > 0) {
						var sinConexion = 0;
						for (i = 0; i < user.sockets.length; i++) {
							if (io.sockets.sockets[user.sockets[i]] != null) {
								io.sockets.sockets[user.sockets[i]].emit('session close');//Se envia cerrar session a todos los sockets conectados
							} else {
								sinConexion++; //Si se encuentra alguno sin conexion
							}
						}
						if (sinConexion == user.sockets.length) {//Se marca como desconectado y se vacia el arreglo de conexiones
							user.Status = 0;
							user.sockets = [];
							user.disconnect = true;
							modifiedUsers.push(user.NombreCompleto + '-' + user.empresa);
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
			if (err) {
				res.send(500, err);
				return false;
			}
			else {
				res.send(200, 'ClearDatabase');
			}
		});
	} catch (error) {
		res.send(500, error.toString());
	}
}

/**
 * Servicio web /session/close
 * @param {} req 
 * @param {*} res 
 */
exports.cerrarSession = function (req, res) {
	if (req.query && req.query.empresa && req.query.usuario) {
		this.Controllers.session.cerrarSessionUsuario(req.query.empresa, req.query.usuario, null);
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
/**
 * Obtener el total de licencias disponibles for room (cliente)
 * @param {*} req 
 * @param {*} res 
 */
exports.licensesAvailable = function (req, res) {
	userModel.find({ 'Status': { $ne: 0 }, 'IdAgente': { $ne: '0' } }, function (err, result) {
		if (err) {
			res.send(500, err.message);
			return false;
		}
		if (global.config.debug) ('GET /Licencias')
		var resValue = { available: true };
		if (result && result.length) //Ya no existe esta  propiedad
			resValue.available = true;
		else
			resValue.available = false;
		res.status(200).jsonp(resValue);
	});
};
