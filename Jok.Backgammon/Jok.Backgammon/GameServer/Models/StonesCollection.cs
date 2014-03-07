using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jok.Backgammon.GameServer.Models
{
    public class StonesCollection
    {
        public int Index { get; set; }
        public int? UserID { get; set; }
        public int Count { get; set; }
    }
}