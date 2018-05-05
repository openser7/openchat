const mongoose = require('mongoose'),
Schema = mongoose.Schema;

exports = module.exports = function (app, mongoose) {
    mongoose.model('userHistory', new mongoose.Schema({
        user: {
            type: Schema.Types.ObjectId, 
            ref: 'user',
            required: true
        },
        mobile: {
            type: Boolean, //true o false
            required: true,
            default: false
        },
        socket: {
            type: String, //id socket web
            required: true
        },
        status: {
            type: Number, 
            num: [0, 1, 2, 3, 4],
            required: true
        },
        action : {
            type: String,
            required: true
        }
    }, {
            timestamps: true
    }))
};