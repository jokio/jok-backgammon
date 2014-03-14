var TableStatus;
(function (TableStatus) {
    TableStatus[TableStatus["New"] = 0] = "New";
    TableStatus[TableStatus["Started"] = 1] = "Started";
    TableStatus[TableStatus["StartedWaiting"] = 2] = "StartedWaiting";
    TableStatus[TableStatus["Finished"] = 3] = "Finished";
})(TableStatus || (TableStatus = {}));
var StonesCollection = (function () {
    function StonesCollection(UserID, Count) {
        if (typeof Count === "undefined") { Count = 0; }
        this.UserID = UserID;
        this.Count = Count;
    }
    return StonesCollection;
})();
var Commands;
(function (Commands) {
    (function (Client) {
        Client[Client["TableState"] = 0] = "TableState";
        Client[Client["RollingResult"] = 1] = "RollingResult";
        Client[Client["MoveRequest"] = 2] = "MoveRequest";
    })(Commands.Client || (Commands.Client = {}));
    var Client = Commands.Client;
})(Commands || (Commands = {}));
var GameTable = (function () {
    function GameTable(Channel, Mode) {
        if (typeof Channel === "undefined") { Channel = ''; }
        if (typeof Mode === "undefined") { Mode = 0; }
        this.Channel = Channel;
        this.Mode = Mode;
        this.Stones = [];
        this.Players = [];
    }
    GameTable.prototype.join = function (user, ipaddress, channel, mode) {
        this.send(0 /* TableState */, user, mode);
    };

    GameTable.prototype.leave = function (userid) {
    };

    GameTable.prototype.move = function (userid, index, moves) {
    };

    GameTable.prototype.moveOut = function (userid, index) {
    };

    GameTable.prototype.playAgain = function (userid) {
    };

    GameTable.prototype.onJoin = function (player, state) {
    };

    GameTable.prototype.onLeave = function (player) {
    };

    GameTable.prototype.onStart = function () {
    };

    GameTable.prototype.onMove = function (player, index, moves) {
    };

    GameTable.prototype.onMoveOut = function (player, index) {
    };

    GameTable.prototype.onFinish = function () {
    };

    GameTable.prototype.onPlayAgain = function (player) {
    };

    GameTable.prototype.next = function () {
    };

    GameTable.prototype.rolling = function () {
    };

    GameTable.prototype.hasAnyMoves = function () {
    };

    GameTable.prototype.checkMoves = function (player, stoneCollection) {
    };

    GameTable.prototype.hasEveryStonesInside = function (player) {
    };

    GameTable.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        this.Players.forEach(function (p) {
            return p.send(command, params);
        });
    };
    return GameTable;
})();

var GamePlayer = (function () {
    function GamePlayer() {
    }
    GamePlayer.prototype.hasKilledStones = function () {
        return this.KilledStonsCount > 0;
    };

    GamePlayer.prototype.init = function () {
        this.StonesOut = 0;
        this.IsReversed = false;
        this.KilledStonsCount = 0;
    };

    GamePlayer.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        var sockets = JP.ChannelSockets('User' + this.UserID);
        if (!sockets)
            return;

        sockets.forEach(function (s) {
            return s.send(JP.BuildCommand(Commands.Client[command], params));
        });
    };
    return GamePlayer;
})();
var JP = (function () {
    function JP() {
    }
    JP.SendMail = function (to, subject, body) {
        try  {
            if (!JP.pluginSendgrid) {
                var sendgrid = require('sendgrid');
                if (sendgrid)
                    JP.pluginSendgrid = sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
            }
        } catch (err) {
            return;
        }

        if (!JP.pluginSendgrid)
            return;

        var sendObject = {
            to: to,
            from: 'no-reply@jok.io',
            subject: subject,
            text: body
        };

        var errorSending = function (err, json) {
            if (err) {
                return console.error('Sendmail failed', err);
            }
        };

        JP.pluginSendgrid.send(sendObject, errorSending);
    };

    JP.HttpGet = function (url, cb, parseJson) {
        if (typeof parseJson === "undefined") { parseJson = false; }
        try  {
            if (!JP.pluginHttp) {
                JP.pluginHttp = require('http');
            }
        } catch (err) {
            return;
        }

        if (!JP.pluginHttp)
            return;

        JP.pluginHttp.get(url, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                if (parseJson) {
                    try  {
                        var oldData = data;
                        data = JSON.parse(data);
                    } catch (err) {
                        cb && cb(false, err.message, oldData);
                    }
                }

                cb && cb(true, data);
            });
        }).on('error', function (e) {
            cb && cb(false, e.message, e);
        });
    };

    JP.ChannelSockets = function (channel) {
        if (!JP.IO || !JP.IO.adapter)
            return;

        var channelClients = JP.IO.adapter().clients(channel);
        var result = [];

        for (var id in channelClients) {
            var client_sid = channelClients[id];

            if (!client_sid)
                continue;

            var socket = JP.IO.clients[client_sid];
            if (!socket)
                continue;

            result.push(socket);
        }

        return result;
    };

    JP.BuildCommand = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        return JSON.stringify({
            command: command,
            params: params
        });
    };
    return JP;
})();
var engine = require('engine.io');
var engineRooms = require('engine.io-rooms');
var http = require('http');
var urlParser = require('url');

var Server = (function () {
    function Server(port) {
        if (typeof port === "undefined") { port = process.env.PORT || 9003; }
        var _this = this;
        this.port = port;
        this.GameTables = [];
        this.UsersCount = 0;
        var server = http.createServer(this.httpHandler.bind(this));
        this.io = engine.attach(server);

        this.io = engineRooms(this.io);

        JP.IO = this.io;

        this.StartTime = Date.now();

        this.io.on('connection', this.onConnectionOpen.bind(this));

        server.listen(this.port, function () {
            console.log('server listening at port:', _this.port);
        });

        JP.SendMail('status-update@jok.io', 'jok-realtime-server started', 'StartTime: ' + new Date());
    }
    Server.prototype.httpHandler = function (req, res) {
        var urlInfo = urlParser.parse(req.url, true);

        switch (urlInfo.pathname) {
            case '/stats':
                 {
                    res.end(JSON.stringify({
                        ConnectionsCount: this.io.clientsCount,
                        UsersCount: this.UsersCount,
                        TablesCount: this.GameTables.length,
                        Uptime: (Date.now() - this.StartTime) / (1000 * 60) + ' min.'
                    }));
                }
                break;

            default:
                 {
                    res.end('Hi, Bye');
                }
                break;
        }
    };

    Server.prototype.onConnectionOpen = function (socket) {
        var _this = this;
        console.log('shemovida connection');

        var sid = socket.request.query.token;
        var gameid = socket.request.query.gameid;
        var gamemode = socket.request.query.gamemode;
        var channel = socket.request.query.channel;
        var ipaddress = socket.request.headers["x-forwarded-for"];

        if (ipaddress) {
            var list = ipaddress.split(",");
            ipaddress = list[list.length - 1];
        } else {
            ipaddress = socket.request.connection.remoteAddress;
        }

        if (!sid || !ipaddress || !gameid)
            return;

        var userid;
        var disconnected;
        var gameTable;

        var url = Server.API_ROOT_URL + 'User/InfoBySID?sid=' + sid + '&ipaddress=' + ipaddress + '&gameid=' + gameid;

        JP.HttpGet(url, function (isSuccess, data) {
            if (!isSuccess || !data.UserID || disconnected)
                return;

            userid = data.UserID;

            _this.UsersCount++;

            var userChannel = 'User' + userid;
            socket.join(userChannel);

            gameTable = _this.findTable(data, channel, gamemode);
            if (!gameTable) {
                console.log('GameTable not found, it must not happen. Passed parameters:', channel, gamemode);
                return;
            }
            gameTable.join(data, ipaddress, channel, gamemode);

            socket.send(JP.BuildCommand('UserAuthenticated', userid));
        }, true);

        socket.on('message', function (msg) {
            if (!userid || !gameTable || !msg)
                return;

            try  {
                if (typeof msg == 'string')
                    msg = JSON.parse(msg);
            } catch (err) {
            }

            var command = msg.command;
            var params = msg.params;

            if (!command) {
                console.log('Every message must have  "command" and optionaly "params" properties');
                return;
            }

            if (typeof gameTable[command] != 'function') {
                console.log('GameTable method not found with name:', command);
                return;
            }

            gameTable[command].apply(gameTable, params);
        });

        socket.on('close', function () {
            disconnected = true;

            if (!userid)
                return;

            _this.UsersCount--;

            gameTable && gameTable.leave(userid);
        });
    };

    Server.prototype.findTable = function (user, channel, mode) {
        var table = this.GameTables.filter(function (t) {
            return t.Players.filter(function (p) {
                return p.UserID == user.UserID;
            })[0] != undefined;
        })[0];
        if (table)
            return table;

        table = this.GameTables.filter(function (t) {
            return t.Channel == channel;
        })[0];
        if (table)
            return table;

        if (!this.createTable)
            return;

        return this.createTable(user, channel, mode);
    };

    Server.prototype.createTable = function (user, channel, mode) {
        return new GameTable(channel, mode);
    };

    Server.Start = function (port) {
        return new Server(port);
    };
    Server.API_ROOT_URL = 'http://api.jok.io/';
    return Server;
})();

Server.Start();
//# sourceMappingURL=App.js.map
