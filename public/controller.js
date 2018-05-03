var socket = null;
var appVersion = '17.3.0.0'; // version general de la aplicacion.
var tiempoEspera = 172800; // Intentos
Ext.define('OpenSer.controller.SocketController', {
    extend: 'Ext.app.Controller',
    alias: 'controller.socketio',
    init: function () {
        var controller = this;
        var socketInit = false;
        if (socket != null) {
            return;
        }

        socket = io.connect($NODE_SERVER, {
            'query': 'serial=' + $NODE_SERIAL + '&enterprise=' + $ENTERPRISE,
            'transports': ['websocket'],
            'timeout': 3000, //3 Seg para timeout
            'forceNew': true,
            'reconnection': true,
            'reconnectionDelay': 500, //Intervalo entre intentos milisegundos
            'reconnectionAttempts': Infinity //Intentos
        });

        //Ext.getBody().mask('Node.js Server connecting...');
        console.log('Node.js Server connecting...');

        //Eventos de Conexion 
        socket.on('connect', function () {
            var browserTabInfo = { requestId: new Date() };
            //Pedir registo de el usuario en la base de datos o actualizar su info.
            socket.emit('connect user', localStorage, browserTabInfo, appVersion);
            //Perdir los mensajes no leidos mientras no estaba conectado
            socket.emit('unseen count', localStorage );
            //Guardar el id de socket por el cual esta emitiendo y recibiendo eventos 
            sessionStorage.IdSocket = socket.id + ',' + sessionStorage.IdSocket;
        });

        /*
         * Seccion de Eventos de Conexion
         */
        socket.on('error', function (reason) {
            if (!isClient()) {
                //Ext.getBody().mask(lang.error_wait);
            }
        });
        socket.on('connect_timeout', function () {
            ErrorEnConexion(lang.error_server_timeout);
        });
        socket.on('reconnect', function (e) {
            if (!isClient()) {
                //Ext.getBody().mask('Reconectando espere un momento...');
            }
        });
        socket.on('reconnect_error', function (e) { //Server caido
            //_$('#accordionContacts').mask('Reconectando Chat ... Error');
            ErrorEnConexion(lang.error_server_access);
        });
        socket.on('disconnect', function () {
            //Mata al socket socket.disconnect();
            console.log('se envio a disconnect socket..');
            ErrorEnConexion(lang.problem_connecting);
        });

        /**
        * SECCION DE EVENTOS PARA EL MANEJO DE LICENCIAS/USUARIOS 
        */

        //Eventos de la Session de Usuario  guardar el identificador de la session y el usuario.
        socket.on('session', function (data) {
            localStorage.session = data.session;
            localStorage._id = data._id; //Setear el valor de id de User de mongo db.
        });

        //Recibir la notitifacion que el usuario se ha conectado
        socket.on('user online', function (data) {
            $OPENSER.getController('Chat').updateChatUserStatus(data, 0);//Agregar a conectados, y eliminarlo de desconectados
            if (!Ext.isEmpty(_$('#usuariosChat').store.findExactRecord('CveUsuario', data.CveUsuario))) { //Solo si tienes conversaciones abiertas con el..
                notificacion({
                    title: data.Nombre,
                    icon: data.Imagen,
                    body: lang.is_online
                });

                if (!isClient())
                    alert(data.Nombre + lang.is_online, 'default', 'br', function () { }, 'fa-user-secret', function () { }, data);
                else
                    alert(data.Nombre + lang.is_online, 'default', 'br', function () { }, 'fa-user', function () { }, data);
            }
        });
        //Evento para cerrar la session 
        socket.on('session iniciada previamente cerrar', function (data) {
            Ext.Msg.alert(lang.warning, lang.session_started_another, function () { logOut(); });
        });
        //Notificar que se inicio sesion desde otro navegador
        socket.on('session iniciada previamente notificar', function (data) {
            console.log('Bienvenido ya se cerro la otra sesión activa.');
        });
        //Obtener el total de licencias o users conectados
        socket.on('total instance', function (data) {
            Ext.query('#users-online')[0].innerHTML = data.total + '/' + data.limit;
        });
        //Cerrar session automaticamente por que ya no se cuenta con licencias
        socket.on('limite license', function () {
            Ext.Msg.alert(lang.warning, lang.license_limit_reached, function () { logOff(); });
        });
        //Emitir el cierre de session al usuario 
        socket.on('cierre de session', function () {
            logOut();
        });


        /**
         * SECCION DE EVENTOS EMITIDOS PARA INTERACTUAR CON LAS CONVERSACIONES/USUARIOS
         */
        //Recibir la lista de usuario online
        socket.on('users online', function (data) {
            var refUsers = []; //Referencia a usuarios
            Ext.Object.each(data, function (index) { //Omitir el propio usuario de la session
                if (data[index].CveUsuario == localStorage.CveUsuario) data[index]['IsContact'] = false;
                else data[index]['IsContact'] = true; //Habilitarlo como contacto
                refUsers.push(data[index]);
            });
            var users = refUsers.slice(); //Copia de usuarios 
            var $users = _$QUERY('#usuariosConectados');
            if (users.length > 0) {
                $users.bindStore(Ext.create('Ext.data.Store', { data: users }));
                $users.refresh();

                $OPENSER.getController('Chat').updateChatList();
                var badgeChatTopBar = _$('chat-badge');
                if (badgeChatTopBar)
                    badgeChatTopBar.calculateBadge();

                if (!$users.userTo) {
                    var userRecord = $users.store.findExactRecord('CveUsuario', localStorage.CveUsuario);
                    if (userRecord)
                        $users.userTo = userRecord.data;
                }
            }
            $users.refresh();
        });

        // Recibir el ctualizar el estatus de 1 un Usuario con el estatus anterior de este (Ausente, Desconectado..)
        socket.on('update user status', function (data) {
            $OPENSER.getController('Chat').updateChatUserStatus(data.userData, data.oldStatus);
        });

        // Recibir mensaje privado
        socket.on('new message private', function (data) {
            $OPENSER.getController('Chat').showMessageRecived(data);
        });

        // Recibir mensaje leeido
        socket.on('messages read', function (CveUsuario) {
            $OPENSER.getController('Chat').changeReadingLocal(CveUsuario);
        })

        // Recibir escribiendo mensaje privado
        socket.on('writing message private', function (data) {
            $OPENSER.getController('Chat').showWriting(data);
        });

        // Recibir zumbido
        socket.on('zumbido', function (data) {
            $OPENSER.getController('Chat').showZumba(data);
        });

        // Eventos de Servidor Node Js
        socket.on('new alert', function (data) {
            alert(data.text, data.alertType);
        });

        // Recibir dato de usuario
        socket.on('update user data', function (usersList) {
            var isUserOnTheList = usersList.map(function (item) { return item; }).indexOf(localStorage.CveUsuario);
            if (isUserOnTheList != -1) {
                var serviceParameters = {
                    Url: getUrl(Servicio.Usuario, 'ObtenerUsuario'),
                    Metodo: 'GET',
                    Funcion: function (response) {
                        console.log(response);
                        for (var k in localStorage) {
                            if (response.hasOwnProperty(k)) {
                                localStorage[k] = response[k];
                            }
                        }
                    },
                };
                getService(serviceParameters);
            }
        });

        /**
        * SECCION DE APLICACION / NOTIFICACION
        */
        //Obtener las notificaciones
        socket.on('update application', function (updateInformation) {
            var fechaNotificacion = new Date().toString(lang.format_date + ' - hh:mm tt');
            var actualizacion = [
                {
                    xtype: 'notificationUpdate',
                    mensaje: updateInformation.Detalle,
                    fechaNotificacion: fechaNotificacion,
                }
            ];
            agregarElementos(actualizacion, 'pnlNotifications');
            _$('notificationsEmtpyLabel').hide();
            _$('badge-notifications').addTotalNotifications(1);
        });
        //Evento para mostrar una notificacion
        socket.on('new notification', function (data) {
            if (data.IdSocket != socket.id) {
                socket.emit('socketOld', localStorage, data, function (err) {
                    if (err == null) {
                        console.log('Delete Socket:' + data.IdSocket);
                    } else {
                        console.log('Error on Delete Socket:' + err);
                    }
                });

            } else {
                alert(data.Titulo, 'default', 'br', function () { }, 'fa-user-secret', function () { openResource(data.Id, data.Tipo); }, data);
                createSystemNotification(data);
            }
        });

        socket.on('show message', function (data) {
            console.log(data);
        });

        socket.on('load conversation', function (data) {
            $OPENSER.getController('Chat').renderConversation(data);
        });

        socket.on('draw badges unseen msgs', function (data) {
            $OPENSER.getController('Chat').drawBadgesNewMessages(data);
        });
    }
});

function ErrorEnConexion(strError) {
    if (!isClient() && localStorage.IdUsuario != null) {

        if (localStorage.TimeOut == null && (localStorage.blocked && !localStorage.blocked)) {
            localStorage.TimeOut = 0;
        }

        localStorage.TimeOut++;
        if (localStorage.TimeOut > tiempoEspera) {
            Ext.getBody().mask(strError);
            localStorage.blocked = true;
        } else if (localStorage.TimeOut % 1000 === 0) {
            alert(lang.error_socket_connection_first + ' ' + localStorage.TimeOut + ' ' + lang.of + ' ' + tiempoEspera + ' ' + lang.error_socket_connection_last, 'warning');
        }
    }
    if (localStorage.IdUsuario == null) {
        logOff();
    }
}

function openResource(id, tipo) {
    switch (tipo) {
        //Ticket
        case 1:
            location.href = '#Consult/' + id;
            break;
        case 2:
            break;
        default:
            break;
    };
}

function createSystemNotification(data) {
    var iconClass = 'fa fa-bell fa-6', fn = null;
    var fechaNotificacion = new Date().toString(lang.format_date + ' - hh:mm tt');
    if (data.hasOwnProperty('Fecha') && data.Fecha != null) {
        fechaNotificacion = convertirFecha(data.Fecha, false);
    }

    switch (data.Tipo) {
        //Tickets
        case 1: {
            fn = function () { location.href = '#Consult/' + data.Id; };
            iconClass = 'fa fa-ticket fa-6';
        }
            break;
        case 2:
            break;
        default:
            break;
    };

    var itemNotification = [
        {
            xtype: 'standardnotification',
            mensaje: data.Mensaje,
            fechaNotificacion: fechaNotificacion,
            titulo: data.Titulo,
            iconClass: 'fa fa-ticket fa-6',
            fn: fn,
        }
    ];
    _$('notificationsEmtpyLabel').hide();
    agregarElementos(itemNotification, 'pnlNotifications');
    _$('badge-notifications').addTotalNotifications(1);
}
