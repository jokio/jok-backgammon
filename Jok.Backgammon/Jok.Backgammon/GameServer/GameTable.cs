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

        [DataMember]
        public GamePlayer LastWinnerPlayer { get; set; }

        [IgnoreDataMember]
        public List<int> PendingMoves { get; set; }
        #endregion



        public GameTable()
        {
            Stones = new List<StonesCollection>();
            PendingMoves = new List<int>();

            for (int i = 0; i < 32; i++)
            {
                Stones.Add(new StonesCollection { });
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

        public void MoveOut(int userid, int index)
        {
            var player = GetPlayer(userid);
            if (player == null) return;

            if (player != ActivePlayer) return;

            if (index < 0 || index > 31) return;


            lock (SyncObject)
            {
                OnMoveOut(player, index);
            }
        }

        public void PlayAgain(int userid)
        {
            var player = GetPlayer(userid);
            if (player == null) return;


            lock (SyncObject)
            {
                OnPlayAgain(player);
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
                    {
                        Players.ForEach(p => p.WinsCount = 0);
                        OnStart();
                    }
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
            Stones.ForEach(s => new StonesCollection());

            Players.ForEach(p => p.Init());

            ActivePlayer = Players.First();
            var opponent = GetNextPlayer();
            opponent.IsReversed = true;

            Stones.ForEach(s =>
            {
                s.UserID = null;
                s.Count = 0;
            });

            Stones[0].UserID = ActivePlayer.UserID;
            Stones[0].Count = 3;

            Stones[7].UserID = opponent.UserID;
            Stones[7].Count = 2;

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
            int from = index;
            int newPosition;

            var opponent = GetNextPlayer();

            foreach (var move in moves)
            {
                #region Checks
                if (!player.HasKilledStones)
                {
                    newPosition = from + (player.IsReversed ? -1 : 1) * move;

                    if (!PendingMoves.Contains(move)) continue;

                    if (Stones.Count <= newPosition) continue;

                    var group = Stones[from];
                    if (group.UserID != player.UserID || group.Count == 0) continue;

                }
                else
                {
                    newPosition = player.IsReversed ? 32 - move : move - 1;
                }

                var newGroup = Stones[newPosition];
                if (newGroup.UserID != player.UserID && newGroup.Count > 1) continue;

                #endregion


                if (player.HasKilledStones)
                    player.KilledStonsCount--;
                else
                    Stones[from].Count--;


                if (newGroup.UserID != player.UserID && newGroup.Count == 1)
                {
                    newGroup.UserID = player.UserID;
                    newGroup.Count = 1;

                    // ქვის მოკვლა
                    opponent.KilledStonsCount++;
                }
                else
                {
                    newGroup.UserID = player.UserID;
                    newGroup.Count++;
                }

                PendingMoves.Remove(move);
                from = newPosition;
            }

            Next();
        }

        protected void OnMoveOut(GamePlayer player, int index)
        {
            if (!HasEveryStonesInside(player)) return;

            var group = Stones[index];
            if (group.UserID != player.UserID || group.Count <= 0) return;

            var maxLeftStone = !player.IsReversed ?
                Stones.Where(s => s.UserID == player.UserID && s.Count > 0).FirstOrDefault() :
                Stones.Where(s => s.UserID == player.UserID && s.Count > 0).LastOrDefault();


            var move = (!player.IsReversed ? 31 - index : index) + 1;
            if (!PendingMoves.Contains(move))
                move = PendingMoves.Where(m => m > move).FirstOrDefault();

            if (move == null) return;

            var maxLeftStoneIndex = Stones.IndexOf(maxLeftStone);
            var forceAllowMove = (maxLeftStoneIndex == index) && PendingMoves.Any(m => m > move);
            if (!PendingMoves.Contains(move) && !forceAllowMove) return;

            group.Count--;
            player.StonesOut++;

            PendingMoves.Remove(move);

            Next();
        }

        protected void OnFinish()
        {
            LastWinnerPlayer = ActivePlayer;
            var loser = GetNextPlayer();

            LastWinnerPlayer.WinsCount++;

            Status = TableStatus.Finished;
            GameCallback.TableState(Table, this);
        }

        protected void OnPlayAgain(GamePlayer player)
        {
            if (Status != TableStatus.Finished) return;

            if (Players.Count != 2) return;

            OnStart();
        }



        void Next()
        {
            GameCallback.TableState(Table, this);

            // ხომ არ მორჩა?
            if (Stones.Count(s=>s.UserID == ActivePlayer.UserID && s.Count > 0) == 0)
            {
                OnFinish();
                return;
            }

            if (PendingMoves.Count > 0 && (HasAnyMoves() || HasEveryStonesInside(ActivePlayer)))
            {
                GameCallback.MoveRequest(ActivePlayer);
                return;
            }

            ActivePlayer = GetNextPlayer();
            Rolling();
        }

        void Rolling()
        {
            var rand = new Random(Guid.NewGuid().ToByteArray().Sum(s => s));

            var moves = new List<int>();
            var displayMoves = new List<int>();

            do
            {
                moves.Clear();
                displayMoves.Clear();

                for (int i = 0; i < 3; i++)
                {
                    var move = rand.Next(1, 9);

                    moves.Add(move);
                    displayMoves.Add(move);
                }
            }
            while ((moves.Where(m => m == 6).Count() == 3) && rand.Next(0, Int32.MaxValue) != 6);


            // ერთნაირი ქვების დაჯგუფება, რათა გავიგოთ წყვილი ხომ არ გაგორდა
            var grouped = displayMoves.ToLookup(m => m);

            // თუ სამივე ერთნაირი დაჯდა, ემატება კიდევ 3 იგივე სვლა
            if (grouped.Count == 1)
            {
                var move = grouped.First().Key;

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

            PendingMoves.Clear();
            moves.ForEach(PendingMoves.Add);


            GameCallback.RollingResult(Table, moves.ToArray(), displayMoves.ToArray(), ActivePlayer.UserID);
            GameCallback.MoveRequest(ActivePlayer);
        }

        bool HasAnyMoves()
        {
            if (ActivePlayer == null) return false;

            return Stones.Where(s => s.UserID == ActivePlayer.UserID && s.Count > 0).Any(s => CheckMoves(ActivePlayer, s));
        }

        bool CheckMoves(GamePlayer player, StonesCollection stoneCollection)
        {
            var index = Stones.IndexOf(stoneCollection);

            if (index < 0 || index > 31 || Stones.Count != 32 || index == -1) return false;


            return PendingMoves.Any(move =>
            {
                if (player.HasKilledStones)
                {
                    var resurectMove = player.IsReversed ? 32 - move : move - 1;

                    return (Stones[resurectMove].UserID == player.UserID || Stones[resurectMove].Count <= 1);
                }


                var nextMove = index + (player.IsReversed ? -1 : 1) * move;
                if (nextMove < 0 || nextMove > 31) return false;

                return (Stones[nextMove].UserID == player.UserID) || (Stones[nextMove].Count <= 1);
            });
        }

        bool HasEveryStonesInside(GamePlayer player)
        {
            if (player.HasKilledStones)
                return false;

            return Stones.Where(s => s.UserID == player.UserID).All(s =>
            {
                var index = Stones.IndexOf(s);

                return (!player.IsReversed ? (index > 23) : (index < 8)) || (s.Count == 0);
            });
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
        public bool IsReversed { get; set; }

        [DataMember]
        public int KilledStonsCount { set; get; }

        [DataMember]
        public int StonesOut { get; set; }

        [DataMember]
        public int WinsCount { get; set; }

        [IgnoreDataMember]
        public List<string> ConnectionIDs { get; set; }

        [IgnoreDataMember]
        public bool HasKilledStones
        {
            get
            {
                return KilledStonsCount > 0;
            }
        }


        public void Init()
        {
            StonesOut = 0;
            IsReversed = false;
            KilledStonsCount = 0;
        }
    }
}