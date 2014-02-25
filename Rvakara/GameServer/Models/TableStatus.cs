using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Rvakara.Server.Models
{
    public enum TableStatus
    {
        New, 
        Started,
        StartedWaiting,
        Finished
    }
}