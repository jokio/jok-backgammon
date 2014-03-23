using Jok.GameEngine;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Threading;
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


            var AuthorizationUrl = ConfigurationManager.AppSettings["LoginUrl"] + "?returnUrl=" + Request.Url;
            var ExitUrl = ConfigurationManager.AppSettings["ExitUrl"];

            if (!String.IsNullOrEmpty(sid))
            {
                var cookie = Request.Cookies["sid"];
                if (cookie == null)
                    cookie = new HttpCookie("sid", sid);

                cookie.Value = sid;
                cookie.Expires = DateTime.UtcNow.AddYears(30);

                if (Request.Url.Host.Contains('.'))
                    cookie.Domain = Request.Url.Host.Substring(Request.Url.Host.IndexOf('.'));

                Response.Cookies.Remove("sid");
                Response.Cookies.Add(cookie);
            }
            else
            {
                sid = Request.Cookies["sid"] == null ? "" : Request.Cookies["sid"].Value;
            }



            if (String.IsNullOrEmpty(sid))
                return Redirect(AuthorizationUrl);


            var userInfo = JokAPI.GetUser(sid, Request.UserHostAddress);
            if (userInfo.IsSuccess != true)
                return Redirect(AuthorizationUrl + "&getUserInfo=failed");

            if (!String.IsNullOrEmpty(userInfo.CultureName))
            {
                Thread.CurrentThread.CurrentUICulture = new System.Globalization.CultureInfo(userInfo.CultureName);
                ViewBag.Language = userInfo.CultureName.Replace('-', '_');
            }


            ViewBag.ID = id;
            ViewBag.SID = sid;
            ViewBag.Source = source;
            ViewBag.IsMobileApp = (source == "mobileapp");
            ViewBag.GameID = JokAPI.GameID;
            ViewBag.UserID = userInfo.UserID;
            ViewBag.IsVIPMember = userInfo.IsVIP;
            ViewBag.Channel = (!String.IsNullOrWhiteSpace(id) && id.ToLower() == "private") ? ShortGuid.NewGuid().ToString() : id;
            ViewBag.AuthorizationUrl = AuthorizationUrl;
            ViewBag.ExitUrl = ExitUrl;


            return View();
        }
    }
}