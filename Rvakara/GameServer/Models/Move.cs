using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Web;

namespace Rvakara.GameServer.Models
{
    [DataContract]
    public class MoveStone
    {
        
        [DataMember]
        public int From { set; get; }

        [DataMember]
        public int To { set; get; }
    }
}