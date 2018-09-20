var mongoose = require('mongoose');
var crypto = require('crypto');
//Models
var UserModel = mongoose.model('user');
//Controllers
var systemOperationsController = require('../webservice/systemOperations');
var historyController = require('./userHistory');

/**
 * Obtener el id del usuario por clave (ELIMINAR)
 */
exports.getIdUser = function (cveUsuario, callback) {
    UserModel.find({ CveUsuario: cveUsuario}, function (err, user) {
        if (err) console.log("No se encontro el usuario" + err);
        else callback(err, user[0]);
    });
};
/**
 * Obtener el id del usuario por _id 
 */
exports.findById = function (id, callback) {
    if(id != null){   
        UserModel.findById(id, function (err, user) {
            if (err) console.log("No se encontro el usuario" + err);
            else callback(err, user);
        });
    }
};
/**
 * Obtener el id del usuario, por clave y empresa (SOLO USADO PARA LOGEAR)
 * En el cliente debe tener el ID de usuario para hacer las operaciones
 */
exports.findByCveUsuario = function (userModel, callback) {
    var CveUsuario = userModel.CveUsuario ? userModel.CveUsuario : '';
    var Enterprise = userModel.Enterprise ? userModel.Enterprise : '';
    UserModel.find({ 'CveUsuario': CveUsuario, 'room': Enterprise }, function (err, user) {
        if (err) console.log("No se encontro el usuario" + err);
        else callback(err, user[0]);
    });
};

/**
 * Buscar por modelo Usuario o localStorage de cliente.
 */
exports.findByUser = function (user, callback) {
    var controller = this;
    this.findById(user._id, function (err, userDb) { //Se buscar por ID.
        if (err) console.log("No se encontro el usuario" + err);
        else {
            if( userDb == null){ //Si no lo encuentra por ID; lo buscar por CVEUSUARIO y EMPRESA
                controller.findByCveUsuario(user, callback);
            } else {
                callback(err, userDb);
            }
        }
    })
};
/*
 *  Log in de Usuario... ACtualiza los sockets o crea el usuario en la BD.
 *  userData es la info que viene del local Storage del navegador
 */
exports.connectUser = function (localStorage, socket, callback) {
    var ctrl = this;
    var socketActual = socket.id;

    var functionSaveUser = function (err, userModel) { 
        if (err) {
            callback(err, null);
        } else {         
            if( userModel == null){ //Si no existe en la BD Mongo
                if (global.config.debug) console.log('Agregar el user a Mongo ' + localStorage.CveUsuario);
                userModel = ctrl.converLocalStorageToUserModel(localStorage, userModel);   
                historyController.add(userModel, socketActual, localStorage.TFB, 'inicio de session');              
            }
            else { // Ya existe en la BD Mongo
                userModel = ctrl.converLocalStorageToUserModel(localStorage, userModel);
                if (userModel.session == localStorage.session) { // Misma Session, Nueva Pestaña             
                    historyController.add(userModel, socketActual, (localStorage.Mobile == "true"), 'conexión en la misma session');
                }  else {  //Diferente navegador o Computadora       
                    userModel.session = crypto.randomBytes(20).toString('hex');//Nueva Session
                    for (var i = 0; i < userModel.sockets.length; i++) { //Eliminar los sockets anteriores...
                        if (inRoom(userModel.sockets[i], userModel.Enterprise))
                            io.to(userModel.sockets[i]).emit('session iniciada previamente cerrar');
                            userModel.sockets.splice(i, 1);
                        i = i - 1;
                    }                       
                    historyController.add(userModel, socketActual, (localStorage.Mobile == "true"), 'conexión en nueva session');
                }     
            } 
            if( userModel.sockets.length <= 0){        //Agregar/Inicializar sockets          
                userModel.sockets = [socketActual];    // Nueva Session
            } else {                
                userModel.sockets.push(socketActual);  // Misma session 
            }
            if (localStorage.Mobile == "true") {      // Mobile
                if (userModel.socketMobile != null && userModel.socketMobile != undefined) {
                    if (inRoom(userModel.socketMobile, userModel.Enterprise)) {
                        io.to(userModel.socketMobile).emit('session iniciada previamente cerrar');
                    }
                }
                userModel.socketMobile = socket.id;
            } 
            if (localStorage.TFB != null) {           // TFB
                userModel.socketMobile = socket.id;
            }
            userModel.save(function (err, userModel) {
                callback(err, userModel);
            });
        }
    }
    ctrl.findByUser(localStorage, functionSaveUser);        
};
/**
 * Retorna el modelo de la base de datos o el que se agregara a la base de datos del usuario que se esta conectado.
 */
exports.converLocalStorageToUserModel = function(localStorage, userModel){
    if( userModel == null){    
        return new UserModel({
            room: localStorage.Enterprise,
            disconnect: false,                    
            CveUsuario: localStorage.CveUsuario,
            Nombre: localStorage.Nombre,
            NombreCompleto: localStorage.NombreCompleto,
            Status: localStorage.Status,
            IdAgente: localStorage.IdAgente,
            IdCliente: localStorage.IdCliente,
            IdPerfil: localStorage.IdPerfil,
            IdTipoRol: localStorage.IdTipoRol,
            Imagen: localStorage.Imagen,
            session : crypto.randomBytes(20).toString('hex'),
            tour : false,
            IdUsuario: localStorage.IdUsuario,
            TFB: localStorage.TFB 
        });        
    }
    //Actualizar las propiedades
    userModel.disconnect=false;                    
    userModel.Nombre=localStorage.Nombre;
    userModel.NombreCompleto=localStorage.NombreCompleto;
    userModel.IdPerfil=localStorage.IdPerfil;
    userModel.IdTipoRol=localStorage.IdTipoRol;
    userModel.Status=localStorage.Status; //Actualizar el Status
    userModel.Imagen=localStorage.Imagen;
    userModel.tour =  true ;
    userModel.IdUsuario=localStorage.IdUsuario;
    userModel.TFB=localStorage.TFB;
    return userModel;
}

/*
 * Get users list  for enterprise (room)
 */
exports.getUsersChatList = function (userModel, callback) {
    UserModel.find({ IdAgente: { $ne: '0' }, 'room': userModel.room  }, function (err, users) {
        callback(err, users);
    })
};


/*
 * Update users list  
 */
exports.changeStatus = function (localStorage, socket, callback) {
    this.findById(localStorage._id, function (err, userModel) {
        if (err) console.log("Al borrar socket:" + err);
        userModel.Status = localStorage.Status;//cambiar el status del registro guardado
        userModel.save(function (err, userModel) {
            callback(err, userModel);
            //Registrar usuario cambio de estatus           
            historyController.add(userModel, socket.id, false, 'cambio de estatus');
        });
    });
};

/*
 * Disconnect socket  
 */
exports.deleteSocketForUser = function (socket, callback) {
    this.findById(socket.Model._id, function (err, user) {
        if (err) console.log("Al borrar socket:" + err);
        else {
            if (user) {
                var socketIndex = user.sockets.indexOf(socket.id);
                if (socketIndex != -1) {//Si encontro el socket
                    user.sockets.splice(socketIndex, 1);//Eliminar ese socket 
                    
                    /**Verificar que socket io aun mantenga algun socket activo */
                    for (var i=user.sockets.length-1; i>=0; i--) {
                        if (io.sockets.sockets[user.sockets[i]] == null) {//Si uno de los socket no existe, se elimina
                            user.sockets.splice(i, 1);
                        }
                    }

                    var statusAnt = user.Status; //Uso : Identificar el estatus anterior en caso de desconectar el ultimo socket, asi anunciar su desconexión con un cambio de estatus
                    if (user.sockets.length == 0) {//Si los sockets estan vacios , marcar como desconectado
                        user.Status = 0;
                        user.disconnect = true;
                    }
                    user.save(function (err, user) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            //Registrar conexión cerrada
                            historyController.add(user, socket.id, false, 'conexión cerrada');
                            callback(err, user, socket, statusAnt);
                        }
                    });
                }
            }
        }
    });
};

/*
 * Funcion que se llama cuando se desloguea el usuario.
 */
exports.logOff = function (localStorage, socket, callback) {
    if (global.debug) console.log('Cierre de session de :' + localStorage.NombreCompleto);
    this.findById(localStorage._id, function (err, user) {
        if (err) { console.log(err); }
        else {
            if (user) { //Se setea en 0, puesto que el que cierra session tarda en responder.
                user.disconnect = true; //Marcar como desconectado
                user.Status = 0;//Marcarlo como desconectado
                callback(err, user);//Retornar el arreglo de socket, para emitir una señal y desconectarlos                 
                historyController.add(user, socket.id, false, 'cierre de session'); //Registrar usuario cambio de estatus          
            }
        }
    });
};

/**
 * Eliminar el socket, que usa el Mobile
 * @param {*} localStorage 
 * @param {*} callback 
 */
exports.deleteSocketMobile = function (localStorage, callback) {
    if (global.debug) console.log('Eliminar el socket mobile de :' + localStorage.NombreCompleto);
    this.findById(localStorage._id, function (err, user) {
        if (err) console.log("Al borrar socketMobile:" + err);
        else {
            if (user) {

                //Registrar conexion cerrada
                if (user.socketMobile) {
                    historyController.add(user, user.socketMobile, true, 'conexión cerrada mobile');
                }
                //Borra los datos del Mobile
                user.socketMobile = null;
                user.TFB = null;
                if (user.sockets.length == 0) {
                    user.Status = 0;
                    user.disconnect = true;
                }
                user.save(function (err, result) {
                    if (err) console.log(err);
                    else callback(err, result);
                });
            }
        }
    });
};

function inRoom(idSocket, chanelRoom) {
    var chanelRoom = 'publico';
    //Obtiene todos los socket conectados
    var clients = io.sockets.adapter.rooms[chanelRoom];
    var socketsInRoom = new Array();
    var inroom = true;
    if (clients != null && clients != undefined && clients.socket != null && clients.sockets != undefined) {
        for (var clientId in clients.sockets) {
            socketsInRoom.push(clientId);
        }
        var s = socketsInRoom.find(o => o === idSocket);
        if (s === undefined) {
            inroom = false;
        }
    }
    return inRoom;
}

