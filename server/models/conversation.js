/**
 * La conversacion es un modelo relacionado a los mensajes
*/
const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

exports = module.exports = function (app, mongoose) {
	var conversationSchema = new mongoose.Schema({
		participants: [{ type: Schema.Types.ObjectId, ref: 'user' }],
	}, {
		timestamps: true
	});
	mongoose.model('conversation', conversationSchema);
}

