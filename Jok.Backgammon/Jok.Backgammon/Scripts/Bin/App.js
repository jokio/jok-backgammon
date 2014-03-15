﻿global["JP"] = require('jok-play');
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var GamePlayer = (function (_super) {
    __extends(GamePlayer, _super);
    function GamePlayer(UserID, IPAddress, IsVIP, IsOnline) {
        _super.call(this, UserID, IPAddress, IsVIP, IsOnline);
        this.UserID = UserID;
        this.IPAddress = IPAddress;
        this.IsVIP = IsVIP;
        this.IsOnline = IsOnline;
    }
    GamePlayer.prototype.hasKilledStones = function () {
        return this.KilledStonsCount > 0;
    };

    GamePlayer.prototype.init = function () {
        this.StonesOut = 0;
        this.IsReversed = false;
        this.KilledStonsCount = 0;
    };
    return GamePlayer;
})(JP.GamePlayerBase);
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
var GameTable = (function (_super) {
    __extends(GameTable, _super);
    function GameTable(GamePlayerClass, Channel, Mode, MaxPlayersCount, IsVIPTable) {
        if (typeof Channel === "undefined") { Channel = ''; }
        if (typeof Mode === "undefined") { Mode = 0; }
        if (typeof MaxPlayersCount === "undefined") { MaxPlayersCount = 2; }
        if (typeof IsVIPTable === "undefined") { IsVIPTable = false; }
        _super.call(this, GamePlayerClass, Channel, Mode, MaxPlayersCount, IsVIPTable);
        this.GamePlayerClass = GamePlayerClass;
        this.Channel = Channel;
        this.Mode = Mode;
        this.MaxPlayersCount = MaxPlayersCount;
        this.IsVIPTable = IsVIPTable;

        this.Stones = [];
        this.Players = [];

        this.PendingMoves = [];

        for (var i = 0; i < 32; i++) {
            this.Stones.push(new StonesCollection());
        }
    }
    GameTable.prototype.start = function () {
        if (this.Players.length != 2)
            return;

        this.Status = JP.TableStatus.Started;
        this.Stones.forEach(function (s) {
            return new StonesCollection();
        });

        this.Players.forEach(function (p) {
            return p.init();
        });

        this.ActivePlayer = this.Players[0];
        var opponent = this.getNextPlayer();
        opponent.IsReversed = true;

        this.Stones.forEach(function (s) {
            s.UserID = null;
            s.Count = 0;
        });

        this.Stones[0].UserID = this.ActivePlayer.UserID;
        this.Stones[0].Count = 3;

        this.Stones[7].UserID = opponent.UserID;
        this.Stones[7].Count = 7;

        this.Stones[9].UserID = opponent.UserID;
        this.Stones[9].Count = 5;

        this.Stones[15].UserID = this.ActivePlayer.UserID;
        this.Stones[15].Count = 5;

        this.Stones[16].UserID = opponent.UserID;
        this.Stones[16].Count = 5;

        this.Stones[22].UserID = this.ActivePlayer.UserID;
        this.Stones[22].Count = 5;

        this.Stones[24].UserID = this.ActivePlayer.UserID;
        this.Stones[24].Count = 7;

        this.Stones[31].UserID = opponent.UserID;
        this.Stones[31].Count = 3;

        this.send('TableState', this);

        this.rolling();
    };

    GameTable.prototype.finish = function () {
        this.LastWinnerPlayer = this.ActivePlayer;
        var loser = this.getNextPlayer();

        this.LastWinnerPlayer.WinsCount++;

        this.Status = JP.TableStatus.Finished;

        this.send('TableState', this);
    };

    GameTable.prototype.playersChanged = function () {
        this.send('TableState', this);
    };

    GameTable.prototype.onMove = function (userid, index, moves) {
        var player = this.Players.filter(function (p) {
            return p.UserID == userid;
        })[0];
        if (!player)
            return;

        if (player != this.ActivePlayer)
            return;

        if (index < 0 || index > 31)
            return;

        var from = index;
        var newPosition;

        var opponent = this.getNextPlayer();

        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];

            if (!player.hasKilledStones()) {
                newPosition = from + (player.IsReversed ? -1 : 1) * move;

                if (!this.PendingMoves.contains(move))
                    continue;

                if (this.Stones.length <= newPosition)
                    continue;

                var group = this.Stones[from];
                if (group.UserID != player.UserID || group.Count == 0)
                    continue;
            } else {
                newPosition = player.IsReversed ? 32 - move : move - 1;
            }

            var newGroup = this.Stones[newPosition];
            if (newGroup.UserID != player.UserID && newGroup.Count > 1)
                continue;

            if (player.hasKilledStones())
                player.KilledStonsCount--;
            else
                this.Stones[from].Count--;

            if (newGroup.UserID != player.UserID && newGroup.Count == 1) {
                newGroup.UserID = player.UserID;
                newGroup.Count = 1;

                opponent.KilledStonsCount++;
            } else {
                newGroup.UserID = player.UserID;
                newGroup.Count++;
            }

            this.PendingMoves.remove(move);

            from = newPosition;
        }

        this.next();
    };

    GameTable.prototype.onMoveOut = function (userid, index) {
        var player = this.Players.filter(function (p) {
            return p.UserID == userid;
        })[0];
        if (!player)
            return;

        if (player != this.ActivePlayer)
            return;

        if (index < 0 || index > 31)
            return;

        if (!this.hasEveryStonesInside(player))
            return;

        var group = this.Stones[index];
        if (group.UserID != player.UserID || group.Count <= 0)
            return;

        var filtered = this.Stones.filter(function (s) {
            return s.UserID == player.UserID && s.Count > 0;
        });

        var maxLeftStone = !player.IsReversed ? filtered[0] : filtered[filtered.length - 1];

        var move = (!player.IsReversed ? 31 - index : index) + 1;
        if (!this.PendingMoves.contains(move))
            move = this.PendingMoves.filter(function (m) {
                return m > move;
            })[0];

        if (!move)
            return;

        var maxLeftStoneIndex = this.Stones.indexOf(maxLeftStone);
        var forceAllowMove = (maxLeftStoneIndex == index) && this.PendingMoves.some(function (m) {
            return m > move;
        });
        if (!this.PendingMoves.contains(move) && !forceAllowMove)
            return;

        group.Count--;
        player.StonesOut++;

        this.PendingMoves.remove(move);

        this.next();
    };

    GameTable.prototype.onPlayAgain = function (userid) {
        var player = this.Players.filter(function (p) {
            return p.UserID == userid;
        })[0];
        if (!player)
            return;

        if (this.Status != JP.TableStatus.Finished)
            return;

        if (this.Players.length != 2)
            return;

        this.start();
    };

    GameTable.prototype.next = function () {
        var _this = this;
        this.send('TableState', this);

        if (this.Stones.filter(function (s) {
            return s.UserID == _this.ActivePlayer.UserID && s.Count > 0;
        }).length == 0) {
            this.finish();
            return;
        }

        if (this.PendingMoves.length > 0 && (this.hasAnyMoves() || this.hasEveryStonesInside(this.ActivePlayer))) {
            this.ActivePlayer.send('MoveRequest');
            return;
        }

        this.ActivePlayer = this.getNextPlayer();
        this.rolling();
    };

    GameTable.prototype.rolling = function () {
        var _this = this;
        var rand = function (max) {
            return Math.floor((Math.random() * (max)) + 1);
        };

        var moves = [];
        var displayMoves = [];

        do {
            moves = [];
            displayMoves = [];

            for (var i = 0; i < 3; i++) {
                var move = rand(8);

                moves.push(move);
                displayMoves.push(move);
            }
        } while((moves.filter(function (m) {
            return m == 6;
        }).length == 3) && rand(1000000) != 6);

        var grouped = displayMoves.unique();

        if (grouped.length == 1) {
            var move = grouped[0];

            moves.push(move);
            moves.push(move);
            moves.push(move);
        }

        if (grouped.length == 2) {
            var move = grouped[0];
            if (grouped[1] == grouped[2])
                move = grouped[1];

            moves.push(move);
        }

        this.PendingMoves = [];
        moves.forEach(function (m) {
            return _this.PendingMoves.push(m);
        });

        this.send('RollingResult', moves, displayMoves, this.ActivePlayer.UserID);
        this.ActivePlayer.send('MoveRequest');
    };

    GameTable.prototype.hasAnyMoves = function () {
        var _this = this;
        if (!this.ActivePlayer)
            return false;

        return this.Stones.filter(function (s) {
            return s.UserID == _this.ActivePlayer.UserID && s.Count > 0;
        }).some(function (s) {
            return _this.checkMoves(_this.ActivePlayer, s);
        });
    };

    GameTable.prototype.checkMoves = function (player, stoneCollection) {
        var _this = this;
        var index = this.Stones.indexOf(stoneCollection);

        if (index < 0 || index > 31 || this.Stones.length != 32 || index == -1)
            return false;

        return this.PendingMoves.some(function (move) {
            if (player.hasKilledStones()) {
                var resurectMove = player.IsReversed ? 32 - move : move - 1;

                return (_this.Stones[resurectMove].UserID == player.UserID || _this.Stones[resurectMove].Count <= 1);
            }

            var nextMove = index + (player.IsReversed ? -1 : 1) * move;
            if (nextMove < 0 || nextMove > 31)
                return false;

            return (_this.Stones[nextMove].UserID == player.UserID) || (_this.Stones[nextMove].Count <= 1);
        });
    };

    GameTable.prototype.hasEveryStonesInside = function (player) {
        var _this = this;
        if (player.hasKilledStones())
            return false;

        return this.Stones.filter(function (s) {
            return s.UserID == player.UserID;
        }).every(function (s) {
            var index = _this.Stones.indexOf(s);

            return (!player.IsReversed ? (index > 23) : (index < 8)) || (s.Count == 0);
        });
    };

    GameTable.prototype.getNextPlayer = function (player) {
        if (this.Players.length <= 1)
            return;

        if (!player)
            player = this.ActivePlayer;

        if (!player)
            return;

        var index = this.Players.indexOf(player);

        return this.Players[index < this.Players.length - 1 ? ++index : 0];
    };
    return GameTable;
})(JP.GameTableBase);
JP.Server.Start(process.env.PORT || 9003, GameTable, GamePlayer);
//# sourceMappingURL=App.js.map
