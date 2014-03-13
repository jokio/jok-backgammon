


var Game = {

    state: [],

    dices: [],

    gameService: undefined,

    isMoveAllowed: false,

    currentPlayerHasKilledStones: undefined,



    init: function () {
        //$(document).on('click', '#Board .dices', function () {

        //    var dice1 = Math.floor((Math.random() * 8) + 1);
        //    var dice2 = Math.floor((Math.random() * 8) + 1);
        //    var dice3 = Math.floor((Math.random() * 8) + 1);

        //    Game.setDices([dice1, dice2, dice3], 1);
        //});



        var proxy = new GameHub('GameHub', jok.config.sid, jok.config.channel); //connection.createHubProxy('PoolHub');

        proxy.on('Online', this.onOnline.bind(this));
        proxy.on('Offline', this.onOffline.bind(this));
        proxy.on('Close', this.onClose.bind(this));
        proxy.on('UserAuthenticated', this.onUserAuthenticated.bind(this));
        proxy.on('TableState', this.onTableState.bind(this));
        proxy.on('RollingResult', this.onRollingResult.bind(this));
        proxy.on('MoveRequest', this.onMoveRequest.bind(this));

        proxy.start();

        this.gameService = proxy;


        $(document).on('click', '#Board .stone_collection', this.UIStoneMove);
        $(document).on('click', '#Board .move_outside', this.UIStoneMoveOut);
        $(document).on('click', '.play_again', Game.UIPlayAgain);
        $(document).on('click', '.new_game', Game.UINewGame);
    },



    // UI Events --------------------------------------------------
    UIStoneMove: function () {
        var colid = $(this).attr('data-id');
        var fromColID = $(this).attr('data-from-id');

        Game.stoneMove(colid, fromColID);
    },

    UIStoneMoveOut: function () {
        var fromColID = $(this).attr('data-from-id');

        Game.stoneMoveOut(fromColID);
    },

    UIPlayAgain:function(){
        Game.gameService.send('PlayAgain');
    },

    UINewGame: function() {
        document.location.reload();
    },



    // Server Callbacks -------------------------------------------
    onOnline: function () {

    },

    onOffline: function () {

    },

    onClose: function () {

    },

    onUserAuthenticated: function (userid) {
        jok.currentUserID = userid;
    },

    onTableState: function (table) {

        switch (table.Status) {
            case 0: {
                jok.setPlayer(1, table.Players[0].UserID);

                $('#Notification .item').hide();
                $('#Notification .item.waiting_opponent').show();

                this.setState(table.Stones);
                break;
            }

            case 1: {
                $('#Notification .item').hide();

                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                jok.setPlayer(1, jok.currentUserID);
                jok.setPlayer(2, opponentPlayer.UserID);

                this.setState(table.Stones, currentPlayer.IsReversed, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount);
                break;
            }

            case 2: {
                $('#Notification .item').hide();
                $('#Notification .item.table_leave_winner').show();

                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                jok.setPlayer(1, jok.currentUserID);
                jok.setPlayer(2, null);

                this.isMoveAllowed = false;

                this.setState(table.Stones, table.Players[1].UserID == jok.currentUserID, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount);
                break;
            }

            case 3: {
                var currentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[0] : table.Players[1];
                var opponentPlayer = table.Players[0].UserID == jok.currentUserID ? table.Players[1] : table.Players[0];

                $('#Notification .item').hide();
                $('#Notification .item.table_finish_winner span').html(jok.players[table.LastWinnerPlayer.UserID].nick);
                $('#Notification .item.table_finish_winner').show();

                this.setState(table.Stones, table.Players[1].UserID == jok.currentUserID, currentPlayer.KilledStonsCount, opponentPlayer.KilledStonsCount);

                if (currentPlayer && opponentPlayer && (currentPlayer.WinsCount > 0 || opponentPlayer.WinsCount > 0)) {
                    $('#Player1').find('.wins').html(currentPlayer.WinsCount);
                    $('#Player2').find('.wins').html(opponentPlayer.WinsCount);
                }

                break;
            }
        }
    },

    onRollingResult: function (moves, displayMoves, activeUserID) {

        this.dices = moves;

        this.setDices(displayMoves, activeUserID);
    },

    onMoveRequest: function () {

        this.isMoveAllowed = true;

        $('#Board .triangle').addClass('allowed');
        $('#Board .triangle_rotated').addClass('allowed');

        if (this.currentPlayerHasKilledStones)
            this.allPossibleMoves();


        //$('#Board .stone.opponent').css('opacity', 0.7);
    },



    // Methods ----------------------------------------------------
    setState: function (state, reverseNumbers, playerKilledStones, opponentKilledStones) {

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
            _this.setStonesCollection(i, item.Count, item.UserID == jok.currentUserID)
        });

        $('#Board .player_killed_stones').hide();
        $('#Board .opponent_killed_stones').hide();

        if (playerKilledStones) {
            $('#Board .player_killed_stones').show();
            $('#Board .player_killed_stones .stone').html(playerKilledStones == 1 ? '' : playerKilledStones);
        }

        if (opponentKilledStones) {
            $('#Board .opponent_killed_stones').show();
            $('#Board .opponent_killed_stones .stone').html(opponentKilledStones == 1 ? '' : opponentKilledStones);
        }

        this.currentPlayerHasKilledStones = playerKilledStones > 0;
    },

    setDices: function (dices, userid) {

        dices.sort(function (a, b) {
            return b - a;
        });

        $('#Board .dices').hide();

        $('#Board .dices .dice').removeClass('disabled');

        var container = $('#Board .dices.' + (jok.currentUserID == userid ? 'current' : 'opponent'));
        $('#Board .dices .dice').html('');
        container.show();
        container.effect("shake", function () {
            for (var i = 0; i < dices.length; i++) {
                var item = $('#Board .dices .dice' + (i + 1));
                item.attr('data-dice', dices[i]);
                item.html(dices[i]);
            }
        });

        $('#RollingAudio')[0].play();

        this.clearStoneHighlights();
    },

    stoneMove: function (index, fromIndex) {

        if (!this.isMoveAllowed) return;

        index = parseInt(index);
        if (fromIndex)
            fromIndex = parseInt(fromIndex);

        $('#Board .move_outside').removeAttr('data-from-id');
        $('#Board .move_outside').hide();


        if (!fromIndex && fromIndex != 0 && !this.currentPlayerHasKilledStones) {
            this.allPossibleMoves(index);

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
                }
            }
        }
        else {
            if (this.state[index].dices)
                this.makeMove(index, fromIndex, this.state[index].dices);

            $('#Board .move_outside').removeAttr('data-from-id');
            $('#Board .move_outside').hide();
        }
    },

    stoneMoveOut: function (index) {
        this.gameService.send('MoveOut', this.state[index].OriginalIndex);

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

        this.gameService.send('Move', this.currentPlayerHasKilledStones ? 0 : this.state[fromIndex].OriginalIndex, dices);

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

    setStonesCollection: function (index, count, isPlayerStones) {
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

        this.getAllDiceMoves(this.dices, col).forEach(function (item) {

            var index = col + item;

            // თუ გასაცოცხლებელია რამე, კარებში ვსვავთ
            if (_this.currentPlayerHasKilledStones) {
                index = item - 1;
            }

            if (_this.checkMove(index))
                _this.setStoneHighlight(index, col);
        });
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
};

Game.init();
