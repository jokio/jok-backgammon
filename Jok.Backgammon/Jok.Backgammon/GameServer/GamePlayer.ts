/// <reference path="jokplay.ts" />

class GamePlayer extends JP.GamePlayerBase {

    public IsReversed;

    public KilledStonsCount;

    public StonesOut;

    public WinsCount;

    public ConnectionIDs;

    public ReservedTime;

    public WaitingStartTime;

    public BotPlayCount;


    constructor(public UserID: number, public IPAddress: string, public IsVIP: boolean, public IsOnline: boolean) {
        super(UserID, IPAddress, IsVIP, IsOnline);
    }

    public hasKilledStones() {
        return this.KilledStonsCount > 0;
    }

    public init() {
        this.StonesOut = 0;
        this.BotPlayCount = 0;
        this.IsReversed = false;
        this.KilledStonsCount = 0;
        this.WaitingStartTime = 0;
        this.ReservedTime = 3 * 60 * 1000; // 3 წუთი რეზერვი
        this.HasAnyMoveMade = true;
    }

    public removeReserveTime() {

        if (!this.WaitingStartTime) return;

        var time = Date.now() - this.WaitingStartTime;
        if (time < 0) return;

        this.ReservedTime -= time > 0 ? time : 0;
        this.WaitingStartTime = undefined;
    }
}