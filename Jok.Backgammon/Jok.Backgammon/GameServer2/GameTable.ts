/// <reference path="jokplay.ts" />
/// <reference path="models/stonescollection.ts" />
/// <reference path="models/commands.ts" />
/// <reference path="models/dicestate.ts" />
/// <reference path="gameplayer.ts" />

class GameTable extends JP.GameTableBase<GamePlayer> {

    public Stones: StonesCollection[];

    public LastWinnerPlayer: GamePlayer;

    public PendingDices: DiceState[];

    public LastMovedStoneIndexes: any[];



    constructor(private GamePlayerClass, public Channel = '', public Mode = 0, public MaxPlayersCount = 2, public IsVIPTable = false) {

        super(GamePlayerClass, Channel, Mode, MaxPlayersCount, IsVIPTable);

        this.Stones = [];
        this.Players = [];

        this.PendingDices = [];

        for (var i = 0; i < 32; i++) {
            this.Stones.push(new StonesCollection());
        }
    }


    // overrides
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

        //this.Stones[0].UserID = opponent.UserID;
        //this.Stones[0].Count = 7;

        //this.Stones[31].UserID = this.ActivePlayer.UserID;
        //this.Stones[31].Count = 7;


        this.send('TableState', this);

        this.rolling();
    }

    public finish() {
        this.LastWinnerPlayer = this.ActivePlayer;
        var loser = this.getNextPlayer();

        this.LastWinnerPlayer.WinsCount++;

        this.Status = JP.TableStatus.Finished;

        this.send('TableState', this);
    }

    public playersChanged() {
        this.send('TableState', this);
    }



    // commands
    public onMove(userid: number, index: number, moves: number[]) {
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

        this.next();
    }

    public onMoveOut(userid: number, index: number) {
        var player = this.Players.filter(p=> p.UserID == userid)[0];
        if (!player) return;

        if (player != this.ActivePlayer) return;

        if (index < 0 || index > 31) return;

        if (!this.hasEveryStonesInside(player)) return;

        var group = this.Stones[index];
        if (group.UserID != player.UserID || group.Count <= 0) return;

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

        group.Count--;
        player.StonesOut++;

        usedDice.Count--;

        this.next();
    }

    public onPlayAgain(userid: number) {
        var player = this.Players.filter(p=> p.UserID == userid)[0];
        if (!player) return;

        if (this.Status != JP.TableStatus.Finished) return;

        if (this.Players.length != 2) return;

        this.start();
    }



    // helper
    next() {
        this.send('TableState', this);
        this.send('RollingResult', this.PendingDices, this.ActivePlayer.UserID, false);


        // ხომ არ მორჩა?
        if (this.Stones.filter(s=> s.UserID == this.ActivePlayer.UserID && s.Count > 0).length == 0) {
            this.finish();
            return;
        }

        if (this.PendingDices.filter(d => d.Count > 0).length > 0 && (this.hasAnyMoves() || this.hasEveryStonesInside(this.ActivePlayer))) {
            this.ActivePlayer.send('MoveRequest');
            return;
        }

        this.ActivePlayer = this.getNextPlayer();
        this.rolling();
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

        this.send('RollingResult', this.PendingDices, this.ActivePlayer.UserID, true);
        this.ActivePlayer.send('MoveRequest');
    }

    hasAnyMoves() {
        if (!this.ActivePlayer) return false;

        return this.Stones.filter(s => s.UserID == this.ActivePlayer.UserID && s.Count > 0).some(s => this.checkMoves(this.ActivePlayer, s));
    }

    checkMoves(player: GamePlayer, stoneCollection: StonesCollection): boolean {
        var index = this.Stones.indexOf(stoneCollection);

        if (index < 0 || index > 31 || this.Stones.length != 32 || index == -1) return false;


        return this.PendingDices.filter(d => d.Count > 0).some(dice => {
            if (player.hasKilledStones()) {
                var resurectMove = player.IsReversed ? 32 - dice.Number : dice.Number - 1;

                return (this.Stones[resurectMove].UserID == player.UserID || this.Stones[resurectMove].Count <= 1);
            }


            var nextMove = index + (player.IsReversed ? -1 : 1) * dice.Number;
            if (nextMove < 0 || nextMove > 31) return false;

            return (this.Stones[nextMove].UserID == player.UserID) || (this.Stones[nextMove].Count <= 1);
        });
    }

    hasEveryStonesInside(player: GamePlayer) {
        if (player.hasKilledStones())
            return false;

        return this.Stones.filter(s => s.UserID == player.UserID).every(s => {
            var index = this.Stones.indexOf(s);

            return (!player.IsReversed ? (index > 23) : (index < 8)) || (s.Count == 0);
        });
    }

    getNextPlayer(player?: GamePlayer): GamePlayer {

        if (this.Players.length <= 1) return;

        if (!player)
            player = this.ActivePlayer;

        if (!player) return;


        var index = this.Players.indexOf(player);

        return this.Players[index < this.Players.length - 1 ? ++index : 0];
    }
}


