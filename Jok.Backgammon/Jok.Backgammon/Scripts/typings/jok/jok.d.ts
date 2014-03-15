
declare module JP {

    export class GameTableBase<TGamePlayer> {

        ActivePlayer: TGamePlayer;

        Players: TGamePlayer[];

        Status: number;


        constructor(GamePlayerClass, Channel?: string, Mode?: number, MaxPlayersCount?: number, IsVIPTable?: boolean);


        join(user, ipaddress: string, channel: string, mode?: number);

        leave(userid: number);


        isStarted(): boolean;

        isFinished(): boolean;


        send(command: string, ...params: any[]);
    }

    export class GamePlayerBase {
        
        constructor(UserID: number, IPAddress: string, IsVIP: boolean, IsOnline: boolean);

        send(command: string, ...params: any[]);
    }

    export class Helper {

        static IO;

        static pluginHttp;
        static pluginSendgrid;


        static SendMail(to: string, subject: string, body: string);

        static HttpGet(url: string, cb, parseJson?: boolean);

        static ChannelSockets(channel: string): any[];
    }

    export class Server {

        findTable(user, channel: string, mode: number): GameTable;

        createTable(user, channel, mode): GameTable;

        static Start<TGamePlayer extends GamePlayerBase, TGameTable extends GameTableBase<TGamePlayer>>(port?, TGameTable?, TGamePlayer?): Server;
    }

    export enum TableStatus {
        New,
        Started,
        StartedWaiting,
        Finished
    }
}


interface Array {
    unique(): any[];
    contains(v): boolean;
    remove(item: any): boolean;
}