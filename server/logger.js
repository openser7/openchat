const { createLogger, format, transports} = require('winston');

module.exports = createLogger({
    format: format.combine(format.simple(),format.timestamp(), format.printf( info => `[${info.timestamp}] ${info.level} ${info.message}`)), //Se asigna el mismo formato a la consola y al archivo, se usa formato simple y tiemspan
    transports:[
        new transports.File({
            maxsize: 5120000,
            filename:'{__dirname}/../licencias.log'
        }),
        new transports.Console({
           level:'debug'
        })
    ]
});