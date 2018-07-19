exports = module.exports = function (app, mongoose) {
    var userSchema = new mongoose.Schema({
        CveUsuario: {
            type: String
        },
        IdAgente: {
            type: String
        },
        IdCliente: {
            type: String
        },
        IdPerfil: {
            type: String
        },
        IdTipoRol: {
            type: String
        },
        IdUsuario: {
            type: String
        },
        Imagen: {
             type: String
        },
        Nombre: {
            type: String
        },
        NombreCompleto: {
            type: String
        },
        TFB: {
            type: String
        },
        Status: {
            type: Number, num: [0, 1, 2, 3, 4]
        }, //For NodeServer
        tour : {
            type: Boolean //SI ya recibio el tour.
        },
        session: {
            type: String
        },
        room : {
            type : String
        },
        sockets: [{
            type: String
        }],
        socketMobile: {
            type: String
        },
        disconnect: {
            type: Boolean
        }
    }, {    collection : 'users',
            usePushEach: true,
            timestamps: true
        });
    mongoose.model('user', userSchema);
};


//case 0: colorStatus = 'gray'; Offline
//case 1: colorStatus = 'red'; //Busy: This lets your contacts know you're busy and don't want to be interrupted
//case 2: colorStatus = 'orange'; //Idle. Your status automatically changes to idle when you're away from your computer for 15 minutes. You can't manually select to appear idle
//case 3: colorStatus = '#39B739'; (verde) //Available You are online and ready to chat.
//case 4: colorStatus = 'white'; //Invisible