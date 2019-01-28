io.sockets.on('connection', function (socket) {
    /*
     * funcion y evento del socket que compara versión de usuario y actual, 
     */
    /*
    function validateVersion(currentVersion) {
        var versionFile = fs.readFileSync('./version.json');
        var fileInformation = JSON.parse(versionFile.toString().trim());
        var actionObj = { Detalle: 'No hay actualizaciones.', reload: false };
        if (versionFile && fileInformation) {
            if (currentVersion != fileInformation.Version) {
                actionObj.Detalle = fileInformation.Detalle;
                actionObj.reload = true;
                actionObj.Fecha = new Date();
            }
        }
        return actionObj;
    }
    */
    /*
     * Evento que te elimina de usuarios conectados, 
     */
    /*
    socket.on('check for updates', function (currentVersion) {
        var versionValidation = validateVersion(currentVersion);
        socket.emit('update application', validateVersion(currentVersion));
    });*/

    /**
     * TODO FALTA RECIBIR EL ID..
     */
    socket.on('MobileD', function (localStorage, callback) {
        if (localStorage) {
            global.Controllers.user.deleteSocketMobile(localStorage, function (err) {
                callback(err);
            });
        }
    });


    /**
     * Recepcion del evento de new user, para crear el usuario en la base de datos, o actualizarlo, y asu vez informar a los demas sockets que estas en linea.
     * data = localStorage del cliente (Browser)
     */
    socket.on('connect user', function (localStorage, browserTabInfo, appVersion) {
        global.Controllers.session.getSystemConfiguration(socket, function (responseJson, error) { //Consultar sql server para validar el total
            if (error) {
                console.log('ERROR NO SE PUEDE OBTENER LAS INFORMACION DE SQL SERVER PARA LAS EMPRESAS');
                console.log(error);
                socket.disconnect(0); //Desconectar si no exite el serial
            } else {
                if (responseJson.Nombre === socket.handshake.query.enterprise) {//el nombre de la empresa de la base de datos coincide con el query enviado en el evento conect.
                    //SUPER IMPORTANTE
                    socket.join(responseJson.Nombre);  //Agregarlo al ROOM segun el nombre de empresa
                    socket.configEnterprise = responseJson;//Cargar la informacion de empresarial
                    if(localStorage != null){
                        global.Controllers.user.connectUser(localStorage, socket, function (err, userModel) { // Si el userModel es Null quiere decir que no hay licencias
                            if (err) {
                                console.log(err);
                            } else {
                                //INFORMAR a todo el ROOM que QUE EL USARIO ESTA ONLINE
                                if (userModel.IdTipoRol != "2") {
                                    io.to(userModel.room).emit('user online', userModel);
                                }
                                // ACTUALIZAR INFORMACION DEL USUARIO 
                                socket.emit('session', {
                                    session: userModel.session,
                                    _id: userModel._id
                                });
                                socket.emit('enterprise', responseJson);
                                // VARIABLES AUXILIARPES PARA SABER A QUIEN PERTENECE EL SOCKET
                                socket.Model = userModel;
                                //DESPUES DE ACTUALIZAR LA INFORMACION DEL USUARIO SE ENVIARA LA LISTA DE USUARIOS DE LA EMPRESA QUE ESTEN "ONLINE"
                                if (global.config.debug && userModel.NombreCompleto) console.log('Enviar lista de usuarios de su ROOM a ' + userModel.NombreCompleto);
                                global.Controllers.user.getUsersChatList(userModel, function (err, usersList) {
                                    if (err) console.log(err);
                                    else {
                                        socket.emit('users online', usersList);
                                    }
                                });

                                if (global.config.debug && userModel.NombreCompleto) console.log('Enviar el total de instancias ' + userModel.NombreCompleto);
                                global.Controllers.session.getTotalInstances(userModel.room, socket.configEnterprise.Nombre, socket.configEnterprise.Licencias, socket);

                            }
                        });
                    } else {
                        console.log('localstorage vacio.');
                        socket.disconnect(0);
                    }
                } else {
                    socket.disconnect(0); //Desconectar sin no existe esa empresa en la base de datos
                }
            }
        });
    });

    /**
     * Cambiar a un canal para enviar a un cliente o room
     */
    socket.on('cambiar-room', function (data) {
        socket.leave('public'); //Desconecta del canal default
        socket.join(data); //Une el socket a canal nuevo
        socket.emit('cambiar-room', data) //la señal del cambio de canal al cliente
    });
    socket.on('send message room', function (mensaje) {
        //io.sockets.in('public').emit('new message group', {
        //    msg: mensaje,
        //    CveUsuario: socket.CveUsuario
        //});
    });

    socket.on('send alert', function (mensaje) {
        clientAlert(mensaje);
    });

    /**
     * Metodo para notificar a todos los usuarios conectados
     * @param {} str 
     */
    function clientAlert(str) {
        socket.emit('new alert', str);
    }

    /*
     * Recibe la señal de enviar el mensaje privado a otro usuario 1:1 
     */
    socket.on('send message private', function (mensaje, toUser) {
        global.Controllers.conversation.registerMessage(this, toUser, mensaje,
            function (err, menssage, receptor, author) {
                if (err) console.log('ocurrio un error: ' + err);
                else {
                    // Enviar mensajes a los sockets del destinatario
                    receptor.sockets.forEach(function (toSocket) {//Enviar al socket especifico 
                        io.to(toSocket).emit('new message private', {
                            message: menssage,
                            author: author
                        });
                    });
                }
            });
    });

    /*
     * Evento que marca un mensaje como leeido cuando el usuario tiene activa la conversacion.
     */
    socket.on('message read', function (toUser) {
        var fromUser = this.Model;
        var remoteUser = null;
        try {
            if (global.config.debug) console.log(fromUser.NombreCompleto + ' Marca como leidos los mensajes de ' + toUser.NombreCompleto);
            global.Controllers.user.findById(toUser._id, function (err, userModel) {
                //Setear el usuario remoto
                remoteUser = userModel;
                global.Controllers.conversation.getConversationByUsers([fromUser, remoteUser], 0, function (err, conversation) { //Get Conversation        
                    if (conversation.length > 0) {
                        global.Controllers.conversation.setMessagesAsSeen(remoteUser._id, conversation, function (err) {
                            if (err) console.log(err);
                            else {
                                // Enviar el visto a los sockets del destinatario
                                remoteUser.sockets.forEach(function (toSocket) {//Enviar al socket especifico
                                    io.to(toSocket).emit('messages read', fromUser);
                                });
                            }
                        });
                    }
                });
            });
        }
        catch (e) {
            console.log('Error al message read');
        }
    });

    /*
    *   Obtener los mensajes de una conversacion
    */
    socket.on('get conversation', function (toUser) {
        var fromUser = this.Model;
        global.Controllers.user.findById(toUser._id, function (err, remoteUser) {
            global.Controllers.conversation.getConversationByUsers([fromUser, remoteUser], 0, function (err, conversation) {
                if (err) console.log(err);
                else global.Controllers.conversation.getMessagesByConversation(conversation, function (err, messages) {
                    if (err) console.log(err);
                    else socket.emit('load conversation', messages);
                });
            });
        });
    });

    /*
     * Obtiene el total de mensajes no leidos de n conversaciones. para un usuario
     */
    socket.on('unseen count', function (forUser) {
        global.Controllers.conversation.getCountUnseenMsg(forUser, function (err, result) {
            if (err) console.log(err);
            else {
                socket.emit('draw badges unseen msgs', result);
            }
        })
    });   /*
    * Evento que envia la señal de zumbido
    */
    socket.on('zumbido', function (fromNameUser, toUser) {
        id = global.mongoose.Types.ObjectId(toUser);
        global.Controllers.user.findById(id, function (err, user) {
            if (user) {
                for (i in user.sockets) {
                    io.to(user.sockets[i]).emit('zumbido', fromNameUser);
                }
            }
        });
    });
    /*
     * Evento que envia la señal de writing message private
     */
    socket.on('writing message private', function (fromNameUser, toUser) {
        id = global.mongoose.Types.ObjectId(toUser);
        global.Controllers.user.findById(id, function (err, user) {
            if (user) {
                for (i in user.sockets) {
                    io.to(user.sockets[i]).emit('writing message private', fromNameUser);
                }
            }
        });
    });
    /*
     * Evento que Cambia el estatus. Mueve un usuario de un grupo(status) del chat a otro.
     */
    socket.on('change-status', function (localStorage, oldStatus) {
        if (global.debug) console.log('Cambio de status para el usuario :' + localStorage.CveUsuario);
        global.Controllers.user.changeStatus(localStorage, socket, function (err, userUpdated) {
            if (err) console.log(err);
            else {//Emitir el evento al room especifico
                io.to(userUpdated.room).emit('update user status', { userData: userUpdated, oldStatus: oldStatus });
            }
        });
    });
    /**
    * Envia nuevo notificacion de actualizacion a usuarios.
    */
    socket.on('sent update notification', function () {
        /*var versionFile = fs.readFileSync('./version.json');
        var updateInformation = JSON.parse(versionFile.toString().trim());
        io.to('QA').emit('update application', updateInformation);*/
    });

    /*
     * Evento que te elimina sockets de usuarios conectados, 
     */
    socket.on('disconnect', function (reason) {
        var socket = this;
        if (socket.Model) {
            if (global.config.debug && socket.Model.NombreCompleto) console.log('disconnect - ' + socket.Model.NombreCompleto);
            global.Controllers.user.deleteSocketForUser(socket, function (err, user, socket, statusAnt) {
                if (err) console.log(err);
                else {
                    if (user.disconnect) { //Si se cerro el ultimo socket avisar que esta como desconectado
                        if (user.sockets.length <= 0)
                            io.to(user.room).emit('update user status', { userData: user._doc, oldStatus: statusAnt }); //Enviar que se decremento el total de licencias usadas
                        global.Controllers.session.getTotalInstances(user.room, socket.configEnterprise.Nombre, socket.configEnterprise.Licencias, null);
                    }
                }
            });
        }
    });

    /**
     * Evento emitido por un administrador para cerrar la session de un usuario especifico de su empresa
     */
    socket.on('session close', function (userData) {
        var socket = this;
        global.Controllers.session.cerrarSessionUsuario(userData.room, userData.IdUsuario, socket);
    });
    /*
     * Evento para log off... se eliminan y desconectan todos los sockets de usuario.
     */
    socket.on('logoff', function (userData, browserTabInfo) {
        var socket = this;
        if (socket && socket.Model) {
            global.Controllers.user.logOff(userData, socket, function (err, user) {
                if (err) console.log("Error:  " + err);
                else {
                    if (user && user.sockets.length > 0) { //Emitir la orden de cerrar session a todas las pestañas del navegador                            
                        for (var i = 0; i < user.sockets.length; i++) {
                            socket.to(user.sockets[i]).emit('cierre de session');
                        }
                        //Emitir el cambio de estatos a desconectado
                        //io.to('QA').emit('update user status', { 'userData': user, 'oldStatus': userData.Status });
                        global.Controllers.session.getTotalInstances(user.room, socket.configEnterprise.Licencias, null);
                    } else {
                        socket.disconnect();
                    }
                }
            });
        } else {
            socket.disconnect();
        }
    });
    socket.on('ticket', function (ticket, enterprise) {
        if (global.config.debug) {
            global.Controllers.session.ticketSave(ticket, enterprise);
        }
    });
});

