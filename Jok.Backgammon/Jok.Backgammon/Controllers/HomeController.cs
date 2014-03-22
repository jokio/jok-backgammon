using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Jok.Backgammon.Controllers
{
    public class HomeController : Controller
    {
        public  ActionResult Index()
        {
            return View("Index");
        }

        public ActionResult Play(string id, string sid, string source)
        {
            // sid რომ არ გამოჩნდეს url-ში
            if (!String.IsNullOrEmpty(sid))
            {
                return RedirectToAction("Play", new { id = id, source = source, debug = Request.Params["debug"] });
            }

            return View();
        }
    }
}