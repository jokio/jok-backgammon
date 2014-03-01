using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Web;

namespace Rvakara.GameServer.Models
{
    [DataContract]
    public struct Rank
    {
        private int stones;

        [DataMember]
        public int UserId { set; get; }
        [DataMember]
        public int Stones
        {
            set
            {
                if (value == 0)
                {
                    stones = 0;
                    UserId = 0;
                }
                else
                {
                    if (value > 0 && UserId == 0)
                        throw new Exception("UserId is 0. RANK!");
                    stones = value;
                }

            }
            get { return stones; }
        }
    }
}