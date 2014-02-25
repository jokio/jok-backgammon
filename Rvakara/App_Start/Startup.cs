using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(Rvakara.Startup))]

namespace Rvakara
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR();
        }
    }
}