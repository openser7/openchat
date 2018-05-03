/**
 * La conversacion es un modelo relacionado a los mensajes
*/
const mongoose = require('mongoose'),
        Schema = mongoose.Schema;

exports = module.exports = function (app, mongoose) {
        var messageSchema = new mongoose.Schema({
                conversation: {
                        type: Schema.Types.ObjectId,
                        ref: 'conversation',
                        required: true
                },
                author: { 
                        type: Schema.Types.ObjectId, //Refernecia al user
                        ref: 'user',
                        required: true
                },
                type: {
                        type: String, // message, link de archivo
                        default : 'message'
                },
                attachments: {
                        type: String //Value del type message != message "URL"
                },
                message_body: {
                        type: String,
                        required: true
                },
                message_star: { //Mensaje con pegatina
                        type: Boolean,
                        default: false
                },
                message_read: {
                        type: Boolean,
                        default: false
                },
                message_read_date: { //Fecha en la que es leido
                        type: Date,
                },
                message_reaction: {
                        type: String
                }
        }, {
                        timestamps: true
                });
        mongoose.model('message', messageSchema);
}

