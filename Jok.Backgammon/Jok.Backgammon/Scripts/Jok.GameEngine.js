function GameHub(hubName, token, channel, url) {

    this.tryReconnect = true;
    this.reconnectSec = 0;

    var _this = this;
    var transports = ['longPolling'];
    var connection = $.hubConnection();
    var hub = connection.createHubProxy(hubName);
    var isSubscribedDebugging;

    hub.send = hub.invoke;
    hub.sendCommand = hub.invoke;
    hub.start = function () {
        this.connection.start({ transport: transports });
    }



    connection.stateChanged(function (change) {

        switch (change.newState) {

            case $.signalR.connectionState.connected:
                $(hub).triggerHandler('online');
                _this.reconnectSec = 0;
                break;

                //case $.signalR.connectionState.connecting:
            case $.signalR.connectionState.reconnecting:
                $(hub).triggerHandler('offline');
                break;

            case $.signalR.connectionState.disconnected:
                if (change.oldState == $.signalR.connectionState.connected)
                    $(hub).triggerHandler('offline');

                if (!_this.tryReconnect) return;

                if (_this.reconnectSec < 10)
                    _this.reconnectSec++;

                console.log('connection lost, reconnecting in ' + _this.reconnectSec + ' sec.');

                setTimeout(function () {
                    connection.start({ transport: transports });
                }, _this.reconnectSec * 1000);

                break;
        }
    });

    hub.on('online', function () {
        if (isSubscribedDebugging) return;

        connection.received(function (data) {
            if (data.M) {
                if (data.A) {
                    console.log(data.M, data.A);
                } else {
                    console.log(data.M);
                }
            }
        });

        isSubscribedDebugging = true;
    })

    hub.on('close', function (reason) {
        //console.log('connection closed, server is initiator, reason:', reason);
        _this.tryReconnect = false;
        hub.connection.stop();
    });

    if (url) this.hub.connection.url = url;

    connection.qs = ["token", token].join('=') + '&' + ["channel", channel].join('=');

    return hub;
}