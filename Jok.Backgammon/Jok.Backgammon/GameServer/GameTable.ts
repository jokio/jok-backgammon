/// <reference path="jokplay.ts" />
/// <reference path="models/stonescollection.ts" />
/// <reference path="models/dicestate.ts" />
/// <reference path="gameplayer.ts" />


class Commands {
    public static ActivatePlayer = 'ActivatePlayer';
    public static TableState = 'TableState';
    public static RollingResult = 'RollingResult';
    public static MoveRequest = 'MoveRequest';
    public static FinishResults = 'FinishResults';
}

class GameTable extends JP.GameTableBase<GamePlayer> {

    public static PLAY_RESERVED_TIME_INTERVAL = 20 * 1000;

    public static PLAY_FOR_ROLL_TIME = 20 * 1000;

    public static PLAY_FOR_ROLL_TIME_OFFLINE = 3 * 1000;


    public ID: string;

    public Stones: StonesCollection[];

    public LastWinnerPlayer: GamePlayer;

    public PendingDices: DiceState[];

    public LastMovedStoneIndexes: any[];

    private MoveWaitingTimeout = undefined;



    constructor(private GamePlayerClass, public Channel = '', public Mode = 0, public MaxPlayersCount = 2, public IsVIPTable = false) {

        super(GamePlayerClass, Channel, Mode, MaxPlayersCount, IsVIPTable);

        this.Stones = [];
        this.Players = [];

        this.PendingDices = [];

        for (var i = 0; i < 32; i++) {
            this.Stones.push(new StonesCollection());
        }

        this.ID = require('node-uuid').v4();
    }



    // overrides
    public join(user, ipaddress: string, channel: string, mode?: number) {

        super.join(user, ipaddress, channel, mode);

        var player = this.Players.filter(p => p.UserID == user.UserID)[0];
        if (!player) return;

        if (this.Status == JP.TableStatus.Started) {

            player.send(Commands.RollingResult, this.PendingDices, this.ActivePlayer.UserID, true);
            player.send(Commands.ActivatePlayer, this.ActivePlayer.UserID);

            this.ActivePlayer.send(Commands.MoveRequest);
        }
    }

    public leave(userid: number) {

        super.leave(userid);

        // თუ ყველა გავიდა Timer-ი გასათიშია თორემ აგრძელებს თამაშს კომპიუტერი
        if (this.Players.filter(p => p.IsOnline).length == 0) {

            clearTimeout(this.MoveWaitingTimeout);
            this.Players.splice(0, this.Players.length);
            return;
        }

        this.ActivePlayer.send(Commands.MoveRequest);
    }

    public start() {
        if (this.Players.length != 2) return;

        this.Status = JP.TableStatus.Started;

        this.Stones.forEach(s => new StonesCollection());
        this.Players.forEach(p => p.init());

        this.ActivePlayer = this.Players[0];
        var opponent = this.getNextPlayer();
        opponent.IsReversed = true;

        this.Stones.forEach(s => {
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



        //for (var i = 0; i < 8; i++) {
        //    this.Stones[i].UserID = opponent.UserID;
        //    this.Stones[i].Count = 2;
        //}

        //this.Stones[1].UserID = opponent.UserID;
        //this.Stones[1].Count = 7;


        //this.Stones[30].UserID = this.ActivePlayer.UserID;
        //this.Stones[30].Count = 7;


        this.MoveWaitingTimeout = undefined;


        this.send(Commands.TableState, this.getState());
        this.send(Commands.ActivatePlayer, this.ActivePlayer.UserID, GameTable.PLAY_FOR_ROLL_TIME, GameTable.PLAY_RESERVED_TIME_INTERVAL);

        this.rolling();
    }

    public finish() {
        this.LastWinnerPlayer = this.ActivePlayer;
        var loser = this.getNextPlayer();

        this.LastWinnerPlayer.WinsCount++;

        this.Status = JP.TableStatus.Finished;

        this.send(Commands.TableState, this.getState());


        var finishObj = {
            GameID: process.env.JOK_GAME_ID,
            GameSecret: process.env.JOK_GAME_SECRET,
            Channel: this.Channel,
            Players: [
                {
                    UserID: this.LastWinnerPlayer.UserID,
                    IPAddress: this.LastWinnerPlayer.IPAddress,
                    Points: this.LastWinnerPlayer.StonesOut * 10,
                    IsOnline: this.ActivePlayer.IsOnline,
                    Place: 1
                },
                {
                    UserID: loser.UserID,
                    IPAddress: loser.IPAddress,
                    Points: loser.StonesOut * 10,
                    IsOnline: loser.IsOnline,
                    Place: 2
                },
            ],
        };

        JP.Helper.FinishGame(finishObj, (err, result) => {

            if (err) return;

            this.send(Commands.FinishResults, result);
        });
    }

    public playersChanged() {
        this.send(Commands.TableState, this.getState());
    }


    // commands
    public onMove(userid: number, index: number, moves: number[], isBot = false) {

        var player = this.Players.filter(p=> p.UserID == userid)[0];
        if (!player) return;

        if (player != this.ActivePlayer) return;

        if (index < 0 || index > 31) return;


        var from = index;
        var newPosition;

        var opponent = this.getNextPlayer();

        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];

            var usedDice = this.PendingDices.filter(d => d.Number == move && d.Count > 0)[0];


            //#region Checks
            if (!player.hasKilledStones()) {
                newPosition = from + (player.IsReversed ? -1 : 1) * move;

                if (!usedDice) continue;

                if (this.Stones.length <= newPosition) continue;

                var group = this.Stones[from];
                if (group.UserID != player.UserID || group.Count == 0) continue;

            }
            else {
                newPosition = player.IsReversed ? 32 - move : move - 1;
            }

            var newGroup = this.Stones[newPosition];
            if (newGroup.UserID != player.UserID && newGroup.Count > 1) continue;

            //#endregion

            if (!isBot)
                this.ActivePlayer.BotPlayCount = 0;


            if (player.hasKilledStones())
                player.KilledStonsCount--;
            else
                this.Stones[from].Count--;


            if (newGroup.UserID != player.UserID && newGroup.Count == 1) {
                newGroup.UserID = player.UserID;
                newGroup.Count = 1;

                // ქვის მოკვლა
                opponent.KilledStonsCount++;
            }
            else {
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
    }

    public onMoveOut(userid: number, index: number, isBot = false) {
        var player = this.Players.filter(p=> p.UserID == userid)[0];
        if (!player) return;

        if (player != this.ActivePlayer) return;

        if (index < 0 || index > 31) return;

        if (!this.hasEveryStonesInside(player)) return;

        var group = this.Stones[index];
        if (group.UserID != player.UserID || group.Count <= 0) return;


        this.LastMovedStoneIndexes = [{
            UserID: -1,
            Index: -1
        }];


        var usedDice = this.checkMoveOut(player, index);
        if (!usedDice) return;

        if (!isBot)
            this.ActivePlayer.BotPlayCount = 0;

        group.Count--;
        player.StonesOut++;

        usedDice.Count--;

        this.next();
    }

    public onPlayAgain(userid: number) {
        var player = this.Players.filter(p => p.UserID == userid)[0];
        if (!player) return;

        if (this.Status != JP.TableStatus.Finished) return;

        if (this.Players.filter(p => p.IsOnline).length != 2) return;

        this.start();
    }



    // helper
    next() {

        this.send(Commands.TableState, this.getState());
        this.send(Commands.RollingResult, this.PendingDices, this.ActivePlayer.UserID, false);


        // ხომ არ მორჩა?
        if (this.Stones.filter(s => s.UserID == this.ActivePlayer.UserID && s.Count > 0).length == 0) {
            this.finish();
            return;
        }

        var moveOutStones = this.Stones.filter((s, i) => (s.UserID == this.ActivePlayer.UserID) && (s.Count > 0) && this.checkMoveOut(this.ActivePlayer, i) != undefined);

        if (this.PendingDices.filter(d => d.Count > 0).length > 0 && (this.hasAnyMoves() || (this.hasEveryStonesInside(this.ActivePlayer) && moveOutStones.length))) {
            this.ActivePlayer.send(Commands.MoveRequest);
            return;
        }

        clearTimeout(this.MoveWaitingTimeout);
        this.ActivePlayer.removeReserveTime();

        this.ActivePlayer = this.getNextPlayer();
        this.rolling();

        return true;
    }

    rolling() {
        var rand = (max) => {
            return Math.floor((Math.random() * (max)) + 1);
        };


        var moves: number[] = [];

        do {
            moves = [];

            for (var i = 0; i < 3; i++) {
                var move = rand(8);

                moves.push(move);
            }
        }
        while ((moves.filter(m => m == 6).length == 3) && rand(1000000) != 6);

        this.PendingDices = [];
        moves.forEach(m => this.PendingDices.push(new DiceState(m, 1)));


        // ერთნაირი ქვების დაჯგუფება, რათა გავიგოთ წყვილი ხომ არ გაგორდა
        var grouped = moves.unique();

        // თუ სამივე ერთნაირი დაჯდა, ემატება კიდევ 3 იგივე სვლა
        if (grouped.length == 1) {

            this.PendingDices.forEach(d => d.Count = 2);
        }

        // თუ ორი დაჯდა ერთნაირი, ემატება კიდევ 1 იგივე სვლა
        if (grouped.length == 2) {
            var dice: DiceState = this.PendingDices[2];
            if (this.PendingDices[0].Number == this.PendingDices[1].Number)
                dice = this.PendingDices[1];

            dice.Count = 2;
        }

        
        var firstInterval = this.ActivePlayer.IsOnline ? GameTable.PLAY_FOR_ROLL_TIME : GameTable.PLAY_FOR_ROLL_TIME_OFFLINE;

        if (this.ActivePlayer.BotPlayCount > 1)
            firstInterval /= 2;

        // თავიდან აქვს 5 წამი სათამაშოდ, ხოლო შემდეგ რეზერვირებული დროდან 20 წამი.
        clearTimeout(this.MoveWaitingTimeout);
        this.MoveWaitingTimeout = setTimeout(() => {

            var interval = GameTable.PLAY_RESERVED_TIME_INTERVAL;
            if (interval > this.ActivePlayer.ReservedTime)
                interval = this.ActivePlayer.ReservedTime;

            if (!this.ActivePlayer.IsOnline)
                interval = 0;

            if (this.ActivePlayer.BotPlayCount > 0)
                interval = 0;


            this.ActivePlayer.WaitingStartTime = Date.now();
            clearTimeout(this.MoveWaitingTimeout);
            this.MoveWaitingTimeout = setTimeout(this.makeBotMove.bind(this), interval);

        }, firstInterval);



        this.send(Commands.ActivatePlayer,
            this.ActivePlayer.UserID,
            firstInterval,
            this.ActivePlayer.IsOnline ? GameTable.PLAY_RESERVED_TIME_INTERVAL : 0);

        this.send(Commands.RollingResult, this.PendingDices, this.ActivePlayer.UserID, true);
        this.ActivePlayer.send(Commands.MoveRequest);


        if (!this.hasAnyMoves()) {
            setTimeout(this.next.bind(this), 2000);
        }
    }

    hasAnyMoves() {
        if (!this.ActivePlayer) return false;

        return this.Stones
            .filter(s => s.UserID == this.ActivePlayer.UserID && s.Count > 0)
            .some(s => this.checkMoves(this.ActivePlayer, s));
    }

    makeBotMove() {

        this.ActivePlayer.removeReserveTime();
        this.ActivePlayer.BotPlayCount++;

        // თუ მოკლულია რამე ჯერ ვაცოცხლებთ მათ
        if (this.ActivePlayer.KilledStonsCount > 0) {
            this.PendingDices.forEach(dice => {

                var length = dice.Count;
                for (var j = 0; j < length; j++) {

                    if (this.ActivePlayer.KilledStonsCount > 0) {
                        var filteredStones = this.Stones.filter((s, i) => (s.UserID == this.ActivePlayer.UserID) && (s.Count > 0) && this.checkOneMove(this.ActivePlayer, dice, i) > -1);
                        var fromStone = filteredStones[!this.ActivePlayer.IsReversed ? filteredStones.length - 1 : 0];
                        var index = this.Stones.indexOf(fromStone);

                        if (index > -1) {
                            this.onMove(this.ActivePlayer.UserID, index, [dice.Number], true);
                        }
                    }
                }
            });
        }

        if (this.ActivePlayer.KilledStonsCount > 0) return;


        for (var k = 0; k < 4; k++) { // იმიტო ვატრიალებთ რომ შეიძლება მანამდე არ შეიძლებოდა გამოსვლა და შემდეგ გაეხსნა შესაძლებლობა

            var isFinished;

            // თუ რაიმე გადასვლა შეიძლება რომ გაკეთდეს
            this.PendingDices.forEach(dice => {

                if (!isFinished) {
                    var length = dice.Count;
                    for (var j = 0; j < length; j++) {

                        var filteredStones = this.Stones.filter((s, i) => (s.UserID == this.ActivePlayer.UserID) && (s.Count > 0) && this.checkOneMove(this.ActivePlayer, dice, i) > -1);
                        var fromStone = filteredStones[!this.ActivePlayer.IsReversed ? filteredStones.length - 1 : 0];
                        var index = this.Stones.indexOf(fromStone);

                        if (index > -1) {
                            isFinished = this.onMove(this.ActivePlayer.UserID, index, [dice.Number], true);
                        }
                    }
                }
            });

            if (isFinished) {
                break;
            }
        }

        // თუ გამოსასვლელია რამე
        if (this.PendingDices.length && this.hasEveryStonesInside(this.ActivePlayer)) {

            var length = 0;
            this.PendingDices.forEach(d => length += d.Count);

            for (var j = 0; j < length; j++) {

                var filteredStones = this.Stones.filter((s, i) => (s.UserID == this.ActivePlayer.UserID) && (s.Count > 0) && this.checkMoveOut(this.ActivePlayer, i) != undefined);
                var fromStone = filteredStones[!this.ActivePlayer.IsReversed ? filteredStones.length - 1 : 0];
                var index = this.Stones.indexOf(fromStone);

                if (index > -1)
                    this.onMoveOut(this.ActivePlayer.UserID, index, true);
            }
        }
    }

    checkMoves(player: GamePlayer, stoneCollection: StonesCollection): boolean {
        var index = this.Stones.indexOf(stoneCollection);

        if (index < 0 || index > 31 || this.Stones.length != 32 || index == -1) return false;


        return this.PendingDices.filter(d => d.Count > 0).some(dice => this.checkOneMove(player, dice, index) > -1);
    }

    checkOneMove(player: GamePlayer, dice: DiceState, index: number): number {
        if (player.hasKilledStones()) {
            var resurectMove = player.IsReversed ? 32 - dice.Number : dice.Number - 1;

            return (this.Stones[resurectMove].UserID == player.UserID || this.Stones[resurectMove].Count <= 1) ? resurectMove : -1;
        }


        var nextMove = index + (player.IsReversed ? -1 : 1) * dice.Number;
        if (nextMove < 0 || nextMove > 31) return -1;

        if ((this.Stones[nextMove].UserID == player.UserID) || (this.Stones[nextMove].Count <= 1))
            return nextMove;

        return -1;
    }

    checkMoveOut(player: GamePlayer, index): DiceState {


        var filtered = this.Stones.filter(s => s.UserID == player.UserID && s.Count > 0);

        var maxLeftStone = filtered[player.IsReversed ? filtered.length - 1 : 0];


        var move = (!player.IsReversed ? 31 - index : index) + 1;



        // თავდაპირველად ვიღებთ გამოსული ქვის შესაბამის კამათელს
        var usedDice = this.PendingDices.filter(d => d.Number == move && d.Count > 0)[0];

        // თუ ასეთი კამათელი არ მოიძებნა, მაშინ უკვე ვიღებთ უფრო დიდ კამათელს (შეიძლება რაც გააგორა იმაზე აღარ ქონდა და შემდეგ ქვას გამოვიდას შემთხვევაა ეს)
        if (!usedDice) {
            usedDice = this.PendingDices.filter(m => (m.Number > move) && (m.Count > 0))[0];
            var isMaxLeftStone = true;
        }

        // თუ კამათელი ვერ მოიძებნა
        if (!usedDice) return;


        // შემოწმება გამოსული ქვის მარცხნივ ხომ არ ქონდა რაიმე ქვას და ისე ხომ არ გამოდის 
        var maxLeftStoneIndex = this.Stones.indexOf(maxLeftStone);
        if (isMaxLeftStone && maxLeftStoneIndex != index) return;

        return usedDice;
    }

    hasEveryStonesInside(player: GamePlayer) {
        if (player.hasKilledStones())
            return false;

        return this.Stones.filter(s => s.UserID == player.UserID).every(s => {
            var index = this.Stones.indexOf(s);

            return (!player.IsReversed ? (index > 23) : (index < 8)) || (s.Count == 0);
        });
    }

    getState() {
        return {
            ID: this.ID,
            Status: this.Status,
            Players: this.Players,
            ActivePlayer: this.ActivePlayer,
            Stones: this.Stones,
            LastWinnerPlayer: this.LastWinnerPlayer,
            PendingDices: this.PendingDices,
            Channel: this.Channel,
            Mode: this.Mode,
            IsVIPTable: this.IsVIPTable,
        }
    }
}


