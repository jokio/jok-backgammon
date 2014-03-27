// *******************************************************************************
// Jok.ge (c) 2012
// *******************************************************************************


var RadioPlugin = function (titleObj, playButton, stopButton, volumeLogo, volumeSlider, volume, isMusicPlaying, itemid, activeChannels) {
    this._title = titleObj;
    this._playButton = playButton;
    this._stopButton = stopButton;
    this._volumeLogo = volumeLogo;
    this._volumeSlider = volumeSlider;
    this._activeChannels = activeChannels;

    this._volume = volume / 100;
    this._itemid = itemid;

    jok.fm_audio.setVolume(this._volume);

    var changeVolumeEvent = function () {
        var newVolume = this._volumeSlider.slider("option", "value");
        this.volumeChange(newVolume);

        $.cookie('volume', newVolume, { expires: 300, path: '/', domain: jok.getCookieDomain() });
    }

    //volumeSlider.slider({
    //    orientation: "vertical",
    //    range: "min",
    //    min: 1,
    //    max: 100,
    //    step: 1,
    //    value: volume
    //});
    volumeSlider.bind("slidestop", changeVolumeEvent.bind(this));
    volumeSlider.bind("touchend", changeVolumeEvent.bind(this));


    if (isMusicPlaying) {
        if (!this.play())
            this.stop();
    }
}


// Visual Elements
RadioPlugin.prototype._title = null;
RadioPlugin.prototype._playButton = null;
RadioPlugin.prototype._stopButton = null;
RadioPlugin.prototype._volumeLogo = null;
RadioPlugin.prototype._volumeSlider = null;

// Properties
RadioPlugin.prototype._volume = 40;
RadioPlugin.prototype._itemid = 1;
RadioPlugin.prototype._isMuted = false;
RadioPlugin.prototype._activeChannels = [];


// API methods
RadioPlugin.prototype.play = function (_id) {
    if (this._activeChannels.length == 0) return;

    if (_id || _id == 0) this._itemid = _id;

    var item = this._activeChannels[this._itemid];
    if (!item) return;

    this.isPlaying = true;

    jok.fm_audio.play(item.source);

    this._playButton.hide();
    this._stopButton.show();
    $('.jokfm_plugin .next_button').show();
    $('.jokfm_plugin .previous_button').show();
    //$('.jokfm_plugin .active_channel').show();

    this._title.html(item.channel.toUpperCase().replace('_', ' '));


    // cookies stuff
    var date = new Date();
    date.setTime(date.getTime() + (1000 * 60 * 60 * 1 /* Hours */));

    var date2 = new Date();
    date2.setTime(date2.getTime() + (1000 * 60 * 60 * 24 /* Hours */));

    try {
        var oldItem = $('#favorites_list div.item[data-channelid=' + item.channelid + ']');
        if (oldItem.length == 0)
            oldItem = $('#normal_list div.item[data-channelid=' + item.channelid + ']');

        if (oldItem.length != 0) {
            $('#favorites_list ._play.playing').attr('class', '_play');
            $('#normal_list ._play.playing').attr('class', '_play');

            oldItem.find('._play').attr('class', '_play playing');

            $('#favorites_list div.item').attr('class', 'item');
            $('#normal_list div.item').attr('class', 'item');
            $('#favorites_list div.item[data-channelid=' + item.channelid + ']').attr('class', 'item active');
            $('#normal_list div.item[data-channelid=' + item.channelid + ']').attr('class', 'item active');

        }

        $('#Player1 .music_speakers').show();
        $('.stop_music_button').show();
    }
    catch (err) { }

    $.removeCookie('channel');
    $.cookie('isMusicPlaying', '1', { expires: date, path: '/', domain: jok.getCookieDomain() });
    $.cookie('channel', item.channel, { expires: 300, path: '/', domain: jok.getCookieDomain() });
    $.cookie('isActiveListener', '1', { expires: date2, path: '/', domain: jok.getCookieDomain() });

    return true;
}

RadioPlugin.prototype.stop = function () {
    jok.fm_audio.stop();

    this.isPlaying = false;

    this._playButton.show();
    this._stopButton.hide();
    $('.jokfm_plugin .next_button').hide();
    $('.jokfm_plugin .previous_button').hide();
    //$('.jokfm_plugin .active_channel').hide();

    this._title.html('JOK FM');

    $('#favorites_list ._play.playing').attr('class', '_play');
    $('#normal_list ._play.playing').attr('class', '_play');
    $('#Player1 .music_speakers').hide();
    $('.stop_music_button').hide();

    $('#favorites_list div.item').attr('class', 'item');
    $('#normal_list div.item').attr('class', 'item');

    // cookies stuff
    $.cookie('isMusicPlaying', '0', { expires: new Date(), path: '/', domain: jok.getCookieDomain() });
    $.removeCookie('isMusicPlaying', { path: '/', domain: jok.getCookieDomain() });
}

RadioPlugin.prototype.playNext = function () {
    this._itemid = this._activeChannels.length > this._itemid + 1 ? this._itemid + 1 : 0;
    this.play();
}

RadioPlugin.prototype.playPrevious = function () {
    this._itemid = this._itemid - 1 >= 0 ? this._itemid - 1 : this._activeChannels.length - 1;
    this.play();
}

RadioPlugin.prototype.volumeChange = function (volume) {
    jok.fm_audio.setVolume(volume / 100);
    this._volume = volume / 100;
}

RadioPlugin.prototype.toggleMute = function () {
    if (this._isMuted) {
        this.unmute.call(this);
        return;
    }

    this.mute.call(this);
}

RadioPlugin.prototype.mute = function () {
    this._isMuted = true;
    jok.fm_audio.mute();

    this._volumeLogo.attr('class', 'logo mute');
    this._volumeSlider.slider('value', 1);
}

RadioPlugin.prototype.unmute = function () {
    this._isMuted = false;
    jok.fm_audio.unmute();

    this._volumeLogo.attr('class', 'logo');
    this._volumeSlider.slider('value', this._volume * 100);
}


var MusicChannels = {
    activeChannels: undefined,
    loaded: undefined
};

$(function () {
    var clickEvent = 'click';

    var activeChannels = [];

    var channel = $.cookie('channel');
    var volume = $.cookie('volume') || 40;
    var activeItemID = 0;
    var isMusicPlaying = $.cookie('isMusicPlaying') && $.cookie('sid');


    $(document).on(clickEvent, '.jokfm_plugin .active_channel', function () {
        //window.open('http://jok.fm/?source=ez')
    })

    $(document).on(clickEvent, '.jokfm_plugin .play_button', function () {
        $.radio.play();
    })

    $(document).on(clickEvent, '.jokfm_plugin .stop_button', function () {
        $.radio.stop();

        $('#favorites_list ._play.playing').attr('class', '_play');
        $('#normal_list ._play.playing').attr('class', '_play');
    })

    $(document).on(clickEvent, '.jokfm_plugin .next_button', function () {
        $.radio.playNext();
    })

    $(document).on(clickEvent, '.jokfm_plugin .previous_button', function () {
        $.radio.playPrevious();
    })

    $(document).on(clickEvent, '.jokfm_plugin_volume > .logo', function () {
        $.radio.toggleMute();
    })


    $(document).on(clickEvent, '.stop_music_button', function (e) {

        $.radio.stop();

        e.stopPropagation();
    });

    $(document).on(clickEvent, '#favorites_list .item ._star', function (e) {
        var id = $(this).parent().parent().attr('data-channelid');
        changeStarState(id);

        e.stopPropagation();
    });
    $(document).on('click touchend', '#normal_list .item ._star', function (e) {
        var id = $(this).parent().parent().attr('data-channelid');
        changeStarState(id);

        e.stopPropagation();
    });
    $(document).on('click touchend', '#favorites_list .item', function (e) {
        if (e.isPropagationStopped()) return;

        var id = $(this).attr('data-channelid');
        MusicChannelPlay(id);
    });
    $(document).on('click touchend', '#normal_list .item', function (e) {
        if (e.isPropagationStopped()) return;

        var id = $(this).attr('data-channelid');
        MusicChannelPlay(id);
    });


    function changeStarState(id) {
        var isFavorited = false;
        var items_container = $('#favorites_list');
        var items_container2 = $('#normal_list');

        var oldItem = items_container.find('div.item[data-channelid=' + id + ']');

        if (oldItem.length == 0) {
            items_container = $('#normal_list');
            items_container2 = $('#favorites_list');
            oldItem = items_container.find('div.item[data-channelid=' + id + ']');
            isFavorited = true;
        }

        if (oldItem.length > 0) {
            oldItem.hide(0, function () {
                oldItem.remove();

                items_container2.prepend(oldItem);
                oldItem.show('fast');
            });

            $.get('http://api.jok.ge/musicchannel/' + id + (isFavorited ? '/favorite' : '/unfavorite') + '?sid=' + $.cookie('sid'));
        }


        for (var i = 0; i < MusicChannels.activeChannels.length; i++) {
            if (MusicChannels.activeChannels[i].ID == id) {
                MusicChannels.activeChannels[i].IsFavorite = isFavorited;
                break;
            }
        }
    }

    function MusicChannelPlay(id) {
        for (var i = 0; i < $.radio._activeChannels.length; i++) {
            var item = $.radio._activeChannels[i];

            if (id == item.channelid) {
                $.radio.play(i);
                break;
            }
        }
    }


    $.get('http://api.jok.ge/musicchannel/0/getall?sid=' + $.cookie('sid'), function (data) {
        var list = (typeof data == "string") ? JSON.parse(data): data;
        MusicChannels.activeChannels = list;

        for (var i = 0; i < list.length; i++) {

            if (list[i].Name == channel) {
                activeItemID = i;
            }

            activeChannels.push({
                id: i,
                channelid: list[i].ID,
                channel: list[i].Name,
                source: list[i].Source,
            });
        };

        $.radio = new RadioPlugin(
            $('.jokfm_plugin .active_channel'),
            $('.jokfm_plugin .play_button'),
            $('.jokfm_plugin .stop_button'),
            $('.jokfm_plugin_volume > .logo'),
            $('.jokfm_plugin_volume .volume-selector'),
            volume,
            isMusicPlaying,
            activeItemID,
            activeChannels
        );

        $('.jokfm_plugin').show();
        $('.jokfm_plugin_volume').show();

        if (MusicChannels.loaded)
            MusicChannels.loaded(list);


        $.radio.updateTrackInfo = function (channelID, trackInfo) {
            var id = channelID;

            var item = $('#favorites_list div.item[data-channelid=' + channelID + ']');
            if (item.length == 0)
                item = $('#normal_list div.item[data-channelid=' + channelID + ']');

            if (item.length == 0) return;

            var oldTrack = item.find('._track').html();
            if (oldTrack == trackInfo) return;

            item.find('._track').html(trackInfo);

            item.css('background-color', 'rgba(204, 247, 190, 0.9)');
            item.animate({ backgroundColor: 'rgb(246, 247, 245)' }, 1000);

            for (var i = 0; i < MusicChannels.activeChannels.length; i++) {
                if (MusicChannels.activeChannels[i].ID == channelID) {
                    MusicChannels.activeChannels[i].TrackInfo = trackInfo;
                    break;
                }
            }
            
        }

        //setInterval(function () {
        //    $.get('http://api.jok.ge/musicchannel/0/getall?sid=' + $.cookie('sid'), function (_data) {
        //        var items = (typeof _data == "string") ? JSON.parse(_data) : _data;

        //        for (var i = 0; i < items.length; i++) {
        //            var id = items[i].ID;

        //            var item = $('#favorites_list div.item[data-channelid=' + items[i].ID + ']');
        //            if (item.length == 0)
        //                item = $('#normal_list div.item[data-channelid=' + items[i].ID + ']');

        //            if (item.length == 0) continue;

        //            var oldTrack = item.find('._track').html();
        //            if (oldTrack == items[i].TrackInfo) continue;

        //            item.find('._track').html(items[i].TrackInfo);

        //            item.css('background-color', 'rgba(204, 247, 190, 0.9)');
        //            item.animate({ backgroundColor: 'rgb(246, 247, 245)' }, 1000);
        //        }
        //    });
        //}, 20 * 1000);
    })
})


