var user_chat_remote = null; //usuario con el que se conversa
var chat_group_open_index = 0;
var isWriting = false;
var user_chat_local = null;
Ext.define('OpenSer.controller.Chat', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.Chat',
    views: ['OpenSer.view.widgets.Chat'],
    init: function () { },

    /*
    *   Metodos de Nuevo Chat  
    */
    clickConversation: function (component, record, item, index, e) {
        var controller = this;
        if (event && event.target.className === 'fa fa-close') {
            controller.closeConversationNEW(component, record);
            if (!Ext.isEmpty(component.store.data.items)) {
                controller.conversationSelect(component, component.store.data.items[0]);
            } else {
                _$('#chatConversacion').close();
            }
            return false;
        } else {
            controller.conversationSelect(component, record);
        }
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== CONVERSACION  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/
    //Cargar conversacion de usuario especifico
    conversationSelect: function (component, record, eOpts) {
        var controller = this;
        var contactListStore = _$('usuariosConectados').getStore();
        contactListStore.clearFilter();

        _$('#chatConversacion').showAt(60, 70);
        _$('#chatConversacion').getEl().query('.chat-area-texto')[0].innerHTML = ""; //limpiar conversacion
        var statusName = "";

        switch (record.data.Status) {
            case 1: statusName = lang.notDisturb;
                break;
            case 2: statusName = lang.absent;
                break;
            case 3: statusName = lang.available;
                break;
        }
        var img = chatProfile(record.data);
        _$('#chatConversacion').setTitle(
            '<div class="conversation-title-img" >' + img + '</div>' +
            '<div class="conversation-title">' +
            '<strong><span class="conversation-title-user">' + record.data.NombreCompleto + '</span></strong>' +
            '<br><span class="conversation-title-status">' + statusName + '</span>' +
            '<span class="conversation-title-date">&nbsp;' + moment(record.data.updatedAt).fromNow() + '</span>' +
            '</div>');

        _$('#chatConversacion').mask();//animacion en espera de respuesta de la obtencion de mensajes

        //Obtener el usuario del dataview de los usuarios con conversaciones
        var userSelected = _$('#usuariosChat').store.findExactRecord('IdUsuario', record.data.IdUsuario);
        if (!userSelected) {//Si no se ha seleccionado se agrega a la lista de usuario con conversaciones
            _$('#usuariosChat').store.add(record);//Record, agregado a las conversaciones
            userSelected = _$('#usuariosChat').store.findExactRecord('IdUsuario', record.data.IdUsuario);
            _$('#usuariosChat').refresh();
        }
        user_chat_remote = userSelected; //-Seleccion de usuario lo guardamos para tener toda su info de node js.
        _$('#usuariosChat').getSelectionModel().select(user_chat_remote); //Simular la Seleccion el tab del clickeado


        _$('chat-badge').subtrackMessageReaded(userSelected.data.newMessages);//Restar  uno marcando que se tiene 1 conversacion menos "vista"
        //Setear el badge de la lista de usuario en 0, pues ya se cargaran localmente
        record.data.newMessages = 0;
        record.commit();
        component.refresh();

        // Obtener una conversacion por las clave del usuario remoto, la respuesta es procesada en : renderConversation
        socket.emit('get conversation', record.data);

        setTimeout(function () { _$('#inputSendMessage').focus(); }, 1000); //Poner el mouse en escribir mensaje 
    },

    /*
     *   Close conversation with user
     */
    closeConversationNEW: function (component, record) {
        var listaConversacionesActivas = component;
        if (listaConversacionesActivas) {
            listaConversacionesActivas.store.remove(record);
            listaConversacionesActivas.refresh();
            if (listaConversacionesActivas.store.data.items.length == 0) {
                user_chat_remote = null;
                _$('#chatConversacion').close();

            } else {
                listaConversacionesActivas.select(0);
                var newSelection = listaConversacionesActivas.store.data.items[0];
                listaConversacionesActivas.getSelectionModel().select(newSelection);
            }
        }
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== DIBUJAR CONVERSACION  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/    
    //Obtener informacion y dibujar la conversacion en el modal.
    renderConversation: function (data) {
        _$('#chatConversacion').unmask();
        var controller = this;
        var senderCveUsuario = localStorage.CveUsuario;
        var receiverCveUsuario = user_chat_remote.data.CveUsuario;

        if (data.length > 0) {
            var lengthMsg = data.length - 1;//aplicar validaciones para la iteracion siguiente si el limite de conversacion es 30, regresa un array de 29 indices por lo cual este valor tendra nu 28 para saber cuando validar si es el primer mensaje enviado .
            _$('#chatConversacion').getEl().query('.chat-area-texto')[0].innerHTML = ""; //limpiar conversacion
            for (i = data.length - 1; i >= 0; i--) {//29,28,27....0 debido a que la conversacion viene ordenada por fecha de mensaje con limit .. regresa primero los mas recientes
                if (data[i].author.CveUsuario === senderCveUsuario) { //Si el author es el localStorage , entonces es la misma persona quien envio mensaje.
                    data[i]['sendBy'] = 'my';
                }
                else {
                    data[i]['sendBy'] = 'you';
                }
            };

            var momentCreatedAnt = "";
            var sendBy = '';
            for (i = data.length - 1; i >= 0; i--) { //Insertar la linea de tiempo, cada que cambie 
                if (momentCreatedAnt != moment(data[i].createdAt).fromNow()) {// ya no es el mimmo momento que el anterior? 
                    momentCreatedAnt = moment(data[i].createdAt).fromNow();
                    controller.insertLineMoment(data[i].createdAt);// Se inserta una linea nueva
                    controller.insertSectionMessages(data[i].sendBy);
                } else if (sendBy != data[i].sendBy) {
                    sendBy = data[i].sendBy;
                    controller.insertSectionMessages(data[i].sendBy);
                }
                controller.insertMenssage(data[i]);//Cargado de DB             
            }
        }

        // Al ready saw messages - Marcar los mensajes como leidos en el servidor
        if (user_chat_remote) {
            socket.emit('message read', user_chat_remote.data); //Marcar como leidos los mensajes recibidos  
        }
        _$('top-side-right').hide();
    },// insertar linea de momento en el cual se enviaron los mensajes
    insertLineMoment: function (date) {
        _$QUERY('#chatConversacion').getEl().query('.chat-area-texto')[0].innerHTML += '<div class="message-line-moment">' + moment(date).fromNow() + '</div>';
    },
    insertSectionMessages: function (sendBy) {
        var img = "";
        if (sendBy == 'you') {
            img = '<div class="messages-image" >' + chatProfile(user_chat_remote.data) + '</div>';
        }
        else
            img = '<div class="messages-image" ></div>';
        var messages = '<div class="messages messages-' + sendBy + '" ></div>';

        var strHtmlMsg = '<div class="messages-section">' + messages + img + '</div>';
        _$QUERY('#chatConversacion').getEl().query('.chat-area-texto')[0].innerHTML += strHtmlMsg;
    },
    // insertar el mensaje enviado o recibido 
    insertMenssage: function (objMsg) {
        var strHtmlStat = '';
        var status = 'no-enviado';

        switch (objMsg.message_read) {
            case false: status = 'no-visto';
                break;
            case true: status = 'visto';
                break;
        }

        if (objMsg.sendBy == 'my')
            strHtmlStat = '<i class="fa fa-check-circle" aria-hidden="true"></i>';


        var strHtmlMsg = '<div class="message msg-' + objMsg.sendBy + ' ' + '" data-toggle="tooltip" data-placement="bottom"  title=" ' + lang.sent + ' ' + moment(objMsg.createdAt).format('LLLL') + '" >' +
            objMsg.message_body + '<div class="message-status ' + status + '" >' + strHtmlStat + '</div></div>';

        var ind = (Ext.query('.messages-' + objMsg.sendBy).length >= 1) ? Ext.query('.messages-' + objMsg.sendBy).length : 1; //Insertar en la ultima area "you o my" encontrada.
        Ext.query('.messages-' + objMsg.sendBy)[ind - 1].innerHTML += strHtmlMsg;

        //Ir al final de la conversacion.
        _$QUERY('.chat-area-texto').dom.scrollTop = 999999;
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== RECIBIR  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/
    //Crear la estrucura html de un nuevo mensaje "enviado" .. Esto cuando generas un mensaje nuevo, aun sin validar que llegue al server
    showMessageRecived: function (data) {
        var controller = this;
        //Conversacion Abierta
        if ((_$QUERY('#chatConversacion') && _$QUERY('#chatConversacion').isVisible()) && _$QUERY('#usuariosChat').getSelection().length > 0 && data.author.CveUsuario == _$QUERY('#usuariosChat').getSelection()[0].data.CveUsuario) {
            if (data && data.message) {
                var newMessageFromContact = data.message;
                newMessageFromContact['sendBy'] = 'you';
                if (Ext.query('.messages').length == 0 || (Ext.query('.messages').length > 0 && Ext.query('.messages').slice(-1)[0].classList.value.indexOf('messages-you') == -1)) {//Si el ultimo div de messages no tiene la clase messages-you, se agrega                    
                    this.insertSectionMessages('you');
                }
                //Marcar como leidos los mensajes recibidos cada que el remote te envie un mensaje teniendo la conversacion abierta, no esperar a seleccionar la conversacion.
                if (sessionStorage.soundChat == "true") document.getElementById("sound-received-message").play();
                socket.emit('message read', user_chat_remote.data);
                controller.changeReadingLocal(user_chat_remote.data);

                this.insertMenssage(newMessageFromContact);//Mensaje recivido
            } else {
                this.renderConversacion(data);
            }
        } else { //Conversacion cerrada , actualizar la lista de contacto                
            controller.updateBadgeForContact(data.author, data.message);
            _$('chat-badge').calculateBadge();

            //Reproducir sonido, cambiar titulo y mostrar alerta clickeable.
            //if(sessionStorage.soundChat=="true")
            document.getElementById("sound-chat").play();
            // Mostrar alerta de mensaje recibido si da clic en la alerta mostrar la conversacion seleccionado al usuario que envio el mensaje
            alert(data.author.Nombre + '<br>' + lang.send_message, 'default', 'tr', function () { }, 'fa-user', function () {
                var users = _$('usuariosConectados');
                controller.conversationSelect(users, users.store.findExactRecord('CveUsuario', data.author.CveUsuario));
            }, data.author);
        }
    },
    //Marcar como visto los mensajes enviados para la conversacion con CveUsuario
    changeReadingLocal: function (userModel) {
        var CveUsuario = userModel.CveUsuario;
        if ((_$QUERY('#chatConversacion') && _$QUERY('#chatConversacion').isVisible())
            && _$QUERY('#usuariosChat').getSelection().length > 0 && CveUsuario == _$QUERY('#usuariosChat').getSelection()[0].data.CveUsuario) {
            if (Ext.query('.message.msg-my .no-visto').length > 0) {
                Ext.each(Ext.query('.message.msg-my .no-visto'), function (message) {
                    message.classList.remove('no-visto');
                    message.classList.add('visto');
                });
            }
        }
    },
    showWriting: function (userWriting) {
        //Conversacion Abierta
        if ((_$QUERY('#chatConversacion') && _$QUERY('#chatConversacion').isVisible()) //Ventana esa abierta y visible
            && _$QUERY('#usuariosChat').getSelection().length > 0  //Y se tiene un usuario seleccionado ademas de que es el que envio el "escribiendo.."
            && userWriting == _$QUERY('#usuariosChat').getSelection()[0].data.CveUsuario) {
            _$('chatWriting').update(' ' + userWriting + ' está escribiendo...');
        }
        setTimeout(function () {
            _$('chatWriting').update('');//Limpiar el writing.. 
        }, 3000);
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== ENVIAR  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/
    //Emitir mensaje con enter
    sendMessage: function (field, e, eOpts) {
        if (field.getValue() != "") {
            this.setWriting(user_chat_remote);//Enviar la señal que le estas escribiendo   
        }

        if (e.getKey() == e.ENTER && (e.ctrlKey || e.shiftKey || e.shiftKey)) {
            field.setValue(field.getValue() + '\n');
        } else if (e.getKey() == e.ENTER && !(e.ctrlKey || e.shiftKey || e.shiftKey)) {
            if (field.getValue() != null && field.getValue() != "" && !Ext.isEmpty(field.getValue()) && user_chat_remote) {
                if (_$('#usuariosChat').getSelection().length > 0) {
                    socket.emit('send message private', field.getValue(), user_chat_remote.data);
                    var msg = {
                        createdAt: new Date().getTime(),
                        message_body: field.getValue(),
                        message_read: false,
                    };
                    if (sessionStorage.soundChat == "true") document.getElementById("sound-send-message").play();
                    this.showConversationMenssageSend(msg);
                } else {
                    alert(lang.select_conversation, 'warning');
                }
                field.setValue('');
            }
            e.stopEvent();
        }
    },
    sendMessagePaste: function (field, e, eOpts) {

    },
    //Emitir mensaje con boton
    sendMessageButton: function (button, e, eOpts) {
        var field = _$('#inputSendMessage');
        if (_$('#usuariosChat').getSelection().length > 0 && !Ext.isEmpty(field.getValue())) {
            socket.emit('send message private', field.getValue(), user_chat_remote.data);
            var msg = {
                createdAt: new Date().getTime(),
                message_body: field.getValue(),
                message_read: false
            };
            document.getElementById("sound-send-message").play();
            this.showConversationMenssageSend(msg);
        } else {
            alert(lang.select_conversation, 'warning');
        }
        field.setValue('');
    },
    //Emitir el que se esta escribiendo
    setWriting: function (remote) {
        socket.emit('writing message private', localStorage.CveUsuario, user_chat_remote.data._id);//Se envia las claves de los usuarios para hacer el aviso de que el local esta escirbiendo al remoto
    },
    /*
    *    Mostrar el mensaje local, el arreglo almacenado en memoria, esto para no saturar al servidor, se usa para cuando se envia un mensaje 
    */
    showConversationMenssageSend: function (mensaje) {
        var contactListStore = _$('usuariosConectados').getStore();
        contactListStore.clearFilter();
        //simulando la recepcion de mensaje.
        if (!user_chat_remote)
            return false;
        if (user_chat_remote.data.CveUsuario != "") {
            var cveUsuarioSend = user_chat_remote.data.CveUsuario;
            var objFromTo = {
                to: _$('#usuariosConectados').store.findExactRecord('CveUsuario', localStorage.CveUsuario).data,
                from: _$('#usuariosConectados').store.findExactRecord('CveUsuario', cveUsuarioSend).data,
            };
            if (mensaje != null && mensaje != '') {
                mensaje['sendBy'] = 'my';
                if (Ext.query('.messages').length == 0 || (Ext.query('.messages').length > 0 && Ext.query('.messages').slice(-1)[0].classList.value.indexOf('messages-my') == -1)) {//Si el ultimo div de messages no tiene la clase messages-my, se agrega
                    this.insertSectionMessages('my');
                }
                this.insertMenssage(mensaje);//Enviado localmente
            } else {
                socket.emit('send message private reading', user_chat_remote.data);
                this.renderConversacion(objFromTo);
            }
        }
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== BADGE  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/
    //Dibujar los mensajes no leeidos
    drawBadgesNewMessages: function (menssages) {
        var contactListStore = _$('usuariosConectados').getStore();
        contactListStore.clearFilter();

        //Solucion Temporal
        _$('chat-badge').setText('');
        _$('chat-badge').addTotalMessage(menssages.length);//Setear la cantidad de mensajes no leeidos

        Ext.each(menssages, function (item, idx) {
            var contactRecord = contactListStore.findExactRecord("CveUsuario", item.author.CveUsuario);
            if (contactRecord) {
                // remove old status list and new status list
                var statusDataView = _$('dtv' + contactRecord.data.Status);
                if (statusDataView) {
                    var record = statusDataView.getStore().findExactRecord('IdUsuario', contactRecord.data.IdUsuario);
                    if (record) {
                        if (typeof record.data.newMessages == 'undefined' || record.data.newMessages <= 0) {
                            record.data.newMessages = 1;
                        } else {
                            record.data.newMessages += 1;//Cantidad de mensajes pendientes de leer de este usuario, por cada mensaje asignar 1 mas  
                        }
                        record.commit();
                        statusDataView.refresh();
                    };
                }
            }
        });
    },
    //Actualizar contador del usuario al recibir un mensaje,  incrementar en 1, por cada mensaje recibido al tener cerrada la conversacion
    updateBadgeForContact: function (autor, message) {
        var statusDataView = _$('dtv' + autor.Status);
        if (statusDataView) {
            var record = statusDataView.getStore().findExactRecord('IdUsuario', autor.IdUsuario);
            if (record) {
                if (typeof record.data.newMessages == 'undefined' || record.data.newMessages <= 0) { //Debido a que la propiedad no esta en el modelo para un usuario de la lista de conexiones
                    record.data.newMessages = 1;
                } else {
                    record.data.newMessages = record.data.newMessages + 1;
                }
                record.commit();
                statusDataView.refresh();
            };
        }
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== ZUMBIDO  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/
    //Enviar un zumbido por medio del id de mongo 
    sendZumba: function () {
        if (user_chat_remote) {
            alert(lang.buzz_sent + " " + user_chat_remote.data.Nombre, 'default', 'br');
            socket.emit('zumbido', user_chat_remote.data.Nombre, user_chat_remote.data._id);
            zumbaaa(2); //Auto mostar animacion de zumbido para motivar al usuario no usarlo
            //  document.getElementById("sound-zumbido").play();
        }
    },
    //Generar el zumbido recibido, sonido alerta y animacion
    showZumba: function (userSendBuzz) {
        //agregar alerta de quien envia el zumbido
        if (localStorage.Status !== "1") {
            document.getElementById("sound-zumbido").play();
            alert(userSendBuzz + " " + lang.buzz_received, 'default', 'tr');
            zumbaaa(2);
        }
    },
    // ====== ====== ====== ====== ====== ====== ====== ====== ====== ====== PANEL USUARIOS  ====== ====== ====== ====== ====== ====== ====== ====== ====== ======/

    searchContactsLocal: function (property, value) {
        console.log('Filtrar usuarios locales para el chat');
        // Filter local store... 
        _$QUERY('#accordionContacts').show();
        _$QUERY('#cntUsersChat').hide();
        var contactListStore = _$('usuariosConectados').getStore();
        if (value == '' || value.length == 0) {
            contactListStore.clearFilter();
            var view = _$QUERY('#chatView');
            _$QUERY('#accordionContacts').removeAll();
            view.controller.groupingContactList(contactListStore.data.items, '0');
            view.controller.groupingContactList(contactListStore.data.items, '1');
            view.controller.groupingContactList(contactListStore.data.items, '3');
            view.controller.groupingContactList(contactListStore.data.items, '2');
        } else {
            var filterParams = {
                property: property,
                value: value,
                anyMatch: true,
                caseSensitive: false
            };

            if (contactListStore && contactListStore.totalCount > 0) {
                var view = _$QUERY('#chatView');
                _$QUERY('#accordionContacts').removeAll();
                contactListStore.filter(filterParams);
                view.controller.groupingContactList(contactListStore.data.items, '0');
                view.controller.groupingContactList(contactListStore.data.items, '1');
                view.controller.groupingContactList(contactListStore.data.items, '2');
                view.controller.groupingContactList(contactListStore.data.items, '3');
            }
        }
    },
    searchContactsRemote: function (property, value) {
        console.log('Filtrar usuarios remotos para el chat');
        _$QUERY('#accordionContacts').show();
        _$QUERY('#cntUsersChat').hide();
        var contactListStore = _$('usuariosConectados').getStore();
        // Get contacts from service
        var serviceParams = {
            Url: getUrl(Servicio.Usuario, 'ConsultarCombo?query=' + value + '&limit=500'),
            //Datos: incidentObj,
            Metodo: Metodo.GET,
            Funcion: function (response, InfoExtra) {
                var arrayResultados = response.Lista;
                _$QUERY('#accordionContacts').removeAll();
                contactListStore.clearFilter();
                for (var i = 0; i <= arrayResultados.length - 1; i++) {
                    var itemInChat = contactListStore.findExactRecord('IdUsuario', arrayResultados[i].IdUsuario);
                    if (itemInChat) {
                        arrayResultados[i].Status = itemInChat.data.Status;
                    } else {
                        arrayResultados[i].Status = 0;
                    }

                    arrayResultados[i].Nombre = arrayResultados[i].NombreCompleto;
                    arrayResultados[i].IsContact = !(parseInt(localStorage.IdUsuario) == arrayResultados[i].IdUsuario);
                };
                InfoExtra.controller.groupingContactList(arrayResultados, '0');
                InfoExtra.controller.groupingContactList(arrayResultados, '1');
                InfoExtra.controller.groupingContactList(arrayResultados, '3');
                InfoExtra.controller.groupingContactList(arrayResultados, '2');
            },
            FuncionError: function (response) {
                console.log(response)
            },
            InfoExtra: {
                controller: this
            },
            Mask: {
                Componente: _$('#notification-panel'),
                Mensaje: lang.searching
            }
        }
        getService(serviceParams);
    },
    groupingContactList: function (lista, status) {
        var dataViewStore = null;
        if (lista instanceof Ext.data.Store) {
            dataViewStore = Ext.create('Ext.data.Store', { data: lista.data.items });
        } else {
            dataViewStore = Ext.create('Ext.data.Store', { data: lista });
        }

        var totalContactsOnChat = dataViewStore.totalCount;
        var ownUserExist = dataViewStore.findExactRecord('IdUsuario', localStorage.IdUsuario);
        if (ownUserExist) {
            user_chat_local = ownUserExist;
            totalContactsOnChat = totalContactsOnChat - 1;
        }

        //filtrar store para obtener solo los elementos del estatus correspondiente.
        dataViewStore.filter({
            property: 'Status',
            value: status, //Filtrarlos por Status
            anyMatch: true,
            caseSensitive: false
        });
        //create new store after filter.
        if (dataViewStore.data.items.length == 0 || (dataViewStore.data.items.length == 1 && dataViewStore.data.items[0].data.IdUsuario === localStorage.IdUsuario))
            return false;

        var finalStore = Ext.create('Ext.data.Store', { data: dataViewStore.data.items });
        var totalByStatus = finalStore.totalCount;
        var ownUserExist = finalStore.findExactRecord('IdUsuario', localStorage.IdUsuario);
        if (ownUserExist) {
            user_chat_local = ownUserExist;
            totalByStatus = totalByStatus - 1;
        }

        var headerTitle = '';
        switch (parseInt(status)) {
            default:
            case 0:
                headerTitle = lang.offlines; //Offline:
                break;
            case 1:
                headerTitle = lang.busys; //Busy:This lets your contacts know you're busy and don't want to be interrupted
                break;
            case 2:
                headerTitle = lang.absents; //Idle. Your status automatically changes to idle when you're away from your computer for 15 minutes. You can't manually select to appear idle
                break;
            case 3:
                headerTitle = lang.online; //Available You are online and ready to chat.
                break;
            case 4:
                headerTitle = lang.invisibles; //Invisible
                break;
        }

        headerTitle = headerTitle + ' (' + totalByStatus + '/' + totalContactsOnChat + ')';
        //console.log("Usuarios "+ headerTitle);

        // Sort store by NAme then by msgNoVistos
        // finalStore.sort([
        //     {
        //         property : 'Nombre',
        //         direction: 'ASC'
        //     },
        //     {
        //         property : 'msgNoVistos',
        //         direction: 'DESC'
        //     }
        // ], 'prepend');

        if (_$('#dtv' + status) == null) {
            var dataViewGroup = {
                xtype: 'dataview',
                id: 'dtv' + status,
                width: '100%',
                store: finalStore,
                itemTpl: new Ext.XTemplate(
                    '<tpl if="IsContact == false || Status !=' + parseInt(status) + '">',
                    '<div style="display:none" >',
                    '<tpl else>',
                    '<div style="display:block" ',
                    '</tpl>',
                    '<div  class="user-chat" >',
                    '<div class="imagen" >{[chatProfile(values)]}</div>',
                    '<div class="nombre"> {Nombre}',
                    '<div class="perfil"> {[userChatProfile(values)]} </div>',
                    '</div>',
                    '<div>{[this.calculoBadge(values)]}</div>',
                    '</div>',
                    '</div>', {
                        calculoBadge: function (values) {
                            if (values.newMessages > 0) {
                                return '<div class="badge">' + values.newMessages + '</div>';
                            } else return "";
                        }
                    }
                ),

                cls: 'list-users-chat',
                multiSelect: false,
                trackOver: true,
                selectedItemCls: 'user-chat-selected',
                itemSelector: 'div.user-chat',
                listeners: {
                    itemclick: 'conversationSelect',
                },
                autoScroll: true,
                flex: 1,
            };

            // Nueva vista creada del grupo por status.
            var newView = {
                title: '<i class="fa fa-users"></i>' + ' ' + headerTitle,
                id: 'view' + status,
                groupStatus: status,
                items: [dataViewGroup],
                scrollable: true,
            };

            var accordionView = _$('#accordionContacts');
            //??
            if (status == 3)
                accordionView.insert(0, newView);
            else if (status != 0) {
                var lastIndex = accordionView.items.length;
                if (lastIndex > 0)
                    accordionView.insert(lastIndex - 1, newView);
                else
                    accordionView.add(newView);
            } else
                accordionView.add(newView);

        }
        accordionView.updateLayout();
    },
    updateChatList: function () {//Agrupar contactos en cada una de sus listas..
        var view = _$QUERY('#chatView');
        _$QUERY('#accordionContacts').removeAll();
        var chatStore = _$('usuariosConectados').getStore();
        chatStore.clearFilter();
        view.controller.groupingContactList(chatStore, '4');
        view.controller.groupingContactList(chatStore, '3');
        view.controller.groupingContactList(chatStore, '2');
        view.controller.groupingContactList(chatStore, '1');
        view.controller.groupingContactList(chatStore, '0');
        _$("chatPanel")._scroll();

        // Mantiene la búsqueda local
        _$QUERY("#txtBusquedaChat").searchContactsLocal();
    },
    /*Renderizar las lista de contactos, Cuando un usuario cambia de estatus*/
    updateChatUserStatus: function (userData, oldStatus) {
        //console.log('Actualizar las listas de los estatus de conexion del chat : ' + oldStatus  +" y "+ userData.Status );
        if (oldStatus != userData.Status) {
            var chatList = _$('usuariosConectados');
            var chatStore = chatList.getStore();
            chatStore.clearFilter();

            // update record en lista principal
            var record = chatStore.findExactRecord('IdUsuario', userData.IdUsuario);
            if (record) {
                record.set(userData);
                record.commit();
                chatList.refreshNode(record);
            };

            // remove old status list old status
            if (_$('view' + oldStatus)) {
                _$('dtv' + oldStatus).destroy();
                _$QUERY('#accordionContacts').remove(_$('view' + oldStatus), true);
            }
            // remover status list new status
            if (_$('view' + userData.Status)) {
                _$('dtv' + userData.Status).destroy();
                _$QUERY('#accordionContacts').remove(_$('view' + userData.Status), true);
            }
            // update old status list and new status list
            var view = _$QUERY('#chatView');
            var chatStore = _$('usuariosConectados').getStore();

            //Agrupar nuevamente los contactos con estatus nuevo
            view.controller.groupingContactList(chatStore, userData.Status);
            //Agrupar nuevamente los contactos con estatus anterior
            view.controller.groupingContactList(chatStore, oldStatus);
        }
    },
});
