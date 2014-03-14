/*------------------------*/
/*        Jok Play        */
/*           by           */
/*    Jok Entertainers    */
/*------------------------*/
class JP {

    public static IO;

    static pluginHttp;
    static pluginSendgrid;


    public static SendMail(to: string, subject: string, body: string) {

        try {
            if (!JP.pluginSendgrid) {
                var sendgrid = require('sendgrid');
                if (sendgrid)
                    JP.pluginSendgrid = sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
            }
        }
        catch (err) { return; }

        if (!JP.pluginSendgrid) return;


        var sendObject = {
            to: to,
            from: 'no-reply@jok.io',
            subject: subject,
            text: body
        };

        var errorSending = (err, json) => {
            if (err) { return console.error('Sendmail failed', err); }
        };

        JP.pluginSendgrid.send(sendObject, errorSending);
    }

    public static HttpGet(url: string, cb, parseJson = false) {

        try {
            if (!JP.pluginHttp) {
                JP.pluginHttp = require('http');
            }
        }
        catch (err) { return; }

        if (!JP.pluginHttp) return;


        JP.pluginHttp.get(url, function (res) {

            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                // Success Result Callback

                if (parseJson) {
                    try {
                        var oldData = data;
                        data = JSON.parse(data);
                    }
                    catch (err) {
                        // Fail Result Callback
                        cb && cb(false, err.message, oldData);
                    }
                }

                cb && cb(true, data);
            });

        }).on('error', function (e) {
                // Fail Result Callback
                cb && cb(false, e.message, e);
            });

    }

    public static ChannelSockets(channel: string): any[] {

        if (!JP.IO || !JP.IO.adapter) return;

        var channelClients = JP.IO.adapter().clients(channel);
        var result = [];

        for (var id in channelClients) {

            var client_sid = channelClients[id];

            if (!client_sid) continue;

            var socket = JP.IO.clients[client_sid];
            if (!socket) continue;

            result.push(socket);
        }

        return result;
    }

    public static BuildCommand(command: string, ...params: any[]): string {
        return JSON.stringify({
            command: command,
            params: params
        });
    }
}