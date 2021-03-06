﻿using System.Web;
using System.Web.Optimization;

namespace Jok.Backgammon
{
    public class BundleConfig
    {
        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/play/js").Include(
                        "~/Scripts/jquery-{version}.js",
                        "~/Scripts/jquery.cookie.js",
                        "~/Scripts/jquery.shake-effect.js",
                        //"~/Scripts/jquery.signalR-{version}.js",
                        //"~/Scripts/Jok.GameEngine.js",
                        "~/Scripts/engine.io-{version}.js",
                        "~/Scripts/eio-reconnect-{version}.js",
                        "~/Scripts/fastclick.js",
                        "~/Scripts/fm_plugin.js",
                        "~/Scripts/Game.js"));


            bundles.Add(new ScriptBundle("~/tutorial/js").Include(
                        "~/Scripts/jquery-{version}.js",
                        "~/Scripts/jquery.cookie.js",
                        "~/Scripts/bootstrap.js",
                        "~/Scripts/async.js",
                        "~/Scripts/typed.js",
                        "~/Scripts/FM/mediaelement.js"
            ));



            bundles.Add(new StyleBundle("~/play/css").Include(
                      "~/Content/font-awesome.css",
                      "~/Content/Jok.MusicPlayer.css",
                      "~/Content/Game.Board.css",
                      "~/Content/site.css"));

            

            bundles.Add(new StyleBundle("~/index/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/_GithubLogo.css"));
        }
    }
}
