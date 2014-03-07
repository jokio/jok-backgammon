using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jok.Backgammon.GameServer.Models
{
    public enum TableStatus
    {
        New,
        Started,
        StartedWaiting,
        Finished
    }
}