// Librerias requeridas 
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
    mailer = require('nodemailer'),
    path = require('path');

//Load config
global.config = require("./../config/config.json");
global.serverDir = path.dirname(require.main.filename);
global.appRoot = path.resolve(__dirname);


//Create Server
var server = null;
try {
    if (global.config.SSL) {
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

// Header request
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    return next();
});

// Config Json
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(methodOverride());

// Security
app.use(helmet());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }))// Referer
app.disable('x-powered-by');

// Allow from a specific host:
app.use(frameguard({
    action: 'allow-from',
    domain: 'https://www.openser.com/'
  }));
  

app.use(helmet({
    frameguard: false
}));

// Conecttion DB
mongoose.Promise = global.Promise;
global.config.promiseLibrary = global.Promise;
mongoose.set('debug', global.config.debug);

// Connect to mongodb
mongoose.connect(global.config.dbUrl, global.config.dbConfig);
// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + global.config.dbUrl);
}); 

// If the connection throws an error
mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});
// Load models "Mongoose"
var models = require('./models')(app, mongoose);
// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
    mongoose.connection.close(function () { 
      console.log('Mongoose default connection disconnected through app termination'); 
      process.exit(0); 
    }); 
  }); 

  
// Clear Sockets[] the users
var usuarios = mongoose.model('user');
usuarios.update({
    Status: 0,
    disconnect: true,
    status: 0,
    sockets: []
}, function (err, res) { });

// Import Controllers 
global.Controllers = {
    conversation: require('./controllers/socket/conversations'),
    session: require('./controllers/socket/session'),
    user: require('./controllers/socket/users')
}
var socketIo = require('./sockets');

// Connect to your database
global.sql = sql; //sql pool conection
global.pool = new global.sql.ConnectionPool(global.config.sqlConfig, function (err) {
    if (err) {
        console.log(err);// create Request object
    }
});

// Load Routes 
app.use(express.Router());
app.use('/', require('./routes/routes'));
var path = require('path');

// HTML, CSS & JS 
app.use('/licencias/', express.static(path.join(__dirname, '../client/public/licencias')));
app.use('/lead/', express.static(path.join(__dirname, '../client/public/lead')));
app.use('/marketplace', express.static(path.join(__dirname, '../client/public/marketplace')));
app.use('/mobile/', express.static(path.join(__dirname, '../client/public/mobile')));
app.use('/public/', express.static(path.join(__dirname, '../client/public/')));

// Listen server 
server.listen(process.env.PORT || global.config.puerto, process.env.IP || "0.0.0.0", function () {
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
    console.log(addr);
});

// Send EMAIL for Errors 
console.error = function (msg) {
    var mailerTransporter = mailer.createTransport(global.config.mail);
    var mailOptions = global.config.mailOptions;

    if(msg.indexOf('socket')> 0  ) return false;
    if(msg.indexOf('Socket')> 0  ) return false;

    mailOptions.subject = 'Error : '+  global.config.subjectError;
    mailOptions.html = "Server report" + msg;
    if(msg.indexOf('tls.createSecurePair()') > 0) return true;//Eliminar el error de MSSQL
    mailerTransporter.sendMail(mailOptions,function(error, info){
        if(error){
            console.log(error);
        }
        else {
            if(error != null){
                console.log('Email enviado' + info.response);
            }
        }
    });
    process.stderr.write(msg);
}