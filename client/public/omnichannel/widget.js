var rutabase = "https://empresarial.openser.com/public/omnichannel";
var socketOmnichannel = null, Enterprise = 'Desarrollo', urlSocket = "https://empresarial.openser.com:81";


var _NombreCompleto = "Sin nombre";
var _Imagen = "";
var _CveUsuario = "User anonimo";
var _IdUsuario = 0;//Representa usuario anonimo
var _source = "widget";

JSON.tryParse = function (str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
}

// Regresa un timespan P0DT0H0M0S
function validacionTiempo(time) {
    var noZero = false;
    if (typeof time == "object") {
        noZero = time.noZero;
        time = time.value;
    }

    var $time = {};
    $time.value = time;
    var error = "",
        $fieldError;

    function _errorTime() {
        var newError = lang.error_time_spent_format;
        if (error == "") {
            error = newError;
            $fieldError = $time;
        }
        $time.validation = false;
        $time.errorMsg = newError;
        // $time.validate();
    }
    $time.validation = true;
    //  $time.validate();
    $time.value = $time.value.replace(/ /g, "");
    //var timeEx = /\d+:\d{1,2}:\d{2}|\d{1,2}:\d{2}/, timeFinal;
    //if(!timeEx.test($time.value) || /[A-z]+/.test($time.value))
    var timeEx = /\d+:\d{2}/,
        timeFinal;
    var timeMatch = $time.value.match(timeEx);
    if (!timeMatch || !timeMatch.length) {
        _errorTime();
    } else {
        //var timeMatch = timeEx.exec($time.value);
        var valid = timeMatch[0].split(":").reverse();
        var days = 0,
            hours = 0,
            minutes = +valid[0];
        // Los minutos deben ser menores a 60
        if (minutes >= 60) {
            var newError = lang.minutes_less_60;
            if (error == "") {
                error = newError;
                $fieldError = $time;
            }
            $time.validation = false;
            $time.errorMsg = newError;
            $time.validate();
        }
        //timeFinal = timeEx.exec($time.value)[0];
        timeFinal = timeMatch[0];
        if (valid.length > 1) {
            var hoursTotal = +valid[1];
            days = Math.floor(hoursTotal / 24);
            hours = hoursTotal % 24;
            timeFinal = "P" + days + "DT" + hours + "H" + minutes + "M0S"
            $time.tiempoFinal = timeFinal;

            // Segundos
            $time.seconds = days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
        } else {
            _errorTime();
        }
    }

    if (noZero && !time_noZero($time.tiempoFinal)) {
        $time.validation = false;
        $time.errorMsg = lang.error_time_zero;
    }

    return $time; // Match
}


//Obtener la diferencia de dos fechas
function dateDiff(start, end) {
    // parse the entries
    var startDate = Date.parse(start);
    var endDate = Date.parse(end);
    // make sure they are valid    
    if (!start || isNaN(startDate)) {
        return {
            error: lang.hour_invalidStart + "," + lang.hour_enterValid,
            type: 'startInvalid'
        }
    }
    if (!end || isNaN(endDate)) {
        return {
            error: lang.hour_invalidFinal + "," + lang.hour_enterValid,
            type: 'endInvalid'
        }
    }
    var diff = end - start;
    if (diff < 0) {
        return {
            error: lang.hour_startLessFinal + "," + lang.hour_enterValid_start,
            type: 'startBigger'
        }
    }
    var milliseconds = diff;
    var seconds = Math.floor(milliseconds / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    seconds = seconds % 60;
    minutes = minutes % 60;
    hours = hours % 24;
    if (minutes.toString().length < 2) {
        minutes = '0' + minutes.toString();
    }
    if (hours.toString().length < 2) {
        hours = '0' + hours.toString();
    }
    return {
        "H": hours,
        "M": minutes,
        "S": seconds,
        "SecondsFull": seconds + minutes * 60 + hours * 3600,
        "Tiempo": validacionTiempo(hours + ":" + minutes)
    };
}

String.prototype.matchAny = function (array) {
    var match = false,
        str = this;
    if (typeof array != "object") return false;
    array.forEach(function (item) {
        if (str == item) {
            match = true;
            return;
        }
    });
    return match;
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

 // Obtener hace cuantos dias fue la fecha recibida
 function onGetDays(_date) {
    var fechaActual = new Date();
    var fechaCreacion;
    if (typeof _date != "object") {
        fechaCreacion = new Date(eval(_date.replace(/\//g, '').replace('Date(', '').replace(')', '')));
    } else {
        //set 0 hora minutos y segunsos
        fechaCreacion = new Date(_date.getTime());

        fechaCreacion.setHours(0);
        fechaCreacion.setMinutes(0);
        fechaCreacion.setSeconds(0);
        fechaCreacion.setMilliseconds(0);

        fechaActual.setHours(0);
        fechaActual.setMinutes(0);
        fechaActual.setSeconds(0);
        fechaActual.setMilliseconds(0);
    }
    var openDias = null;

    var fechasuma = fechaActual - fechaCreacion;
    if (fechaActual == fechaCreacion) {
        openDias = 0;
    } else {
        openDias = Math.floor(fechasuma / (1000 * 60 * 60 * 24));
    }
    return openDias;
}
function getDateStringToDate(str){
    var date;

    // Formato yyyy/MM/dd
    var isFormat01 = false;
    if(typeof str == "string"){
        var format01 = str.match(/(\d{4}\/\d{2}\/\d{2})/g);
        isFormat01 = Boolean(format01 && format01[0] == str);
    }        

    // Validar si el formato es ISO 8601
    var formats = [moment.ISO_8601, "MM/DD/YYYY  :)  HH*mm*ss"];
    var isISO = moment(str, formats, true).isValid();

    if((isISO && typeof str == "string") || isFormat01){
        date = new Date(str);
    }
    else {
        var dateStr = str, offset = false;
        if (typeof str == "object") {
            dateStr = str.dateStr;
            offset = str.offset != null ? str.offset : offset;
        }

        date = str instanceof Date ? str : new Date(+dateStr.match(/[0-9]+/)[0]);
    }

    // Hace cuánto tiempo
    var daysAgo = onGetDays(date);
    daysAgoStr = localStorage.IdIdioma == 1 ? "Hace " + daysAgo + " días" : daysAgo + " days ago";
    if (daysAgo <= 0)
        daysAgoStr = lang.today;
    if (daysAgo == 1)
        daysAgoStr = lang.yesterday;
    
    var dateFormat = moment(date, lang.format_date);
    var time12 = date.toString('hh:mm tt');
    
    // Última actualización del chat. 
    // Si es hoy mostrar la hora, si es esta semana mostrar el dia, sino mostrar la fecha.
    var todayIndex = new Date().getDay();
    var chat_lastUpdate = daysAgo2 = "";
    if (daysAgo <= 0){
        chat_lastUpdate = date.toString('h:mm tt'); // Si es de hoy mostrar la hora
        daysAgo2 = lang.today;
    }
    else if (daysAgo == 1) chat_lastUpdate = daysAgo2 = lang.yesterday; // Ayer
    else if(todayIndex - daysAgo > 0) chat_lastUpdate = daysAgo2 = lang.arrDays[todayIndex-daysAgo-1]; // Mostrar día de la semana actual
    else chat_lastUpdate = daysAgo2 = v = dateFormat; // Fecha


    var response = {
        chat_lastUpdate: chat_lastUpdate,
        dateObj: date,
        date: dateFormat,
        dateISO: date.toString("yyyy-MM-dd"),
        daysAgo2: daysAgo2,
        time24: date.toString('HH:mm'),
        time12: time12,
        daysAgoStr: daysAgoStr,
        fullDateStr: moment(date, lang.format_date + ' g:i A')
    };
    return response;
}
$confirm = function (title, msg, fn) {
    var x = confirm(title + "  " + msg);
    if (x) fn("yes");

}

function ErrorEnConexion() {
    console.log("Error de conexion, recarga el chat");
}
function socket() {

    socketOmnichannel = io.connect(urlSocket, {
        'query': 'enterprise=' + Enterprise,
        'transports': ['websocket'],
        'timeout': 15000,
        'forceNew': true,
        'reconnection': true,
        'reconnectionDelay': 1000, // Intervalo entre intentos
        'reconnectionAttempts': 1000000 // Intentos
    });

    console.log('%c Node.js Server connecting to ' + urlSocket, 'color: #008000');

    socketOmnichannel.pending = [];
    socketOmnichannel._emit = function (name, data) {
        if (!data) data = {};
        data.idEnterprise = Enterprise;
        //data.openser = localStorage.CveUsuario;
        data.hash = location.hash;

        socketOmnichannel.pending.push(function () { socketOmnichannel.emit(name, data); });
        _emit();
    }

    function _emit() {
        if (!socketOmnichannel.connected) {
            socketOmnichannel.connect();
            return;
        }

        if (socketOmnichannel.pending.length) {
            socketOmnichannel.pending[0](); // Ejecutar la petición
            socketOmnichannel.pending = socketOmnichannel.pending.slice(1); // Elimina del arreglo la petición
            setTimeout(_emit, 1500); // Ejecutar la siguiente petición
        }
    }

    socketOmnichannel.on('connect', function () {
        //Hay metodos que mas adelante usan las mismas variables como idUsuario
        localStorage.IdUsuario =localStorage.IdUsuario ? localStorage.IdUsuario:  _IdUsuario;
        localStorage.idEnterprise = Enterprise;
        localStorage.NombreCompleto = _NombreCompleto;
        localStorage.source = _source;

        console.log('%cSocket Omnichannel ID: ' + socketOmnichannel.id, 'color: #008000');
        var data = {
            openser: _CveUsuario, idEnterprise: Enterprise, name: _NombreCompleto,
            source: _source, 
            socket: socketOmnichannel.id, idUser: localStorage.IdUsuario , isAgent: false, image: _Imagen
        }
        socketOmnichannel._emit('socket connected', data);

        //if(_$("omnichannel_dashboard"))
        //   socketOmnichannel._emit('dashboard get update');


        // 
    });

    // Seccion de Eventos de Conexion
    socketOmnichannel.on('error', function (reason) {
        console.log("Error de conexión");
    });
    socketOmnichannel.on('connect_timeout', function () {
        console.log("Timeout omnichannel");
        ErrorEnConexion(lang.error_server_timeout);
    });
    socketOmnichannel.on('reconnect', function (e) {
        console.log("Reconnect");
    });
    socketOmnichannel.on('reconnect_error', function (e) {
        console.log("Reconnect error");
        ErrorEnConexion(lang.error_server_access);
    });
    socketOmnichannel.on('disconnect', function () {
        console.log('%cConexión perdida con NodeJS: Omnichannel', 'color: #ff0000');
        //console.log('Conexion perdida con NodeJS: Omnichannel');
        ErrorEnConexion(lang.problem_connecting);
    });

    socketOmnichannel.on('get conversations', function (data) {
        $OMNICHANNEL.getConversations_receive(data);
    });
    socketOmnichannel.on('getConversation', function (data) {
        $OMNICHANNEL.getConversation_selected(data);
    });
    socketOmnichannel.on('getConversation_createTicket', function (data) {
        $OMNICHANNEL.getConversation_createTicket(data);
    });
    socketOmnichannel.on('getConversation_createActivity', function (data) {
        $OMNICHANNEL.getConversation_createActivity(data);
    });

    socketOmnichannel.on('get message to agent', function (data) {
        //console.log("Message para el agente");
        $OMNICHANNEL.getMessageToAgent(data);
    });

    // Obtener mensajes de whatsapp
    socketOmnichannel.on('get data whatsapp', function (data) {
        console.log("Mensaje desde whatsapp");
        console.log(data);
        var message = data.lastMessage;

        // Verificar para quien es el mensaje
        var from = data.from.whatsapp; // to = data.to.whatsapp, 
        console.log("Nuevo mensaje: " + message);

        // Si ya existen estos datos, entonces no consultar el servicio
        if (data.from.openser && data.from.name) {
            _continue({ CveUsuario: data.from.openser, NombreCompleto: data.from.name });
            return;
        }

        if (from.length > 10) {
            from = from.slice(from.length - 10, from.length);//Enviarle solo 10 digitos por que no jala el servicio de juan
        }
        /*
         getUserOmnichannel({
             WhatsApp: from,
             id: data.from.id,
             updateOpenser: true, 
             afterFn: function(jData){
 
                 // Mostrarlo en el openser
                 var response = {
                     conversationID: data.conversationID,
                     source: "whatsapp", 
                     user: { openser: jData.CveUsuario, name: jData.NombreCompleto, id: data.from.id, whatsapp: data.from.whatsapp, idUser : jData.IdUsuario}, 
                     lastUpdate: new Date(), 
                     lastMessage: message, 
                     mediaURL: data.mediaURL,
                     idEnterprise : Enterprise
                 }
 
                 $OMNICHANNEL.getMessageToAgent(response);
                 //--Actualizar usuario para esta conversacion 
                 
                 if(typeof jData.CveUsuario === "undefined"){
                     //TODO ACTIVAR ASIGNACION DE CLIENTE
                     warning("Favor de registrar el numero como cliente");
                     return false;
                 } else {
                     console.log('Actualizando el usuario en la conversacion de whatsapp');
                     socketOmnichannel._emit('userupdate whatsappconversation', response );                    
                 }
             } 
         });
 */
        function _continue(_jData) {
            var response = {
                conversationID: data.conversationID,
                source: "whatsapp", user: { openser: _jData.CveUsuario, name: _jData.NombreCompleto, id: data.from.id, whatsapp: data.from.whatsapp },
                lastUpdate: new Date(), lastMessage: message, mediaURL: data.mediaURL, mediaName: data.mediaName, agent: data.to
            }
            $OMNICHANNEL.getMessageToAgent(response);
            //$OMNICHANNEL.getMessage(response);
        }


    });

    // Después de que el usuario fue conectado al NodeJS
    socketOmnichannel.on('user_connected', function (data) {
        localStorage.IdUsuario = data.idUser;//Guardar el id Usuario otorgado por el servidor.
        console.log("Usuario conectado al Omnichannel");
        
        socketOmnichannel.user = data;
        socketOmnichannel.user.lang = localStorage.Language == "2" ? "en" : "es";
        var openser = data.openser;
        if (openser) {
            if (!data.whatsapp) {
                // Buscar si tiene whatsapp en el openser
                getUserOmnichannel({
                    CveUsuario: openser, id: data._id, updateWhatsapp: true,
                    afterFn: function () {
                        // Después de esto, ya se podrán llamar los servicios para obtener la info del NodeJS
                        socketOmnichannel.omnichannelLoaded = true;
                        if (socketOmnichannel.afterConnect) {
                            socketOmnichannel.afterConnect();
                            delete socketOmnichannel.afterConnect;
                        }
                    }
                });
            }
            else
                socketOmnichannel.omnichannelLoaded = true;
        }

        // Verificar si ya se cargó la página, sino volver a intentarlo            
        setTimeout(function () {
            if ($OMNICHANNEL && $OMNICHANNEL.conversations_loading)
                $OMNICHANNEL.getConversations_emit();
        }, 5000);

        // Ejecutar las peticiones pendientes
        _emit();
        setTimeout(function () {
            $OMNICHANNEL.pendingMessages({ isChat: false, reconnect: true });

            setTimeout(function () {
                $OMNICHANNEL.pendingMessages({ isChat: true, reconnect: true });
            }, 200);
        }, 200);

        // Consultar los mensajes sin leer del cliente
        if ($('.icoOmnichannel').hide() && !$("body #divChat .body").is(":visible")) {
            socketOmnichannel._emit('chat_messagesUnreadCount', { source: localStorage.source, sender: { id: socketOmnichannel.user._id } });
        }

        // Al conectarse el agente verificar si hay chats con ticket sin asignar para ver si se puede asignar automaticamente
        console.log("automatic assign user online PENDIENTE");
        var isAgent = $OMNICHANNEL.assignableAgent();
        if (isAgent && localStorage.Grupos)
            socketOmnichannel._emit('automatic assign user online', { idUser_agent: localStorage.IdUsuario, groups: localStorage.Grupos.split(",") });

        $OMNICHANNEL.showChat();
    });

    function getUserOmnichannel(data) {
        var jAfterFn = {}

    }

    // Mensaje del agente enviado
    socketOmnichannel.on('agent message sent', function (data) {
        console.log("Mensaje del agente enviado: " + data.lastMessage);
        data.agentSent = true;
        $OMNICHANNEL.setMessageSended({ message: data, isChat: false });
    });

    // Chat de openser enviado
    socketOmnichannel.on('chat message sent', function (data) {
        if (data.duplicated)
            console.log("Mensaje duplicado");
        else
            console.log("Mensaje del chat enviado: " + data.lastMessage);

        $OMNICHANNEL.setMessageSended({ message: data, isChat: true });
    });

    // Usuario actualizado
    socketOmnichannel.on('user updated', function (user) {
        console.log("user updated");

        // Solicitar las conversaciones de nuevo
        //$OMNICHANNEL.getConversations_emit();
    });

    socketOmnichannel.on('agent to chat', function (message) {
        //console.log("agent to chat");
        $OMNICHANNEL.agentToChat(message);
    });

    socketOmnichannel.on('get conversation to chat', function (data) {
        console.log("Conversación para el chat");
        $OMNICHANNEL.conversationToChat(data);
    });

    socketOmnichannel.on('getConversation_resolveTicket', function (data) {
        $OMNICHANNEL.getConversation_resolveTicket(data);
    });

    socketOmnichannel.on('conversation_finished_agent', function (data) {
        $OMNICHANNEL.conversation_finished_agent(data);
    });

    socketOmnichannel.on('conversation_finished_client', function (data) {
        $OMNICHANNEL.conversation_finished_client(data);
    });

    socketOmnichannel.on('conversation_finished_SQL', function (data) {
        $OMNICHANNEL.conversation_finished_SQL(data);
    });

    socketOmnichannel.on('chat_messagesUnreadCount_result', function (data) {
        $OMNICHANNEL.chat_messagesUnreadCount_result(data);
    });

    socketOmnichannel.on('chat_setInfo', function (data) {
        $OMNICHANNEL.chat_setInfo(data);
    });

    socketOmnichannel.on('fileUploaded', function (data) {
        $OMNICHANNEL.fileUploaded(data);
    });

    socketOmnichannel.on('agent accepted conversation', function (data) {
        $OMNICHANNEL.agentAcceptedConversation(data);
    });
    socketOmnichannel.on('conversation_info', function (data) {
        $OMNICHANNEL.conversation_info(data);
    });

    socketOmnichannel.on('conversation not exists', function (data) {
        // Pasar al siguiente mensaje
        $OMNICHANNEL.conversation_notExists(data);
    });

    // SLA
    socketOmnichannel.on('sla got', function (data) {
        $OMNICHANNEL_SLA.got(data);
    });
    socketOmnichannel.on('sla saved', function (data) {
        $OMNICHANNEL_SLA.saved(data);
    });

    // Settings
    socketOmnichannel.on('settings got', function (data) {
        if ($("#omnichannel_settings").length)
            $OMNICHANNEL_SETTINGS.got(data);
        else if ($("#divMessages").length)
            $OMNICHANNEL.settings_got(data);

        $OMNICHANNEL._settings = data;
    });
    socketOmnichannel.on('settings saved', function (data) {
        $OMNICHANNEL_SETTINGS.saved(data);
    });


    // Asignar agente
    socketOmnichannel.on('get agents online', function (data) {

    });
    socketOmnichannel.on('conversation assigned', function (data) {
        $OMNICHANNEL_ASSIGNMENT.assigned(data);
    });
    socketOmnichannel.on('chat assigned', function (data) {
        $OMNICHANNEL.chatAssigned(data);
    });

    // Obtener todas las conversaciones
    socketOmnichannel.on('get all conversations', function (data) {
        $OMNICHANNEL.getAllConversations(data);
    });

    socketOmnichannel.on('get channels', function (data) {
    });
}


function init() {
    loadScript("https://kit.fontawesome.com/8f2e00ef0a.js");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.26.0/moment-with-locales.min.js",asignarLenguaje,1000);
    loadCss(rutabase + '/css/omnichannel.css');

    console.log("Se inicio el script del wdiget del omnichanel");
    
    loadScript(rutabase + '/js/omnichannel.js', socket, 3000);
}
function asignarLenguaje(){
    switch (getLenguaje()) {
        case 1: loadScript(rutabase + '/js/language-es.js');
            break;
        case 2: loadScript(rutabase + '/js/language-en.js');
            break;
    };
}
function validDate() {
    if (Date.now() == Date.now())
        return true;
}

function loadScript(route, callback, timeSleep) { 
    var head = document.getElementsByTagName('head')[0];
    var oc_JS = document.createElement('script');
    oc_JS.type = 'text/javascript';
    oc_JS.src = route;
    //oc_JS.src = oc_JS.src + '?t=' + Date.now();
    head.appendChild(oc_JS);
    if (typeof callback == "function") {
        setTimeout(function (oc_JS, callback) {
            callback();
        }, timeSleep ? timeSleep : 1000, oc_JS, callback);
    }
}
function loadCss(route) {
    var head = document.getElementsByTagName('head')[0];
    var oc_CSS = document.createElement('link');
    oc_CSS.type = 'text/css';
    oc_CSS.rel = 'stylesheet';
    oc_CSS.href = route + '?t=' + Date.now();
    head.appendChild(oc_CSS);
}

function getLenguaje() {
    if (navigator.language.indexOf("es") >= 0){
        localStorage.IdIdioma = "1";  
        moment.locale('es');  
        return 1;
    }
    else{ localStorage.IdIdioma = "2";    
        moment.locale('en');
        return 2;
    }

}
if (validDate())
    init();
else console.log("ERROR LOAD OMINCHANNEL WIDGET");




