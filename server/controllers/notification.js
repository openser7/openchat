var mongoose = require('mongoose');
//Notificaciones de Open Ser.
// 1 Ticket (action ... )
// 2 Actividad
// 3 Tarea
var userModel = mongoose.model('user');

var request = require('request');


// Obtiene el texto puro de un texto con HTML
function getPureText(text) {
    if (text === undefined || text === null) return "";
    text = text.toString().replace(/<div]*>/g, " ");
    text = text.replace(/<br>/g, " ");
    return text.replace(/<[^>]*>/g, "").trim();
}
// Obtiene el texto en una sóla línea
function getOneLineText(text) {
    return getPureText(text).replace(/\n/g, "").replace(/\r/g, "").replace(/<br>/g, " ").replace(/  /g, " ").replace(/[“"]/g, "&quot;")
        .replace(/\\/g, "&#92;").replace(/\t/g, "").replace(/&nbsp;/g, " ").replace('\u000A', '');
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.sendNotification = function (req, res) {
    var usersToNotify = req.body._id;
    var notificationData = req.body;

    usersToNotify.map(function (item) {
        userModel.findById(item, function (err, user) {
            //userModel.find({ CveUsuario: item }, function (err, users) {
            if (users.length < 1) {
                return;
            }

            var user = users[0];
            if (user) {
                var s = user._doc;
                for (i in user.sockets) {
                    var id = user.sockets[i];
                    if (io.sockets.connected[id] != undefined) {
                        notificationData.IdSocket = id;
                        io.to(id).emit('new notification', notificationData);
                    }
                }

                if (s.TFB === undefined)
                    return;

                if (s.TFB != null && s.TFB != '') {

                    var b = {
                        "notification": {
                            "title": notificationData.Titulo,
                            "body": getOneLineText(notificationData.Mensaje)
                        },
                        "registration_ids": [s.TFB]
                        ,
                        "data": { "Id": notificationData.Id }
                    };
                    b = JSON.stringify(b);
                    request.post({
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'key=AAAA03NvMFU:APA91bFyP2KOMLBxWvOPvdnkbWKdtPbOMIYOjh88eVegrpewpE4tMAwnnklFHlbkOLdBctEjclW9wLjUMCnR4NfytNba8MNFSkBpZhxIlojQ-l6oweXISq895mcP1v_YA69aDbSO02Xt',
                        },
                        url: 'https://gcm-http.googleapis.com/gcm/send',
                        body: b,
                        forever: false,
                    }, function (error, response, body) {

                        var code = response.statusCode;

                        if (error != null) {
                            console.log('code:' + code + ' |error:' + error + ' |res:' + body + ' |params:' + b);
                        }
                    });
                }

            }
        });
    });
    var result = { 'yea': true };
    res.status(200).jsonp(result);

};