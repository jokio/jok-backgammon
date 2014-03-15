/// <reference path="jokplay.ts" />

class GamePlayer extends JP.GamePlayerBase {

    public IsReversed;

    public KilledStonsCount;

    public StonesOut;

    public WinsCount;

    public ConnectionIDs;


    constructor(public UserID: number, public IPAddress: string, public IsVIP: boolean, public IsOnline: boolean) {
        super(UserID, IPAddress, IsVIP, IsOnline);
    }

    public hasKilledStones() {
        return this.KilledStonsCount > 0;
    }

    public init() {
        this.StonesOut = 0;
        this.IsReversed = false;
        this.KilledStonsCount = 0;
    }
}