var jok = jok || {};

(function ($) {

    var globals = {
        STOP_URL: 'https://stop.me'
    }

    var player;

    jok.fm_audio = {

        isStopped: true,

        play: function (url) {

            if (!player) return;

            try {
                player.stop();
                player.setSrc(url);
                player.play();

                this.isStopped = false;

                return true;
            }
            catch (err) { console.error(err); }

            return false;
        },

        stop: function () {
            try {
                this.play(globals.STOP_URL);

                this.isStopped = true;
            } catch (err) { console.error(err); }
        },

        toggleMute: function () {
            player.setMuted(player.muted);
        },

        mute: function () {
            player.setMuted(true);
        },

        unmute: function () {
            player.setMuted(false);
        },

        setVolume: function (volume) {
            try {
                player.setVolume(volume);
                return true;
            } catch (err) { console.error(err); }

            return false;
        }
    }

    $(function () {

        $('body').append('<audio id="jok_audio_player"><source src="" type="audio/mp3" /></audio>');

        player = new MediaElement('jok_audio_player', {
            //
            plugins: ['flash'],
            // specify to force MediaElement to use a particular video or audio type
            type: '',
            // path to Flash and Silverlight plugins
            pluginPath: '/Scripts/FM/',
            // name of flash file
            flashName: 'flashmediaelement.swf',
            // success
            success: function (me) {
                me.addEventListener('error', function (e) {
                    if (jok.fm_audio.isStopped) return;

                    var src = player.src;

                    setTimeout(function () {

                        player.src = '';
                        player.src = src;
                        player.play();
                    }, 900);

                    console.log((new Date().toJSON()) + ' trying to play, again.');
                }, false);
            }
        });
    })

})(jQuery);