using Jok.Backgammon.GameServer.Models;
using Jok.GameEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Web;

namespace Jok.Backgammon.GameServer
{
    public class GameTable : GameTableBase<GamePlayer>
    {
        #region Properties
        public override bool IsStarted
        {
            get { return Status == TableStatus.Started; }
        }

        public override bool IsFinished
        {
            get { return Status == TableStatus.Finished; }
        }

        [DataMember]
        public TableStatus Status { get; set; }

        [DataMember]
        public List<StonesCollection> Stones { get; set; }

        [IgnoreDataMember]
        public List<int> PendingMoves { get; set; }
        #endregion


        public GameTable()
        {
            Stones = new List<StonesCollection>();

            for (int i = 0; i < 32; i++)
            {
                Stones.Add(new StonesCollection { Index = i + 1 });
            }
        }


        public void Move(int userid, int index, int[] moves)
        {
            var player = GetPlayer(userid);
            if (player == null) return;

            if (player != ActivePlayer) return;

            if (index < 0 || index > 31) return;


            lock (SyncObject)
            {
                OnMove(player, index, moves);
            }
        }


        protected override void OnJoin(GamePlayer player, object state)
        {
            switch (Status)
            {
                case TableStatus.New:
                    if (!Players.Contains(player))
                        AddPlayer(player);

                    if (Players.Count == 2)
                        OnStart();
                    else
                        GameCallback.TableState(player, this);

                    break;

                case TableStatus.Started:
                    GameCallback.TableState(Table, this);
                    break;


                case TableStatus.StartedWaiting:
                    if (!Players.Contains(player))
                        return;

                    Status = TableStatus.Started;
                    GameCallback.TableState(Table, this);

                    break;
            }
        }

        protected override void OnLeave(GamePlayer player)
        {
            switch (Status)
            {
                case TableStatus.New:
                    RemovePlayer(player);
                    break;


                case TableStatus.Started:
                    Status = TableStatus.StartedWaiting;
                    GameCallback.TableState(this, this);
                    break;


                case TableStatus.StartedWaiting:
                    break;


                case TableStatus.Finished:
                    RemovePlayer(player);
                    break;
            }
        }

        protected void OnStart()
        {
            if (Players.Count != 2) return;

            Status = TableStatus.Started;
            Stones = new List<StonesCollection>();


            ActivePlayer = Players.First();
            var opponent = GetNextPlayer();

            Stones[0].UserID = ActivePlayer.UserID;
            Stones[0].Count = 3;

            Stones[7].UserID = opponent.UserID;
            Stones[7].Count = 7;

            Stones[9].UserID = opponent.UserID;
            Stones[9].Count = 5;

            Stones[15].UserID = ActivePlayer.UserID;
            Stones[15].Count = 5;

            Stones[16].UserID = opponent.UserID;
            Stones[16].Count = 5;

            Stones[22].UserID = ActivePlayer.UserID;
            Stones[22].Count = 5;

            Stones[24].UserID = ActivePlayer.UserID;
            Stones[24].Count = 7;

            Stones[31].UserID = opponent.UserID;
            Stones[31].Count = 3;

            GameCallback.TableState(Table, this);

            Rolling();
        }

        protected void OnMove(GamePlayer player, int index, int[] moves)
        {
            foreach (var move in moves)
            {
                if (!PendingMoves.Contains(move)) continue;

                var group = Stones[index];
                if (group.UserID != player.UserID || group.Count == 0) continue;



                PendingMoves.Remove(move);
            }

            GameCallback.TableState(Table, this);


            if (PendingMoves.Count > 0) return;

            ActivePlayer = GetNextPlayer();

            Rolling();
        }


        void Rolling()
        {
            var rand = new Random(Guid.NewGuid().ToByteArray().Sum(s => s));

            var moves = new List<int>();
            var displayMoves = new List<int>();
            for (int i = 0; i < 3; i++)
            {
                var move = rand.Next(1, 8);

                moves.Add(move);
                displayMoves.Add(move);
            }

            // ერთნაირი ქვების დაჯგუფება, რათა გავიგოთ წყვილი ხომ არ გაგორდა
            var grouped = displayMoves.ToLookup(m => m);

            // თუ სამივე ერთნაირი დაჯდა, ემატება კიდევ 3 იგივე სვლა
            if (grouped.Count == 1)
            {
                var move = grouped[0].First();

                moves.Add(move);
                moves.Add(move);
                moves.Add(move);
            }

            // თუ ორი დაჯდა ერთნაირი, ემატება კიდევ 1 იგივე სვლა
            if (grouped.Count == 2)
            {
                var move = grouped.First(g => g.Count() == 2).Key;

                moves.Add(move);
            }


            GameCallback.RollingResult(Table, moves.ToArray(), displayMoves.ToArray(), ActivePlayer.UserID);
        }
    }

    [DataContract]
    public class GamePlayer : IGamePlayer
    {
        [DataMember]
        public string IPAddress { get; set; }

        [DataMember]
        public bool IsVIP { get; set; }

        [DataMember]
        public bool IsOnline { get; set; }

        [DataMember]
        public int UserID { get; set; }

        [DataMember]
        public int KilledStons { set; get; }

        [IgnoreDataMember]
        public List<string> ConnectionIDs { get; set; }
    }
}