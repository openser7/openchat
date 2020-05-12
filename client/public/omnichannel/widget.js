var rutabase = "https://empresarial.openser.com/public/omnichannel";
var socketOmnichannel = null, Enterprise = 'Desarrollo', urlSocket = "https://empresarial.openser.com:81";

var _NombreCompleto = "Sin nombre";
var _Imagen = "";
var _CveUsuario = "Sin nombre";


function socket () {

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
    socketOmnichannel._emit = function(name, data){
        if(!data) data = {};
        data.idEnterprise = Enterprise;
        //data.openser = localStorage.CveUsuario;
        data.hash = location.hash;

        socketOmnichannel.pending.push(function(){ socketOmnichannel.emit(name, data); });
        _emit();
    }

    function _emit(){
        if(!socketOmnichannel.connected){
            socketOmnichannel.connect();
            return;
        }

        if(socketOmnichannel.pending.length){
            socketOmnichannel.pending[0](); // Ejecutar la petición
            socketOmnichannel.pending = socketOmnichannel.pending.slice(1); // Elimina del arreglo la petición
            setTimeout(_emit, 1500); // Ejecutar la siguiente petición
        }
    }
    
    socketOmnichannel.on('connect', function () {            
        console.log('%cSocket Omnichannel ID: ' + socketOmnichannel.id, 'color: #008000');
        var data = { openser: _CveUsuario, idEnterprise: Enterprise, name: _NombreCompleto, 
            socket: socketOmnichannel.id, idUser: 0, isAgent: false, image:_Imagen }
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

    socketOmnichannel.on('get message to agent', function (data){
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
        if(data.from.openser && data.from.name){
            _continue({ CveUsuario: data.from.openser, NombreCompleto: data.from.name });
            return;
        }

        if(from.length > 10){
           from =  from.slice(from.length-10, from.length);//Enviarle solo 10 digitos por que no jala el servicio de juan
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
        function _continue(_jData){
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
        
        console.log("Usuario conectado al Omnichannel");
        
        socketOmnichannel.user = data;
        socketOmnichannel.user.lang = localStorage.Language == "2" ? "en" : "es";
        var openser = data.openser;
        if(openser){
            if(!data.whatsapp){
                // Buscar si tiene whatsapp en el openser
                getUserOmnichannel({ CveUsuario: openser, id: data._id, updateWhatsapp: true,
                    afterFn: function(){
                        // Después de esto, ya se podrán llamar los servicios para obtener la info del NodeJS
                        socketOmnichannel.omnichannelLoaded = true;
                        if(socketOmnichannel.afterConnect){
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
        setTimeout(function(){
            if($OMNICHANNEL && $OMNICHANNEL.conversations_loading)
                $OMNICHANNEL.getConversations_emit();
        }, 5000);
        
        // Ejecutar las peticiones pendientes
        _emit();
        setTimeout(function(){
            $OMNICHANNEL.pendingMessages({ isChat: false, reconnect: true });

            setTimeout(function(){
                $OMNICHANNEL.pendingMessages({ isChat: true, reconnect: true });
            }, 200);
        }, 200);            

        // Consultar los mensajes sin leer del cliente
        if($('.icoOmnichannel').hide() && !$("body #divChat .body").is(":visible")){
            socketOmnichannel._emit('chat_messagesUnreadCount', { source: "openser", sender: { id: socketOmnichannel.user._id } });
        }

        // Al conectarse el agente verificar si hay chats con ticket sin asignar para ver si se puede asignar automaticamente
        console.log("automatic assign user online PENDIENTE");
        var isAgent = $OMNICHANNEL.assignableAgent();
        if(isAgent && localStorage.Grupos)
            socketOmnichannel._emit('automatic assign user online', { idUser_agent: localStorage.IdUsuario, groups: localStorage.Grupos.split(",") });
        
        $OMNICHANNEL.showChat();
    });

    function getUserOmnichannel(data){
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
        if(data.duplicated)
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
    
    socketOmnichannel.on('getConversation_resolveTicket', function (data){
        $OMNICHANNEL.getConversation_resolveTicket(data);
    });

    socketOmnichannel.on('conversation_finished_agent', function(data){
        $OMNICHANNEL.conversation_finished_agent(data);
    });

    socketOmnichannel.on('conversation_finished_client', function(data){
        $OMNICHANNEL.conversation_finished_client(data);
    });

    socketOmnichannel.on('conversation_finished_SQL', function(data){
        $OMNICHANNEL.conversation_finished_SQL(data);
    });

    socketOmnichannel.on('chat_messagesUnreadCount_result', function(data){
        $OMNICHANNEL.chat_messagesUnreadCount_result(data);
    });

    socketOmnichannel.on('chat_setInfo', function(data){
        $OMNICHANNEL.chat_setInfo(data);
    });

    socketOmnichannel.on('fileUploaded', function(data){
        $OMNICHANNEL.fileUploaded(data);
    });

    socketOmnichannel.on('agent accepted conversation', function(data){
        $OMNICHANNEL.agentAcceptedConversation(data);
    });
    socketOmnichannel.on('conversation_info', function(data){
        $OMNICHANNEL.conversation_info(data);
    });

    socketOmnichannel.on('conversation not exists', function(data){
        // Pasar al siguiente mensaje
        $OMNICHANNEL.conversation_notExists(data);
    });        
    
    // SLA
    socketOmnichannel.on('sla got', function(data){
        $OMNICHANNEL_SLA.got(data);
    });
    socketOmnichannel.on('sla saved', function(data){
        $OMNICHANNEL_SLA.saved(data);
    });
    
    // Settings
    socketOmnichannel.on('settings got', function(data){
        if($("#omnichannel_settings").length)
            $OMNICHANNEL_SETTINGS.got(data);
        else if($("#divMessages").length)
            $OMNICHANNEL.settings_got(data);
        
        $OMNICHANNEL._settings = data;
    });
    socketOmnichannel.on('settings saved', function(data){
        $OMNICHANNEL_SETTINGS.saved(data);
    });


    // Asignar agente
    socketOmnichannel.on('get agents online', function(data){
      
    });
    socketOmnichannel.on('conversation assigned', function(data){
        $OMNICHANNEL_ASSIGNMENT.assigned(data);
    });
    socketOmnichannel.on('chat assigned', function(data){
        $OMNICHANNEL.chatAssigned(data);
    });

    // Obtener todas las conversaciones
    socketOmnichannel.on('get all conversations', function (data) {
        $OMNICHANNEL.getAllConversations(data);
    });

    socketOmnichannel.on('get channels', function (data){
    });        
}


function init() {
    loadScript("https://kit.fontawesome.com/8f2e00ef0a.js");
    loadCss(rutabase+ '/css/omnichannel.css');

    console.log("Se inicio el script del wdiget del omnichanel");
    switch (getLenguaje()) {
        case 1: loadScript(rutabase + '/js/language-es.js');
            break;
        case 2: loadScript(rutabase + '/js/language-en.js');
            break;
    };
    loadScript(rutabase+ '/js/omnichannel.js', socket());
}

function validDate() {
    if (Date.now() == Date.now())
        return true;
}

function loadScript(route, callback) {
    var head = document.getElementsByTagName('head')[0];
    var oc_JS = document.createElement('script');
    oc_JS.type = 'text/javascript';
    oc_JS.src = route ;
    //oc_JS.src = oc_JS.src + '?t=' + Date.now();
    head.appendChild(oc_JS);
    if(typeof callback == "function" )
    oc_JS.onload = callback();
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
    if (navigator.language.indexOf("es") > 0 )
        return 1;
    else
        return 2;

}
if (validDate())
    init();
else console.log("ERROR LOAD OMINCHANNEL WIDGET");




