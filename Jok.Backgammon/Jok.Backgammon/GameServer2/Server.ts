/// <reference path="jokplay.ts" />
/// <reference path="models/stonescollection.ts" />
/// <reference path="gameplayer.ts" />
/// <reference path="gametable.ts" />

JP.Server.Start<GamePlayer, GameTable>(process.env.PORT || 9003, GameTable, GamePlayer);

