var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'openser',
  description: 'Servicio para licencias de Openser / Landing / WebService de Openser.',
  script: 'C:\\openchat\\server\\server.js',
  nodeOptions: [
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  console.log('Servicio instalado con exito.');
  svc.start();
});

svc.install();
