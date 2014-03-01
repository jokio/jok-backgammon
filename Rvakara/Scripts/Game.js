/// <reference path="~/Scripts/Common/kinetic-v4.4.3.js"/>

 function MoveStone() {
    this.From = 0;
    this.To = 0;
}
//Enum
var Table = {};
Table.States = {
    Started: 1,
    New: 0,
    Finished: 3,
    StartedWaiting: 2
};

Object.freeze(Table.States);

var Game = {
    proxy: new GameHub('GameHub', jok.config.sid, jok.config.channel),
    GameTable: {},
    Init: function() {

        //$(document).on('ready', this.onLoad.bind(this));
        $('#testID').on('click', this.onPlayAgain.bind(this));

        this.proxy.on('Online', this.Online.bind(this));
        this.proxy.on('Offline', this.Offline.bind(this));
        this.proxy.on('UserAuthenticated', this.UserAuthenticated.bind(this));
        this.proxy.on('TableState', this.TableState.bind(this));
        this.proxy.on('SetPosition', this.SetPosition.bind(this));
        this.proxy.start();
    },
    


    SetPosition: function(moveStone) {
        this.proxy.send('SetPosition', moveStone);
    },


    onPlayAgain: function() {
    this.proxy.send('PlayAgain', 1);
    },
    
    tryTableUpdate: function (tb) {
        for(var i=0;i<2;i++)
        if (Game.GameTable.players[i].IsRevers && Game.GameTable.players[i].UserID == Game.UserID) {
            tb.reverse();
        }
        //---
        $("div.die").click();
        //--
        for (var i = 0; i < tb.length; i++) {
	
            $('#'+i).attr('data-id', i);
            var player;
            if (tb[i].UserId == Game.UserID) {
                player= "player1";
            } else {
                player = "player2"; }
            //var magida = i;
            var fishka = tb[i].Stones;
            //var motamashe = act[i].UserId;
            $("#" + i).empty();
            
            for(var e=0; e<fishka; e++){
                output = '<div class="piece"></div>';
                $("#" + i).removeClass(player);
                $("#"+i).addClass(player).append(output);
            }
            
            $("#"+i).append('<div class="triangle">'+ fishka +'</div>');
	
        }
    },

    TableState: function (table) {
        console.log(table);
        switch (table.Status) {
            case Table.States.New:
                $('#Notification > .item').hide();
                $('#Notification > .item.waiting_opponent').show();
                jok.setPlayer(1, jok.currentUserID);
                Game.GameTable = table;
          //          this.onLoad();//      this.loadCanvas();
                Game.tryTableUpdate(Game.GameTable.TableState);
                break;


            case Table.States.Started:
                var opponent = (table.players[0].UserID == jok.currentUserID) ? table.players[1].UserID : table.players[0].UserID;
                jok.setPlayer(1, jok.currentUserID);
                jok.setPlayer(2, opponent);
                $('#Notification > .item').hide();
                Game.GameTable = table;
                Game.tryTableUpdate(Game.GameTable.TableState);
                $('#Player2 .offline').hide();
                break;
                
            case Table.States.StartedWaiting:
                $('#Notification > .item').hide();
                $('#Notification > .item.opponent_offline').show();
               

                $('#Player2 .offline').show();
                break;


            case Table.States.Finished:
                //todo
                $('#Notification > .item').hide();
                $('#Notification > .item.table_finish_winner > span').html(jok.players[table.LastWinnerPlayer.UserID].nick);
                $('#Notification > .item.table_finish_winner').show();
                Game.tryTableUpdate(Game.GameTable.TableState);
                this.gameEndCall();
                break;
        }

    },


    

    // SERVER 
    // Server Callbacks ---------------------------------------------------
    Online: function () {
        console.log('server is online');
       // Game.loadCanvas();
    },

    Offline: function () {
        console.log('server is offline');
    },

    UserAuthenticated: function (userID) {

        Game.proxy.send('IncomingMethod', 'someParam');
        Game.UserID = userID;
        jok.currentUserID = userID;

    }

};

Game.Init();

game.init = function() {

    //$('#Notification').append('<div class="item waiting_opponent_tournament"><br />Welcome<br/>Waiting for opponent...<br /><br /></div>');
    $('#Notification').append('<div class="item opponent_offline"><br />Opponent is offline, Keep playing<br /><br /></div>');

    $('#Player2').append('<div class="offline">Offline</div>');
};
var Bot = function() {
    Game.GameTable.Dices;
    var forPlay = Array();
    var Dices = Game.GameTable.Dices;
    Dices.sort();
    if (Dices[0] != Dices[1] && Dices[1] != Dices[2]) // a:b:c
    {
        for (var i = 0; i < 3; i++)
            forPlay.push(Dices[i]); //lstMove.Add(Dices[i]);
    } else {
        if (Dices[0] == Dices[1] && Dices[1] == Dices[2]) //a:a:a
        {
            for (var i = 0; i < 6; i++)
                forPlay.push(Dices[0]);
        } else {
            if (Dices[0] == Dices[1]) // a:a:b
            {
                for (var i = 0; i < 3; i++)
                    forPlay.push(Dices[0]);
                forPlay.push(Dices[2]);
            } else { //a:b:b
                for (var i = 0; i < 3; i++)
                    forPlay.push(Dices[1]);
                forPlay.push(Dices[0]);
            }
        }
    }

    for (var i = 0; i < 2; i++)
        if (Game.GameTable.players[i].IsRevers && Game.GameTable.players[i].UserID == Game.UserID) {
            Game.GameTable.TableState.reverse();
        }
    var table = Game.GameTable.TableState;
    for (var t = 0; t < table.length; i++) {

    }
};