﻿using Jok.GameEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jok.Backgammon.GameServer
{
    public class GameHub : GameHubBase<GameTable>
    {
        public void Move(int index, int[] moves)
        {
            var user = GetCurrentUser();
            if (user == null) return;

            user.Table.Move(user.UserID, index, moves);
        }
    }
}