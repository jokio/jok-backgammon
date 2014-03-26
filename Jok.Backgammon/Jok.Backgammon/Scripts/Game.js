

var JP = {

    createSocket: function (opts) {

        var root = opts.cbEventsRoot;

        var proxy = eio.Socket(opts.connectUrl, {
            query: {
                token: opts.token || '',
                gameid: opts.gameid || 0,
                gamemode: opts.gamemode || 1,
                channel: opts.channel || ''
            }
        });

        //var proxy = reconnect(proxy, {
        //    reconnectTimeout: opts.reconectTimeout || 60 * 60 * 1000 /* 1 Hour */
        //});

        proxy.on('message', function (msg) {

            if (!root) return;

            try {
                if (typeof msg == 'string')
                    msg = JSON.parse(msg);
            }
            catch (err) { }

            if (Object.prototype.toString.call(msg) !== '[object Array]') {
                return;
            }

            if (!msg.length) return;

            var command = msg.shift();
            var params = msg;

            if (!command) return;

            command = 'on' + command;

            if (!Game[command]) return;
            if (typeof Game[command] != 'function') return;

            console.log(command, params);

            root[command].apply(Game, params);
        });

        var _this = this;
        proxy.on('open', function () {
            opts.cbOnline && opts.cbOnline();
        });
        proxy.on('close', function () {
            opts.cbOffline && opts.cbOffline();
        });


        proxy.sendCommand = function (command) {

            var params = [];
            for (var _i = 0; _i < (arguments.length - 1) ; _i++) {
                params[_i] = arguments[_i + 1];
            }

            params.unshift(command);

            var msg = JSON.stringify(params);

            this.send(msg);
        }

        return proxy;
    }
}


var Game = {

    state: [],

    dices: [],

    gameService: undefined,

    isMoveAllowed: false,

    currentPlayerHasKilledStones: undefined,

    stoneMovingFromID: undefined,



    init: function () {

        $('#Notification .item').hide();
        $('#Notification .item.connecting').show();

        this.gameService = JP.createSocket({
            connectUrl: jok.config.connectUrl,
            token: jok.config.sid,
            gameid: jok.config.gameid,
            gamemode: jok.config.gamemode,
            channel: jok.config.channel,
            cbOnline: this.onOnline.bind(this),
            cbOffline: this.onOffline.bind(this),
            cbEventsRoot: this
        });

        $(document).on('click', '#Board .stone_collection', this.UIStoneMove);
        $(document).on('mousedown', '#Board .stone_collection', this.UIStoneStartMoving);
        $(document).on('mouseup', '#Board .stone_collection', this.UIStoneFinishMoving);
        $(document).on('mousemove', '#Board', this.UIStoneMovingOverBoard);
        $(document).on('click', '#Board .move_outside', this.UIStoneMoveOut);
        $(document).on('mouseup', '#Board .move_outside', this.UIStoneMoveOut);
        $(document).on('click', '.play_again', Game.UIPlayAgain);
        $(document).on('click', '.new_game', Game.UINewGame);

        $(document).on('mouseup', '#Board .mouse_drag_moving', function () {
            $(this).hide();
            Game.stoneMovingFromID = undefined;
        });
    },



    // UI Events --------------------------------------------------
    UIStoneMove: function () {
        var colid = $(this).attr('data-id');
        var fromColID = $(this).attr('data-from-id');

        Game.stoneMove(colid, fromColID);
    },

    UIStoneStartMoving: function () {
        var colid = $(this).attr('data-id');
        var fromColID = $(this).attr('data-from-id');

        if (fromColID) return;
        if (!Game.stoneMove(colid)) return;

        Game.stoneMovingFromID = colid;
        Game.refreshMovingStone();


        $('#Board .stone.mouse_drag_moving').show();
    },

    UIStoneFinishMoving: function () {
        try {
            var colid = $(this).attr('data-id');
            var fromColID = $(this).attr('data-from-id');

            $('#Board .stone.mouse_drag_moving').hide();

            if (Game.stoneMovingFromID == colid) return;

            Game.stoneMove(colid, fromColID);
        }
        finally {
            Game.stoneMovingFromID = undefined;
        }
    },

    UIStoneMovingOverBoard: function () {
        if (!Game.stoneMovingFromID) return;

        Game.refreshMovingStone();
    },

    UIStoneMoveOut: function () {
        var fromColID = $(this).attr('data-from-id');

        Game.stoneMoveOut(fromColID);

        $('#Board .stone.mouse_drag_moving').hide();
    },

    UIPlayAgain: function () {
        Game.gameService.sendCommand('PlayAgain');
    },

    UINewGame: function () {
        document.location.reload();
    },



    // Server Callbacks -------------------------------------------
    onOnline: function () {
        console.log('online');
    },

    onOffline: function () {
        console.log('offline');
        $('#Notification .item').hide();
        $('#Notification .item.quit span').html('');
        $('#Notification .item.quit').show();

        $('#Game .center_title').hide();
    },

    onUserAuthenticated: function (userid) {
        jok.currentUserID = userid;
    },

    onTableState: function (table) {

        this.isMoveAllowed = false;
        this.clearStoneHighlights();

        $('#Game .center_title').hide();
        $('#Player2 .offline').hide();


        jok.chat.join(table.ID);

        switch (table.Status) {
            case 0: {
                jok.setPlayer(1, table.Players[0].UserID);
                jok.setPlayer(2, null);

                $('#Notification .item').hide();
                if (table.Channel)
                    $('#Notification .item.share_friends').show();
                else
                    $('#Notification .item.waiting_opponent').show();

                this.setState(table.Stones);
                break;
            }

            case 1: {
                $('#Notification .item').hide();

                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                jok.setPlayer(1, currentPlayer.UserID);
                jok.setPlayer(2, opponentPlayer.UserID);

                var isMove;
                if (table.LastMovedStoneIndexes && table.LastMovedStoneIndexes.length) {
                    table.LastMovedStoneIndexes.forEach(function (item) {

                        if (table.Stones[item.Index] && (item.UserID != jok.currentUserID))
                            table.Stones[item.Index].HighlightMe = true;
                    });

                    isMove = true;
                }

                $('#Game .center_title').show();

                this.setState(table.Stones, currentPlayer.IsReversed, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount, isMove);
                break;
            }

            case 2: {
                $('#Notification .item').hide();
                $('#Notification .item.opponent_offline').show();

                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                jok.setPlayer(1, currentPlayer.UserID);
                jok.setPlayer(2, opponentPlayer.UserID);

                this.isMoveAllowed = false;

                $('#Player2 .offline').show();

                this.setState(table.Stones, table.Players[1].UserID == jok.currentUserID, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount);
                break;
            }

            case 3: {

                this.stopWaitingAnimation();

                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                $('#Notification .item').hide();

                if (opponentPlayer) {
                    $('#Notification .item.table_finish_winner span').html(jok.players[table.LastWinnerPlayer.UserID].nick);
                    $('#Notification .item.table_finish_winner').show();
                }
                else {
                    $('#Notification .item.table_finish_winner2 span').html(jok.players[table.LastWinnerPlayer.UserID].nick);
                    $('#Notification .item.table_finish_winner2').show();
                }

                this.setState(table.Stones, table.Players[1].UserID == jok.currentUserID, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount);

                if (currentPlayer && opponentPlayer && (currentPlayer.WinsCount > 0 || opponentPlayer.WinsCount > 0)) {
                    $('#Player1').find('.wins').html(currentPlayer.WinsCount);
                    $('#Player2').find('.wins').html(opponentPlayer.WinsCount);
                }

                $('.player .nick').removeClass('active');

                break;
            }
        }
    },

    onRollingResult: function (pendingDices, activeUserID, shakeEffect) {

        var pendingMoves = [];
        pendingDices.forEach(function (d) {
            for (var i = 0; i < d.Count; i++) {
                pendingMoves.push(d.Number);
            }
        });

        this.dices = pendingMoves;

        this.setDices(pendingDices, activeUserID, shakeEffect);
    },

    onMoveRequest: function () {

        this.isMoveAllowed = true;

        $('#Board .triangle').addClass('allowed');
        $('#Board .triangle_rotated').addClass('allowed');

        if (this.currentPlayerHasKilledStones)
            this.allPossibleMoves();


        //$('#Board .stone.opponent').css('opacity', 0.7);
    },

    onActivatePlayer: function (userID, period, additionalPeriod) {

        if (!userID) return;

        this.startWaitingAnimation(userID, period, additionalPeriod);
    },



    // Methods ----------------------------------------------------
    setState: function (state, reverseNumbers, playerKilledStones, opponentKilledStones, isMove) {

        // stuff
        state.forEach(function (item, i) {
            item.OriginalIndex = i;
        });

        if (reverseNumbers) {
            state = state.reverse();
        }

        // processing
        this.state = state;

        var _this = this;


        state.forEach(function (item, i) {
            _this.setStonesCollection(i, item.Count, item.UserID == jok.currentUserID, item.HighlightMe)
        });

        $('#Board .player_killed_stones').empty();
        $('#Board .opponent_killed_stones').empty();

        if (playerKilledStones) {
            for (var i = 0; i < playerKilledStones; i++) {
                $('#Board .player_killed_stones').append('<div class="stone">');
            }
        }

        if (opponentKilledStones) {
            for (var i = 0; i < opponentKilledStones; i++) {
                $('#Board .opponent_killed_stones').append('<div class="stone opponent">');
            }
        }

        if (isMove) {
            $('#MoveAudio')[0].play();
        }

        this.currentPlayerHasKilledStones = playerKilledStones > 0;
    },

    setDices: function (dices, userid, shakeEffect) {

        dices.sort(function (a, b) {
            return b.Number - a.Number;
        });


        $('#Board .dices .dice').removeClass('disabled');

        var cbUpdate = function () {
            for (var i = 0; i < dices.length; i++) {
                var item = $('#Board .dices .dice' + (i + 1));
                item.attr('data-dice', dices[i].Number);
                item.html(dices[i].Number);

                if (dices[i].Count == 0)
                    item.addClass('disabled');
            }
        }

        if (shakeEffect) {
            $('#Board .dices').hide();
            var container = $('#Board .dices.' + (jok.currentUserID == userid ? 'current' : 'opponent'));
            $('#Board .dices .dice').html('');
            container.show();
            container.effect("shake", cbUpdate);

            $('#RollingAudio')[0].play();
            this.clearStoneHighlights();
        }
        else {
            cbUpdate();
        }

    },

    stoneMove: function (index, fromIndex) {

        if (!this.isMoveAllowed) return;

        index = parseInt(index);
        if (fromIndex)
            fromIndex = parseInt(fromIndex);

        $('#Board .move_outside').removeAttr('data-from-id');
        $('#Board .move_outside').hide();


        if (!fromIndex && fromIndex != 0 && !this.currentPlayerHasKilledStones) {
            var result = this.allPossibleMoves(index);

            if (this.hasEveryStonesInside()) {

                var move = 31 - index + 1;
                var maxLeftStone = this.state.filter(function (item) {
                    return (item.UserID == jok.currentUserID) && (item.Count > 0);
                })[0];

                var forceAllowMove = false;
                if (maxLeftStone) {
                    var maxLeftStoneIndex = this.state.indexOf(maxLeftStone);
                    forceAllowMove = (maxLeftStoneIndex == index) && this.dices.filter(function (dice) {
                        return dice > move;
                    }).length > 0;
                }

                if (this.state[index].Count > 0 && this.dices.indexOf(move) > -1 || forceAllowMove) {
                    $('#Board .move_outside').attr('data-from-id', index);
                    $('#Board .move_outside').show();
                    result = true;
                }

            }

            return result;
        }
        else {
            if (this.state[index].dices)
                this.makeMove(index, fromIndex, this.state[index].dices);

            $('#Board .move_outside').removeAttr('data-from-id');
            $('#Board .move_outside').hide();
        }
    },

    stoneMoveOut: function (index) {
        this.gameService.sendCommand('MoveOut', this.state[index].OriginalIndex);

        var move = 31 - index + 1;

        this.clearStoneHighlights();
        this.removeDices([move]);

        this.isMoveAllowed = false;

        $('#Board .triangle').removeClass('allowed');
        $('#Board .triangle_rotated').removeClass('allowed');

        $('#Board .move_outside').removeAttr('data-from-id');
        $('#Board .move_outside').hide();
    },



    // Helper -----------------------------------------------------
    makeMove: function (index, fromIndex, dices) {
        console.log(index, fromIndex, dices);

        this.gameService.sendCommand('Move', this.currentPlayerHasKilledStones ? 0 : this.state[fromIndex].OriginalIndex, dices);

        this.clearStoneHighlights();
        this.removeDices(dices);

        this.isMoveAllowed = false;

        $('#Board .triangle').removeClass('allowed');
        $('#Board .triangle_rotated').removeClass('allowed');
    },

    removeDices: function (dices) {
        var _this = this;
        dices.forEach(function (item) {
            for (var i = 0; i < _this.dices.length; i++) {
                if (_this.dices[i] == item) {
                    _this.dices.splice(i, 1);
                    break;
                }
            }
        });

        dices.forEach(function (item) {
            var el = $('#Board .dices.current .dice[data-dice=' + item + ']:not(.disabled)');

            if ((_this.dices.indexOf(item) == -1) || (el.length > 1))
                $(el[0]).addClass('disabled');
        });
    },

    setStonesCollection: function (index, count, isPlayerStones, isHighlighted) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        container.find('.stone').remove();

        for (var i = 0; i < count; i++) {
            var item = $('<div class="stone">');
            if (!isPlayerStones)
                item.addClass('opponent');

            if (count > 7)
                item.addClass('near');

            if (count > 10)
                item.addClass('near2');

            container.append(item);
        }

        if (isHighlighted) {
            var lastStone = container.find('.stone');
            lastStone = lastStone[index > 15 ? 0 : lastStone.length - 1];

            if (lastStone) {
                $(lastStone).addClass('move_highlight');

                setTimeout(function () {
                    $(lastStone).removeClass('move_highlight');
                }, 500);
            }
        }
    },

    setStoneHighlight: function (index, fromIndex) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        if (container.find('.highlight').length) return;

        var dices = this.state[index].dices;

        var item = $('<div class="stone highlight">');
        if (dices) {
            if (dices.length > 3)
                item.addClass('mini');

            if (dices.length <= 3)
                item.html(dices.join(' '));

            if (dices.length == 4)
                item.html(dices[0] + ' ' + dices[1] + '<br/>' + dices[2] + ' ' + dices[3]);

            if (dices.length == 5)
                item.html(dices[0] + ' ' + dices[1] + ' ' + dices[2] + '<br/>' + dices[3] + ' ' + dices[4]);

            if (dices.length == 6)
                item.html(dices[0] + ' ' + dices[1] + ' ' + dices[2] + '<br/>' + dices[3] + ' ' + dices[4] + ' ' + dices[5]);
        }

        container.attr('data-from-id', fromIndex);

        if (container.parent().hasClass('items_bottom')) {
            container.prepend(item);
        } else {
            container.append(item);
        }
    },

    clearStoneHighlights: function () {
        $('#Board .stone.highlight').remove();
        $('#Board .stone.highlight').html('');

        $('#Board .stone_collection').removeAttr('data-from-id');
    },

    allPossibleMoves: function (col) {
        this.clearStoneHighlights();

        if (!this.currentPlayerHasKilledStones) {
            var stonesContainer = this.state[col];
            if (!stonesContainer || stonesContainer.UserID != jok.currentUserID || stonesContainer.Count == 0) return;
        }

        var _this = this;

        var hasAnyMove = false;

        this.getAllDiceMoves(this.dices, col).forEach(function (item) {

            var index = col + item;

            // თუ გასაცოცხლებელია რამე, კარებში ვსვავთ
            if (_this.currentPlayerHasKilledStones) {
                index = item - 1;
            }

            if (_this.checkMove(index))
                _this.setStoneHighlight(index, col);

            hasAnyMove = true;
        });

        return hasAnyMove;
    },

    getAllDiceMoves: function (dices, col) {
        var results = [];

        var _this = this;
        var index;

        // სათითაოდ თითოეული კამათელი
        dices.forEach(function (item, i) {

            index = col + item;

            // თუ გასაცოცხლებელია რამე, კარებში ვსვავთ
            if (_this.currentPlayerHasKilledStones) {
                index = item - 1;
            }

            if (_this.checkMove(index)) {
                results.push(item);
                //console.log(item);

                _this.state[index].dices = [item];

                if (!_this.currentPlayerHasKilledStones) {
                    // კომბინირებული მეორე კამათელებთან
                    dices.forEach(function (item2, i2) {

                        index = col + item + item2;

                        if (i != i2 && _this.checkMove(index)) {
                            results.push(item + item2);
                            //console.log(item, item2);

                            _this.state[index].dices = [item, item2];

                            // სამივე კამათელი შეკრებილი
                            dices.forEach(function (item3, i3) {

                                index = col + item + item2 + item3;

                                if (i != i3 && i2 != i3 && _this.checkMove(index)) {

                                    _this.state[index].dices = [item, item2, item3];

                                    results.push(item + item2 + item3);
                                    //console.log(item, item2, item3);



                                    // თუ ოთხი სვლა მოვიდა, იმ შემთხვევაში როდესაც ორი ერთნაირი დასვა
                                    if (dices.length >= 4) {
                                        dices.forEach(function (item4, i4) {

                                            index = col + item + item2 + item3 + item4;

                                            if (i != i4 && i2 != i4 && i3 != i4 && _this.checkMove(index)) {

                                                _this.state[index].dices = [item, item2, item3, item4];

                                                results.push(item + item2 + item3 + item4);
                                                //console.log(item, item2, item3, item4);


                                                // თუ სამივე ერთიდაიგივე გააგორა, საჭიროა 6-მაგად დატრიალება
                                                if (dices.length == 6) {
                                                    dices.forEach(function (item5, i5) {

                                                        index = col + item + item2 + item3 + item4 + item5;

                                                        if (i != i5 && i2 != i5 && i3 != i5 && i4 != i5 && _this.checkMove(index)) {

                                                            _this.state[index].dices = [item, item2, item3, item4, item5];

                                                            results.push(item + item2 + item3 + item4 + item5);
                                                            //console.log(item, item2, item3, item4, item5);


                                                            dices.forEach(function (item6, i6) {

                                                                index = col + item + item2 + item3 + item4 + item5 + item6;

                                                                if (i != i6 && i2 != i6 && i3 != i6 && i4 != i6 && i5 != i6 && _this.checkMove(index)) {

                                                                    _this.state[index].dices = [item, item2, item3, item4, item5, item6];

                                                                    results.push(item + item2 + item3 + item4 + item5 + item6);
                                                                    //console.log(item, item2, item3, item4, item5, item6);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });


        // უნიკალური ვარიანტების ამოკრეფა
        var outputArray = [];

        for (var i = 0; i < results.length; i++) {
            if (($.inArray(results[i], outputArray)) == -1) {
                outputArray.push(results[i]);
            }
        }

        return outputArray;
    },

    checkMove: function (index) {

        var collection = this.state[index];
        if (collection) {
            if (!collection.UserID ||
                (collection.UserID == jok.currentUserID) ||
                (collection.UserID != jok.currentUserID && collection.Count <= 1)) {
                return true;
            }
        }

        return false;
    },

    hasEveryStonesInside: function () {

        if (this.currentPlayerHasKilledStones)
            return false;

        for (var i = 0; i < this.state.length; i++) {
            var stone = this.state[i];

            if (stone.UserID == jok.currentUserID && stone.Count > 0 && i < 24) {
                return false;
            }
        }

        return true;
    },

    refreshMovingStone: function () {
        var offset = $('#Board').offset();
        var dragStone = $('#Board .stone.mouse_drag_moving');
        dragStone.css('left', event.pageX - offset.left - 20 + 'px');
        dragStone.css('top', event.pageY - offset.top - 20 + 'px');
    },

    startWaitingAnimation: function (userID, period, additionalPeriod) {
        this.stopWaitingAnimation();

        var userObj = $('.player[data-userid=' + userID + '] .progresbar');
        if (!userObj.length) return;

        userObj.removeClass('additional');
        userObj.addClass('active');
        userObj.css('width', '120px');


        var total = period;

        this.progresbarInterval = setInterval(function () {
            period -= 300;

            var width = 120 * period / total;

            userObj.width(width);

            if (period < 0) {

                Game.stopWaitingAnimation();
                if (!additionalPeriod) return;

                userObj.addClass('additional');
                userObj.css('width', '120px');

                total = additionalPeriod;
                Game.progresbarInterval = setInterval(function () {
                    additionalPeriod -= 300;

                    var width = 120 * additionalPeriod / total;

                    userObj.width(width);

                }, 300);
            }

        }, 300);

        //userObj.animate({ width: 0 }, period, function () {
        //    if (!additionalPeriod) return;

        //    userObj.addClass('additional');
        //    userObj.css('width', '120px');
        //    userObj.animate({ width: 0 }, additionalPeriod);
        //});
    },

    stopWaitingAnimation: function () {

        clearInterval(this.progresbarInterval);

        $('.player .progresbar').width(0);
        $('.player .progresbar').removeClass('active');
        $('.player .progresbar').stop(true);
    },

};


game.init = function () {

    $('#Notification').append('<div class="item waiting_opponent_tournament"><br />Welcome<br/>Waiting for opponent...<br /><br /></div>');
    $('#Notification').append('<div class="item opponent_offline"><br />Opponent is offline, Keep playing<br /><br /></div>');
    $('#Notification').append('<div class="item table_finish_winner2">Winner: <span>WINNER NAME GOES HERE</span><br /><br /><button class="button brown new_game">Play on another table</button></div>');


    $('#Player1').append('<div class="added_rating">+23.33 Rating</div>');
    $('#Player2').append('<div class="offline">Offline</div>');
}

Game.init();
