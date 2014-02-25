using Jok.GameEngine;
using Jok.GameEngine.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Rvakara.GameServer.Models;

namespace Rvakara.Server
{
    public class GameHub : GameHubBase<GameTable>
    {
        public void SetPosition(MoveStone[] move)
        {
            var user = GetCurrentUser();
            if (user == null) return;

            user.Table.SetPosition(user.UserID,move);
        }

        public void PlayAgain(int c)
        {
            var user = GetCurrentUser();
            if (user == null) return;

            user.Table.PlayAgain(user.UserID);
        }
    }
}