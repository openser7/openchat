var mongoose = require('mongoose');
//Models
var ConversationModel = mongoose.model('conversation');
var MessageModel = mongoose.model('message');
var UserModel = mongoose.model('user');

/*
 * Evento que te elimina de usuarios conectados, 
 */
exports.registerMessage = function (socket, toUser, message, callback) {
	if(global.config.debug)console.log('Registrando mensaje de : ' + socket.Model.NombreCompleto + ' a ' + toUser.NombreCompleto);
	var fromUserModel = socket.Model;
	var text = message;
	var controller = this;

	var idUsuarioFrom = UserModel.findById( toUser._id, function (err, toUserModel) {
		if (err) console.log(err);
		else {
			controller.getConversationByUsers ( [fromUserModel, toUserModel], 0 , function (err, conversation) {
				if (err) console.log(err);
				else {
					var author = fromUserModel;
					var receptor = toUserModel;
					//Generar la estructura del mensaje
					var message = new MessageModel({
						message_body: text, //Descripcion del mensaje
						author: author._id //Autor del mensaje
					});

					//Conversacion existente ?
					if (conversation.length > 0) {
						message.conversation = conversation[0]._id;
						message.save(function (err, newMessage) {
							if (err) console.log(err);
							callback(err, newMessage, receptor, author);
						});
					} else { //Crear la conversacion
						var conversation = new ConversationModel({
							participants: [fromUserModel, toUserModel] 
						});
						conversation.save(function (err, newConversation) {
							if (err) console.log(err);
							else { //Guardar el primer mensaje.
								message.conversation = newConversation._id;
								message.save(function (err, newMessage) {
									if (err) console.log(err);
									callback(err, newMessage, receptor, author);
								});
							}
						});
					}
				}
			});
		}
	});
};

//Retorna la conversacion completa con un usuario especifico.
exports.getMessagesByConversation = function (conversation, callback) {
	MessageModel.find({
		conversation: conversation
	}).select('createdAt message_body author message_read')
		.sort('-createdAt')//De menor a mayor
		.limit(100)
		.populate('author')
		.exec(function (err, messages) {
			if (err)
				console.log(err)
			else {
				callback(err, messages);
			}
		});
}

//Buscar conversación en la cual participan ciertos usuarios "participantes de la conversacion" por su ObjetID
exports.getConversationByUsers = function (users, intento, callback) {
	ConversationModel.find({
		participants: users
	}, function (err, conversation) {
		if(err){
			callback(err, null);
		}
		if(conversation.length > 0){
			callback(err, conversation);
		} else if(intento == 0){ //Nuevo intento, con array invertido
			global.Controllers.conversation.getConversationByUsers([users[1], users[0]], 1, callback);
		} else {
			callback(err, conversation);
		} 
	});
};



//Buscar las conversaciones en las cual esta asosiado un 1 Usuario, usada para obtener los mensajes no leidos
exports.getConversationIdByUser = function (localStorage, callback) {
	global.Controllers.user.findById(localStorage._id, function (err, user) {
		ConversationModel.find({
			participants: user
		}, function (err, conversations) {
			callback(err, conversations);
		});
	});
};
/**
 * Consultar los mensajes no leeidos del usuario
 * @param {*} localStorage 
 * @param {*} callback 
 */
exports.getCountUnseenMsg = function (localStorage, callback) {
	if(global.config.debug)console.log('Obteniendo mensajes no leidos de :' + localStorage.NombreCompleto);
	global.Controllers.conversation.getConversationIdByUser(localStorage, function (err, conversations) {
		if (err) {
			console.log(err);
		} else {
			var conversationIds = [];
			conversations.forEach(function (conversation) {//Crear array de todas las conversaciones del usuario
				conversationIds.push(conversation._id);
			});
			MessageModel.find({ 
					conversation: { "$in":  conversationIds},
					message_read : false // Buscar los mensajes no leeidos
				})
				.select('createdAt message_body author message_read')
				.sort('-createdAt')
				.populate({ //Hacer join para el author
					path: "author",
				})
				.exec(function (err, messages) {
					if(err){
						console.log(err);
					} else {
						var mensajesNoLeidos = [];
						messages.forEach(function (mensaje) {
							if(mensaje.author.CveUsuario != localStorage.CveUsuario){ //Siempre y cuando no seas el autor.
								mensajesNoLeidos.push(mensaje);
							}
						});
						if(global.config.debug)console.log('Mensajes no leeidos de  '+ localStorage.NombreCompleto +" : "+ mensajesNoLeidos.length);
						callback(err, mensajesNoLeidos);
					}
				});
			
		}
	});
};
/**
 *  Marcar como leidos los mensajes de un usuario en una conversacion
 * @param {*} ObjectIdRemoteUser 
 * @param {*} conversation 
 * @param {*} callback 
 */
exports.setMessagesAsSeen = function (ObjectIdRemoteUser, conversation, callback) {
	MessageModel.find({   
		conversation : conversation,
		author : ObjectIdRemoteUser,
		message_read : false
	},function (err, messagesDb) { //Obtener los noleeidos
		if(err)console.log(err);
		else {
			messagesDb.forEach(function (messageRead) { //Marcarlos como leeidos
				messageRead.message_read = true;
				messageRead.message_read_date = new Date();
				messageRead.save(function(err, success){
					if(err)
					console.log(err);
					else 
					 callback(err);
				})
			})
		}
	});
};