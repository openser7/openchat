/* Librerias requeridas */
var express = require('express'),
    crypto = require('crypto'),
    app = express(),
    bodyParser = require("body-parser"),
    methodOverride = require("method-override"),
    fs = require("fs"),
    request = require('request'),
    mongoose = require('mongoose'),
    multiparty = require("multiparty"),
    sql = require('mssql'),
    helmet = require('helmet'),
    frameguard = require('frameguard'),
    mailer = require('nodemailer');

/**
 * Cargar Configuraciones
 */
global.config = require("./../config/config.json");

/**
 * Levantar el Servidor
 */
var server = null;
try {
    if(global.config.SSL){
        var sslOptions = {
            key: fs.readFileSync('./../config/https/key.pem'),
            cert: fs.readFileSync('./../config/https/cert.pem')
        };
        server = require('https').createServer(sslOptions, app);
        console.log('SERVER HTTPS');
    } else {
        server = require('http').createServer(app);
        console.log('SERVER HTTP');
    }
}
catch (err) {
    console.log('Error con el certificado para HTTPS :' + err);
    server = require('http').createServer(app);
    console.log('SERVER HTTP');
}

global.io = require('socket.io').listen(server, { 'transports': ['websocket', 'polling'] });

global.mongoose = mongoose;

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    return next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(methodOverride());
//SEGURIDAD

app.use(helmet());

app.use(helmet.referrerPolicy({ policy: 'same-origin' }))// Referer
app.disable('x-powered-by');
/*
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", 'openser.com']
  },
}));

app.use(frameguard({ action: 'sameorigin' }))
*/


// CONNECTION TO BD
mongoose.Promise = global.Promise;
mongoose.set('debug', global.config.debug);

// Connect database uri and options
const uri = 'mongodb://localhost/openser';
const options = {
    user: '',
    pass: '',
    server: {
        reconnectTries: 5,
        reconnectInterval: 1000,
        socketOptions: {
            keepAlive: 10,
            connectTimeoutMS: 1000
        },
    },
};

// Crear conexion db mongo
//mongoose.createConnection(uri, options)
mongoose.connect(uri);

// Import DB Models 
var models = require('./models')(app, mongoose);

/**
 * Limpiar los socket y otrod datos de las conexiones
*/
var usuarios = mongoose.model('user');
usuarios.update({
    Status : 0,
    disconnect : true,
    status : 0,
    sockets : []
},function(err, res) {});
// Import Controllers 
global.Controllers = {
    systemOperations: require('./controllers/systemOperations'),
    user: require('./controllers/users'),
    conversation: require('./controllers/conversations')
}
var socketIo = require('./controllers/sockets');

// connect to your database
global.sql = sql;
sql.connect(global.config.sqlConfig, function(err) {
	if (err){
		console.log(err);// create Request object
	}
});
		
// Configuara el ruteo de todos los servicios y entidades de la app ... signar las rutas a los metodos de los controllers
app.use(express.Router());
app.use('/', require('./controllers/routes'));
var path = require('path');
app.use('/public/',express.static(path.join(__dirname, '../client/public/')));
app.use('/marketplace',express.static(path.join(__dirname, '../client/public/marketplace')));
app.use('/mobile/',express.static(path.join(__dirname, '../client/public/mobile')));
app.use('/licencias/',express.static(path.join(__dirname, '../client/public/licencias')));

//Revisar el servidor
server.listen(process.env.PORT || global.config.puerto, process.env.IP || "0.0.0.0", function () {
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
    console.log(addr);
});
console.error = function(msg){
    var mailerTransporter = mailer.createTransport(global.config.mail);
    
    var mailOptions = {
        from : 'rsaldivar@openservice.mx',
        to : 'roberto.saldivararm@gmail.com',
        subject : 'SERVER EMPRESARIAL',
        text : 'Server report' + msg
    }
    mailerTransporter.sendMail(mailOptions,function(error, info){
        if(error){
            console.log(error);
        } 
        else {
            console.log('Email enviado'+info.response);
        }
    });
    
    process.stderr.write(msg);
}