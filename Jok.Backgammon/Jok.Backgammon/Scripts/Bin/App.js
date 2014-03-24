global["JP"] = require('jok-play');
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
        this.WaitingStartTime = 0;
        this.ReservedTime = 0;
        6 * 60 * 1000;
        this.HasAnyMoveMade = true;
    };

    GamePlayer.prototype.removeReserveTime = function () {
        if (!this.WaitingStartTime)
            return;

        var time = Date.now() - this.WaitingStartTime;
        if (time < 0)
            return;

        this.ReservedTime -= time > 0 ? time : 0;
        this.WaitingStartTime = undefined;
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
var DiceState = (function () {
    function DiceState(Number, Count) {
        if (typeof Count === "undefined") { Count = 1; }
        this.Number = Number;
        this.Count = Count;
    }
    return DiceState;
})();
var Timers = (function () {
    function Timers() {
    }
    return Timers;
})();

var Commands = (function () {
    function Commands() {
    }
    Commands.ActivatePlayer = 'ActivatePlayer';
    Commands.TableState = 'TableState';
    Commands.RollingResult = 'RollingResult';
    return Commands;
})();

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

        this.PendingDices = [];

        for (var i = 0; i < 32; i++) {
            this.Stones.push(new StonesCollection());
        }

        this.ID = require('node-uuid').v4();
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

        this.LastMovedStoneIndexes = [];

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

        Timers.MoveWaitingTimeout = undefined;

        this.send(Commands.TableState, this);
        this.send(Commands.ActivatePlayer, this.ActivePlayer.UserID);

        this.rolling();
    };

    GameTable.prototype.finish = function () {
        this.LastWinnerPlayer = this.ActivePlayer;
        var loser = this.getNextPlayer();

        this.LastWinnerPlayer.WinsCount++;

        this.Status = JP.TableStatus.Finished;

        this.send(Commands.TableState, this);
    };

    GameTable.prototype.playersChanged = function () {
        this.send(Commands.TableState, this);
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

            var usedDice = this.PendingDices.filter(function (d) {
                return d.Number == move && d.Count > 0;
            })[0];

            if (!player.hasKilledStones()) {
                newPosition = from + (player.IsReversed ? -1 : 1) * move;

                if (!usedDice)
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

            usedDice.Count--;

            from = newPosition;

            this.LastMovedStoneIndexes = [{
                    Index: newPosition,
                    UserID: player.UserID
                }];
        }

        return this.next();
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

        this.LastMovedStoneIndexes = [{
                UserID: -1,
                Index: -1
            }];

        var usedDice = this.checkMoveOut(player, index);
        if (!usedDice)
            return;

        group.Count--;
        player.StonesOut++;

        usedDice.Count--;

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
        this.send(Commands.TableState, this);
        this.send(Commands.RollingResult, this.PendingDices, this.ActivePlayer.UserID, false);

        if (this.Stones.filter(function (s) {
            return s.UserID == _this.ActivePlayer.UserID && s.Count > 0;
        }).length == 0) {
            this.finish();
            return;
        }

        if (this.PendingDices.filter(function (d) {
            return d.Count > 0;
        }).length > 0 && (this.hasAnyMoves() || this.hasEveryStonesInside(this.ActivePlayer))) {
            this.ActivePlayer.send('MoveRequest');
            return;
        }

        clearTimeout(Timers.MoveWaitingTimeout);
        this.ActivePlayer.removeReserveTime();

        this.ActivePlayer = this.getNextPlayer();
        this.rolling();

        this.send(Commands.ActivatePlayer, this.ActivePlayer.UserID);

        return true;
    };

    GameTable.prototype.rolling = function () {
        var _this = this;
        var rand = function (max) {
            return Math.floor((Math.random() * (max)) + 1);
        };

        var moves = [];

        do {
            moves = [];

            for (var i = 0; i < 3; i++) {
                var move = rand(8);

                moves.push(move);
            }
        } while((moves.filter(function (m) {
            return m == 6;
        }).length == 3) && rand(1000000) != 6);

        this.PendingDices = [];
        moves.forEach(function (m) {
            return _this.PendingDices.push(new DiceState(m, 1));
        });

        var grouped = moves.unique();

        if (grouped.length == 1) {
            this.PendingDices.forEach(function (d) {
                return d.Count = 2;
            });
        }

        if (grouped.length == 2) {
            var dice = this.PendingDices[2];
            if (this.PendingDices[0].Number == this.PendingDices[1].Number)
                dice = this.PendingDices[1];

            dice.Count = 2;
        }

        this.send(Commands.RollingResult, this.PendingDices, this.ActivePlayer.UserID, true);
        this.ActivePlayer.send('MoveRequest');

        clearTimeout(Timers.MoveWaitingTimeout);
        Timers.MoveWaitingTimeout = setTimeout(function () {
            var interval = GameTable.PLAY_RESERVED_TIME_INTERVAL;
            if (interval > _this.ActivePlayer.ReservedTime)
                interval = _this.ActivePlayer.ReservedTime;

            _this.ActivePlayer.WaitingStartTime = Date.now();
            clearTimeout(Timers.MoveWaitingTimeout);
            Timers.MoveWaitingTimeout = setTimeout(_this.makeBotMove.bind(_this), interval);
        }, GameTable.PLAY_FOR_ROLL_TIME);

        if (!this.hasAnyMoves()) {
            setTimeout(this.next.bind(this), 2000);
        }
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

    GameTable.prototype.makeBotMove = function () {
        var _this = this;
        this.ActivePlayer.removeReserveTime();

        if (this.ActivePlayer.KilledStonsCount > 0) {
            this.PendingDices.forEach(function (dice) {
                var length = dice.Count;
                for (var j = 0; j < length; j++) {
                    if (_this.ActivePlayer.KilledStonsCount > 0) {
                        var fromStone = _this.Stones.filter(function (s, i) {
                            return (s.UserID == _this.ActivePlayer.UserID) && (s.Count > 0) && _this.checkOneMove(_this.ActivePlayer, dice, i) > -1;
                        })[0];
                        var index = _this.Stones.indexOf(fromStone);

                        if (index > -1) {
                            _this.onMove(_this.ActivePlayer.UserID, index, [dice.Number]);
                        }
                    }
                }
            });
        }

        if (this.ActivePlayer.KilledStonsCount > 0)
            return;

        for (var k = 0; k < 4; k++) {
            var isFinished;

            this.PendingDices.forEach(function (dice) {
                if (!isFinished) {
                    var length = dice.Count;
                    for (var j = 0; j < length; j++) {
                        var fromStone = _this.Stones.filter(function (s, i) {
                            return (s.UserID == _this.ActivePlayer.UserID) && (s.Count > 0) && _this.checkOneMove(_this.ActivePlayer, dice, i) > -1;
                        })[0];
                        var index = _this.Stones.indexOf(fromStone);

                        if (index > -1) {
                            isFinished = _this.onMove(_this.ActivePlayer.UserID, index, [dice.Number]);
                        }
                    }
                }
            });

            if (isFinished) {
                break;
            }
        }

        if (this.PendingDices.length && this.hasEveryStonesInside(this.ActivePlayer)) {
            var length = 0;
            this.PendingDices.forEach(function (d) {
                return length += d.Count;
            });

            for (var j = 0; j < length; j++) {
                var fromStone = this.Stones.filter(function (s, i) {
                    return (s.UserID == _this.ActivePlayer.UserID) && (s.Count > 0) && _this.checkMoveOut(_this.ActivePlayer, i) != undefined;
                })[0];
                var index = this.Stones.indexOf(fromStone);

                if (index > -1)
                    this.onMoveOut(this.ActivePlayer.UserID, index);
            }
        }
    };

    GameTable.prototype.checkMoves = function (player, stoneCollection) {
        var _this = this;
        var index = this.Stones.indexOf(stoneCollection);

        if (index < 0 || index > 31 || this.Stones.length != 32 || index == -1)
            return false;

        return this.PendingDices.filter(function (d) {
            return d.Count > 0;
        }).some(function (dice) {
            return _this.checkOneMove(player, dice, index) > -1;
        });
    };

    GameTable.prototype.checkOneMove = function (player, dice, index) {
        if (player.hasKilledStones()) {
            var resurectMove = player.IsReversed ? 32 - dice.Number : dice.Number - 1;

            return (this.Stones[resurectMove].UserID == player.UserID || this.Stones[resurectMove].Count <= 1) ? resurectMove : -1;
        }

        var nextMove = index + (player.IsReversed ? -1 : 1) * dice.Number;
        if (nextMove < 0 || nextMove > 31)
            return -1;

        if ((this.Stones[nextMove].UserID == player.UserID) || (this.Stones[nextMove].Count <= 1))
            return nextMove;

        return -1;
    };

    GameTable.prototype.checkMoveOut = function (player, index) {
        var filtered = this.Stones.filter(function (s) {
            return s.UserID == player.UserID && s.Count > 0;
        });

        var maxLeftStone = filtered[player.IsReversed ? filtered.length - 1 : 0];

        var move = (!player.IsReversed ? 31 - index : index) + 1;

        var usedDice = this.PendingDices.filter(function (d) {
            return d.Number == move && d.Count > 0;
        })[0];

        if (!usedDice) {
            usedDice = this.PendingDices.filter(function (m) {
                return (m.Number > move) && (m.Count > 0);
            })[0];
            var isMaxLeftStone = true;
        }

        if (!usedDice)
            return;

        var maxLeftStoneIndex = this.Stones.indexOf(maxLeftStone);
        if (isMaxLeftStone && maxLeftStoneIndex != index)
            return;

        return usedDice;
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
    GameTable.PLAY_RESERVED_TIME_INTERVAL = 20 * 1000;

    GameTable.PLAY_FOR_ROLL_TIME = 20 * 1000;
    return GameTable;
})(JP.GameTableBase);
JP.Server.Start(process.env.PORT || 9003, GameTable, GamePlayer);
//# sourceMappingURL=App.js.map
