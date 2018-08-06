var UserHistoryModel = mongoose.model('userHistory');
//Registrar en el historial de usuario, su conexion con que socket y estatus realizo una accion.
exports.add = function (user, socket, mobile, action) {
    if (user != null) {
        if(user.Status == null){
            user.Status = 0;
        }
        var history = new UserHistoryModel({
            user: user,
            status: user.Status,
            mobile: mobile,//True/False
            socket: socket,//socket.id
            action: action
        });
        history.save(function (err, db) {
            if (err) {
                console.log(err);
            }
        });
    }
};
//Este est utilizado por el controller user.