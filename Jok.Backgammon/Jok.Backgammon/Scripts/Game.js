


var Game = {

    state: [],

    dices: [],

    currentUserID: 1,

    gameService: undefined,


    init: function () {
        $(document).on('click', '#Board .dices', function () {

            var dice1 = Math.floor((Math.random() * 8) + 1);
            var dice2 = Math.floor((Math.random() * 8) + 1);
            var dice3 = Math.floor((Math.random() * 8) + 1);

            Game.setDices([dice1, dice2, dice3], 1);
        });

        $(document).on('click', '#Board .stone_collection', function () {

            var colid = $(this).attr('data-id');

            Game.allPossibleMoves(colid);
        });


        var proxy = new GameHub('GameHub', jok.config.sid, jok.config.channel); //connection.createHubProxy('PoolHub');

        proxy.on('Online', this.onOnline.bind(this));
        proxy.on('Offline', this.onOffline.bind(this));
        proxy.on('Close', this.onClose.bind(this));
        proxy.on('UserAuthenticated', this.onUserAuthenticated.bind(this));
        proxy.on('TableState', this.onTableState.bind(this));
        proxy.on('RollingResult', this.onRollingResult.bind(this));

        proxy.start();

        this.gameService = proxy;
    },



    // Server Callbacks -------------------------------------------
    onOnline: function () {

    },

    onOffline: function () {

    },

    onClose: function () {

    },

    onUserAuthenticated: function (userid) {
        this.currentUserID = userid;
    },

    onTableState: function (table) {

        switch (table.StatusID) {
            case 1: {
                this.setState(table.Stones);
                break;
            }

            case 2: {
                this.setState(table.Stones);
                break;
            }

            case 3: {
                this.setState(table.Stones);
                break;
            }
        }
    },

    onRollingResult: function (moves, displayMoves, activeUserID) {

    },



    // Methods ----------------------------------------------------
    setState: function (state, reverseNumbers) {

        // stuff
        state.forEach(function (item, i) {
            item.OriginalIndex = i + 1;
        });

        if (reverseNumbers) {
            state = state.reverse();
        }

        if (state.length == 32)
            state.unshift({}); // 0 - dummy


        // processing
        this.state = state;

        var _this = this;

        state.forEach(function (item, i) {
            _this.setStonesCollection(i, item.Count, item.UserID == _this.currentUserID)
        });
    },

    setDices: function (dices, userid) {
        this.dices = dices;

        $('#Board .dices').hide();

        var container = $('#Board .dices.' + (this.currentUserID == userid ? 'current' : 'opponent'));
        $('#Board .dices .dice').html('');
        container.show();
        container.effect("shake", function () {
            for (var i = 0; i < dices.length; i++) {
                $('#Board .dices .dice' + (i + 1)).html(dices[i]);
            }
        });

        $('#RollingAudio')[0].play();

        this.clearStoneHighlights();
    },



    // Helper -----------------------------------------------------
    setStonesCollection: function (index, count, isPlayerStones) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        container.find('.stone').remove();

        for (var i = 0; i < count; i++) {
            var item = $('<div class="stone">');
            if (!isPlayerStones)
                item.addClass('opponent');

            if (count > 7)
                item.addClass('near');

            container.append(item);
        }
    },

    setStoneHighlight: function (index) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        if (container.find('.highlight').length) return;

        var item = $('<div class="stone highlight">');

        if (container.parent().hasClass('items_bottom')) {
            container.prepend(item);
        } else {
            container.append(item);
        }
    },

    clearStoneHighlights: function () {
        $('#Board .stone.highlight').remove();
    },

    allPossibleMoves: function (col) {
        this.clearStoneHighlights();

        var stonesContainer = this.state[col];
        if (!stonesContainer || stonesContainer.UserID != this.currentUserID) return;

        var _this = this;

        this.getAllDiceMoves(this.dices, col).forEach(function (item) {

            var index = col - item;
            if (_this.isMoveAllowed(index))
                _this.setStoneHighlight(index);
        });
    },

    getAllDiceMoves: function (dices, col) {
        var results = [];

        var _this = this;
        var index;

        // სათითაოდ თითოეული კამათელი
        dices.forEach(function (item, i) {

            index = col - item;

            if (_this.isMoveAllowed(index)) {
                results.push(item);
                console.log(item);

                // კომბინირებული მეორე კამათელებთან
                dices.forEach(function (item2, i2) {

                    index = col - item - item2;

                    if (i != i2 && _this.isMoveAllowed(index)) {
                        results.push(item + item2);
                        console.log(item, item2);

                        // სამივე კამათელი შეკრებილი
                        dices.forEach(function (item3, i3) {

                            index = col - item - item2 - item3;

                            if (i != i3 && i2 != i3 && _this.isMoveAllowed(index)) {
                                results.push(item + item2 + item3);
                                console.log(item, item2, item3);
                            }
                        });
                    }
                });
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

    isMoveAllowed: function (index) {

        var collection = this.state[index];
        if (collection) {
            if (!collection.UserID ||
                (collection.UserID == this.currentUserID) ||
                (collection.UserID != this.currentUserID && collection.Count <= 1)) {
                return true;
            }
        }

        return false;
    },
};

var state = [
    { UserID: 1, Count: 3 },
    {},
    {},
    {},
    {},
    {},
    {},
    { UserID: 2, Count: 7 },
    {},
    { UserID: 2, Count: 5 },
    {},
    {},
    {},
    {},
    {},
    { UserID: 1, Count: 5 },
    { UserID: 2, Count: 5 },
    {},
    {},
    {},
    {},
    {},
    { UserID: 1, Count: 5 },
    {},
    { UserID: 1, Count: 7 },
    {},
    {},
    {},
    {},
    {},
    {},
    { UserID: 2, Count: 3 },
]

Game.init();
Game.setDices([2, 3, 4], true);

