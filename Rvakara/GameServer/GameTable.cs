using System.Security;
using System.Security.Cryptography;
using System.Web.Http.ModelBinding;
using System.Web.Providers.Entities;
using Jok.GameEngine;
using Rvakara.GameServer.Models;
using Rvakara.Server.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using WebGrease.Css.Ast.Selectors;

namespace Rvakara.Server
{
    public class GameTable : GameTableBase<GamePlayer>
    {
        #region Properties

       
        public override bool IsStarted
        {
            get { return Status == TableStatus.Started || Status == TableStatus.StartedWaiting; }
        }

        public override bool IsFinished
        {
            get { return Status == TableStatus.Finished; }
        }

        [DataMember]
        public TableStatus Status { get; set; }

        [DataMember]
        public GamePlayer LastWinnerPlayer
        {
            set;
            get;
        }


        [DataMember]
        public Rank[] TableState { set; get; }
        #endregion

         int TIME_OUT_TICK = 20000;


        [DataMember]
        public bool Replay { set; get; }


        [DataMember]
        public int[] Dices { set; get; }

        public void SetPosition(int userid, MoveStone[] move)
        {

            //TODO MOVE
            var player = GetPlayer(userid);
            if (player == null) return;

            lock (SyncObject)
            {
                OnSetPosition(player, move);
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
                        Init();
                        Start();
                        GameCallback.TableState(this, this);
                    }
                    else
                    {

                        GameCallback.TableState(player, this);
                    }

                    break;

                case TableStatus.Started:
                    GameCallback.TableState(this, this);
                    break;


                case TableStatus.StartedWaiting:
                    if (!Players.Contains(player))
                        return;
                    Status = TableStatus.Started;
                    GameCallback.TableState(this, this);
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


        private bool tryMove(GamePlayer player, Rank[] arr, MoveStone move)
        {

            try
            {
                if (player.IsRevers)
                {
                    if (move.From != -1)
                        move.From = 31 - move.From;
                    if (move.To != 33)
                        move.To = 31 - move.To;
                }
                if (move.To == 33) // Won
                {
                    if (arr[move.From].UserId == player.UserID)
                    {
                        arr[move.From].Stones -= 1;
                        return true;
                    }
                    return false;
                }
                if (move.From == -1)
                {
                    player.KilledStons--;
                }
                else
                {
                    if (arr[move.From].UserId == player.UserID)
                    {
                        arr[move.From].Stones--;
                    }
                    else
                    {
                        return false;
                    }
                }

                if (arr[move.To].UserId > 0 && arr[move.To].UserId != player.UserID)
                {
                    if (arr[move.To].Stones == 1)
                    {
                        // KILL
                        var secound = Players.First(u => u.UserID != player.UserID);
                        secound.KilledStons++;
                        arr[move.To].UserId = player.UserID;
                        arr[move.To].Stones = 1;
                        return true;
                    }
                    return false;
                }

                arr[move.To].UserId = player.UserID;
                arr[move.To].Stones += 1;
                return true;
            }
            catch (Exception)
            {
                return false;
            }

        }

        protected void OnSetPosition(GamePlayer player, MoveStone[] move)
        {
            if (Status != TableStatus.Started)
            {
                GameCallback.TableState(this, this);
                return;
            }
            var kills = player.KilledStons;
            Replay = false;
            var stmp = new Rank[TableState.Length];
            Array.Copy(TableState, stmp, stmp.Length);

            #region  CTRL
            Array.Sort(Dices);
            var lstMove = new List<int>();
            if (Dices[0] != Dices[1] && Dices[1] != Dices[2]) // a:b:c
            {
                for (int i = 0; i < 3; i++)
                    lstMove.Add(Dices[i]);
            }

            else
            {
                if (Dices[0] == Dices[1] && Dices[1] == Dices[2]) //a:a:a
                {
                    for (int i = 0; i < 6; i++)
                        lstMove.Add(Dices[0]);
                }
                else
                {
                    if (Dices[0] == Dices[1]) // a:a:b
                    {
                        for (int i = 0; i < 3; i++)
                            lstMove.Add(Dices[0]);
                        lstMove.Add(Dices[2]);
                    }
                    else
                    { //a:b:b
                        for (int i = 0; i < 3; i++)
                            lstMove.Add(Dices[1]);
                        lstMove.Add(Dices[0]);
                    }
                }
            }
            #endregion


            bool wrongMove = false;
            for (int i = 0; i < move.Length; i++)
            {

                if (move[i].From >= move[i].To || move[i].To > 33 || move[i].From < -1)
                {
                    wrongMove = true;
                    break;
                }

                var tmp = move[i].From != -1 ? move[i].To - move[i].From : move[i].To;
                if (lstMove.Contains(tmp)) // Can move | this type
                {
                    lstMove.Remove(tmp);
                }
                else
                {
                    wrongMove = true;
                    break;
                }

                if (!tryMove(player, stmp, move[i]))
                {
                    wrongMove = true;
                    break;
                }

            }
            var flagGameEnd = CheckFinish();
            if (!wrongMove && (lstMove.Count == 0 || flagGameEnd))
            {
                player.TimerHendler.Stop();
                var splayer = Players.First(w => w.UserID != player.UserID);
                splayer.TimerCreateDate = DateTime.Now;
                splayer.TimerHendler.SetTimeout(OnPlayerTime, player, TIME_OUT_TICK);

                TableState = stmp;
                var rnd = new Random();
                Dices = new[] { rnd.Next(1, 8), rnd.Next(1, 8), rnd.Next(1, 8) };
                player.KilledStons = kills;
                if (flagGameEnd)
                {
                    Finish();
                }
            }
            else
            {
                Replay = true;
            }
            GameCallback.TableState(this, this);
        }




        protected void OnPlayAgain(GamePlayer pl)
        {
            if (Status == TableStatus.Finished)
            {
                pl.PlayAgain = true;
                if (Players.Any(p => !p.PlayAgain))
                {
                    Start();
                    return;
                }
                GameCallback.TableState(this, this);
            }
          
        }



        void Init()
        {

            Status = TableStatus.New;
            Players.ForEach(e => e.Init());

        }

        void Start()
        {
            Status = TableStatus.Started;

            //INITIAL
            TableState = new Rank[32];
            for (int i = 1; i < TableState.Length - 1; i++)
                TableState[i] = new Rank();
            TableState[0] = new Rank() { UserId = Players[0].UserID, Stones = 20 };
            TableState[31] = new Rank() { UserId = Players[1].UserID, Stones = 20 };
            Players[1].IsRevers = true;
            Players[0].TimerCreateDate = DateTime.Now;
            Players[0].TimerHendler.SetTimeout(OnPlayerTime, Players[0], TIME_OUT_TICK);
            var rnd = new Random();
            Dices = new[] { rnd.Next(1, 8), rnd.Next(1, 8), rnd.Next(1, 8) };
            GameCallback.TableState(this, this);

        }

        void Finish()
        {
            Status = TableStatus.Finished;
            GameCallback.TableState(Table, this);
        }



        void OnPlayerTime(GamePlayer player)
        {
            LastWinnerPlayer = Players.First(p => p.UserID != player.UserID);
            Finish();
           
        }


        bool CheckFinish()
        {
            int count = 0;
            int fuserid = 0;
            foreach (var item in TableState)
            {
                if (item.UserId != 0)
                {
                    if (fuserid != item.UserId)
                        count++;
                    if (count > 1)
                        return false;
                }
            }
            LastWinnerPlayer = Players.First(u => u.UserID != fuserid);
            return true;

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

        [IgnoreDataMember]
        public bool PlayAgain { set; get; }


        [IgnoreDataMember]
        public List<string> ConnectionIDs { get; set; }

        [IgnoreDataMember]
        public long Time { set; get; }

        [DataMember]
        public int KilledStons { set; get; }

        [DataMember]
        public bool IsRevers;

        [DataMember]
        public int UserID { get; set; }

        [IgnoreDataMember]
        public IJokTimer<GamePlayer> TimerHendler { set; get; }

        [IgnoreDataMember]
        public DateTime TimerCreateDate { set; get; }



        public GamePlayer()
        {
            TimerHendler = JokTimer<GamePlayer>.Create();
            
        }


        public void Init()
        {
            KilledStons = 0;
            this.Time = 0;
            PlayAgain = false;
        }
    }

}
