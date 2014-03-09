using Jok.GameEngine;
using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jok.Backgammon.GameServer
{
    public class GameCallback
    {
        #region Cool Stuff (dont open :P)
        static IHubContext Hub = GlobalHost.ConnectionManager.GetHubContext<GameHub>();

        public string ConnectionID { get; set; }

        public dynamic Callback
        {
            get { return Hub.Clients.Client(ConnectionID); }
        }

        static IList<string> GetUsers(ICallback to, params ICallback[] exclude)
        {
            if (to == null) return null;

            var result = new List<string>();
            var ignoreList = new List<string>();

            exclude.ToList().ForEach(i1 => i1.ConnectionIDs.ForEach(ignoreList.Add));

            foreach (var item in to.ConnectionIDs)
            {
                if (!ignoreList.Contains(item))
                    result.Add(item);
            }

            if (result.Count == 0)
                return null;

            return result;
        }
        #endregion


        public static void TableState(ICallback to, GameTable table)
        {
            var conns = GetUsers(to);
            if (conns == null) return;

            Hub.Clients.Clients(conns).TableState(table);
        }

        public static void RollingResult(ICallback to, int[] moves, int[] displayMoves, int activeUserID)
        {
            var conns = GetUsers(to);
            if (conns == null) return;

            Hub.Clients.Clients(conns).RollingResult(moves, displayMoves, activeUserID);
        }

        public static void MoveRequest(ICallback to)
        {
            var conns = GetUsers(to);
            if (conns == null) return;

            Hub.Clients.Clients(conns).MoveRequest();
        }
    }
}