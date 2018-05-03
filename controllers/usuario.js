exports.findAllTVShows = function (req, res) {
    console.log('GET /Todos');
   
    var version={
        "Detalle": "Otra actualizacion para probar el disenio de las notificaciones a traves del tiempo.",
            "Version": 20160831
    }

    io.sockets.emit('update application', version);
    //res.status(200).jsonp(users);
    res.status(200).jsonp(true);
};

exports.actualizarInfoUsuarios = function (req, res) {
    var result = { 'yea': true };
    io.sockets.emit('update user data', req.body.Usuarios);
    res.status(200).jsonp(result);
};