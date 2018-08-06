var mongoose = require('mongoose');
var userModel = mongoose.model('user');
var ticketModel = mongoose.model('ticket');
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
                if (global.config.debug) console.log(cliente);
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

exports.ticketSave = function (ticket, enterprise) {
    var ticket = new ticketModel(ticket);
    ticket.Empresa = enterprise;
    ticket.save(function (err, ticketNew) {
        if (err) console.log(err);
        else {
            console.log('Ticket Registrado');
        }
    });
}

exports.cerrarSessionUsuario = function (empresa, idUsuario, socketAdministrador) {
    var adminSocket = socketAdministrador;
    userModel.find({ 'room': empresa, 'IdUsuario': idUsuario }, function (err, result) {
        try {
            if (err) res.send(500, err);
            else if (result && result.length > 0) {
                var usuario = result[0];
                var sinConexion = 0;
                for (i = 0; i < usuario.sockets.length; i++) {
                    if (io.sockets.sockets[usuario.sockets[i]] != null) {
                        io.sockets.sockets[usuario.sockets[i]].emit('session close');//Se envia cerrar session a todos los sockets conectados
                    } else {
                        sinConexion++; //Si se encuentra alguno sin conexion
                    }
                }
                if (sinConexion == usuario.sockets.length) {//Se marca como desconectado y se vacia el arreglo de conexiones
                    var statusAnterior = usuario.Status;
                    usuario.Status = 0;
                    usuario.sockets = [];
                    usuario.disconnect = true;
                    usuario.save(function (err, user) {
                        if (err) console.log(err);
                        io.to(user.room).emit('update user status', { userData: user._doc, oldStatus: statusAnterior }); //Enviar que se decremento el total de licencias usadas
                        //Enviar el enviar el total de intancias si es desde webservice
                        var socket = adminSocket;
                        if (socket != null) global.Controllers.session.getTotalInstances(user.room, socket.configEnterprise.Nombre, socket.configEnterprise.Licencias, null);
                    });
                }
            } else if (result.length == 0) {
                if (global.config.debug) console.log('Usuario para cerrar session no encontrado systemoperations.62');
            }
        }
        catch (x) {
            if (global.config.debug) console.log('Usuario para cerrar session no encontrado systemoperations' + x.toString());
        }
    });
}