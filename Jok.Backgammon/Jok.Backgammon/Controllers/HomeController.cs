using Jok.Backgammon.GameServer;
using Jok.GameEngine;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Jok.Backgammon.Controllers
{
    public class HomeController : GameControllerBase
    {
        #region Properties
        protected override string AuthorizationUrl
        {
            get { return ConfigurationManager.AppSettings["LoginUrl"] + "?returnUrl=" + Request.Url; }
        }

        protected override string ExitUrl
        {
            get { return ConfigurationManager.AppSettings["ExitUrl"]; }
        }

        protected override int ConnectionsCount
        {
            get { return GameHub.Connections.Count; }
        }

        protected override int TablesCount
        {
            get { return GameHub.Tables.Count; }
        }
        #endregion

        public override ActionResult Index()
        {
            return View("Index");
        }

        public override ActionResult Play(string id, string sid, string source)
        {
            var result = base.Play(id, sid, source);

            // sid რომ არ გამოჩნდეს url-ში
            if (!String.IsNullOrEmpty(sid))
            {
                return RedirectToAction("Play", new { id = id, source = source, debug = Request.Params["debug"] });
            }

            return result;
        }
    }
}