var engine = require('engine.io');
var engineRooms = require('engine.io-rooms');
var http = require('http');
var urlParser = require('url');



class Server {

    public static API_ROOT_URL = 'http://api.jok.io/';

    public StartTime;
    public GameTables: GameTable[] = [];
    public UsersCount = 0;

    private io;

    constructor(private port = process.env.PORT || 9003) {

        var server = http.createServer(this.httpHandler.bind(this));
        this.io = engine.attach(server);

        // added channels support
        this.io = engineRooms(this.io);

        JP.IO = this.io;


        this.StartTime = Date.now();

        this.io.on('connection', this.onConnectionOpen.bind(this));

        server.listen(this.port, () => {
            console.log('server listening at port:', this.port);
        });


        JP.SendMail('status-update@jok.io', 'jok-realtime-server started', 'StartTime: ' + new Date());
    }


    // processing http request
    httpHandler(req, res) {

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
    }


    // processing commands
    onConnectionOpen(socket) {

        console.log('shemovida connection');

        var sid = socket.request.query.token;
        var gameid = socket.request.query.gameid;
        var gamemode = socket.request.query.gamemode;
        var channel = socket.request.query.channel;
        var ipaddress = socket.request.headers["x-forwarded-for"];


        // ip მისამართის გაგება, გათვალისწინებულია proxy-დან მოსული შეტყობინებებიც (heroku-ს შემთხვევა)
        if (ipaddress) {
            var list = ipaddress.split(",");
            ipaddress = list[list.length - 1];
        } else {
            ipaddress = socket.request.connection.remoteAddress;
        }


        // აუცილებელ ველებზე შემოწმება
        if (!sid || !ipaddress || !gameid) return;


        var userid;
        var disconnected;
        var gameTable: GameTable;

        var url = Server.API_ROOT_URL + 'User/InfoBySID?sid=' + sid + '&ipaddress=' + ipaddress + '&gameid=' + gameid;



        // მომხმარებლის ინფორმაციის აღება
        JP.HttpGet(url, (isSuccess, data) => {

            if (!isSuccess || !data.UserID || disconnected) return;


            // ე.წ. ავტორიზაცია კომექშენის
            userid = data.UserID;


            // ავტორიზირებული მომხმარებლების რაოდენობის გაზრდა
            this.UsersCount++;


            // მომხმარებლის გაწევრიანება საკუთარ ჩანელში, რათა შემდეგ მოხდეს ინფორმაციის გაგზავნა
            var userChannel = 'User' + userid;
            socket.join(userChannel);


            // მაგიდაზე შეყვანა ეგრევე
            gameTable = this.findTable(data, channel, gamemode);
            if (!gameTable) {
                console.log('GameTable not found, it must not happen. Passed parameters:', channel, gamemode);
                return;
            }
            gameTable.join(data, ipaddress, channel, gamemode);


            // ავტორიზაციის შესახებ ინფორმაციის გაგზავნა კლიენტთან, რათა გააგრძელოს პროცესი
            socket.send(JP.BuildCommand('UserAuthenticated', userid));

        }, true);



        socket.on('message', (msg) => {

            // თუ არ არის ავტორიზირებული, ან არ აქვს მაგიდა მინიჭებული, არცერთ ბრძანებას არ ვასრულებთ
            if (!userid || !gameTable || !msg) return;


            // ობიექტად გადაქცევა
            try {
                if (typeof msg == 'string')
                    msg = JSON.parse(msg);
            }
            catch (err) { }


            // აუცილებელია გადმოწოდებული იყოს კომანდის პარამეტრი, რის მიხედვითაც მეთოდს მოძებნის მაგიდის კლასში
            var command = msg.command;
            var params = msg.params;

            if (!command) {
                console.log('Every message must have  "command" and optionaly "params" properties');
                return;
            }

            // მაგიდას თუ არ გააჩნია კომანდის შესაბამისი მეთოდი, ვიკიდებთ
            if (typeof gameTable[command] != 'function') {
                console.log('GameTable method not found with name:', command);
                return;
            }

            gameTable[command].apply(gameTable, params);
        });



        socket.on('close', () => {

            // მონიშვნა როგორც გათიშული, რათა არ გაგრძელდეს სხვა პროცესები
            disconnected = true;

            // თუ არ არის ავტორიზირებული გამოვდივართ
            if (!userid) return;

            // მომხმარებლების რაოდენობის შემცირება
            this.UsersCount--;

            // მაგიდიდან გამოსვლა
            gameTable && gameTable.leave(userid);
        });
    }


    // find table
    findTable(user, channel: string, mode: number): GameTable {

        // თუ უკვე თამაშობდა რომელიმე მაგიდაზე
        var table = this.GameTables.filter(t => t.Players.filter(p=> p.UserID == user.UserID)[0] != undefined)[0]
        if (table) return table;


        // გადმოწოდებული პარამეტრების მიხედვით შასაბამისი მაგიდის მოძებნა
        table = this.GameTables.filter(t => t.Channel == channel)[0]
        if (table) return table;


        // თუ არცერთი არ მოიძებნა, მაშინ უკვე ვქმნით ახალ მაგიდას
        if (!this.createTable) return;


        return this.createTable(user, channel, mode);
    }


    createTable(user, channel, mode) {
        return new GameTable(channel, mode);
    }


    // Static
    public static Start(port?) {
        return new Server(port);
    }
}


Server.Start();