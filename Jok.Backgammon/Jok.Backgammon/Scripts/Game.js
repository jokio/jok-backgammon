


var Game = {


    setStonesCollection: function (index, count, isOpponentStones) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        container.find('.stone').remove();

        for (var i = 0; i < count; i++) {
            var item = $('<div class="stone">');
            if (isOpponentStones)
                item.addClass('opponent');

            if (count > 5)
                item.addClass('near');

            container.append(item);
        }
    },

    setStoneHighlight: function (index) {
        var container = $('#Board .stone_collection[data-id=' + index + ']');

        if (container.find('.highlight').length) return;

        var item = $('<div class="stone highlight">');

        if (container.parent().hasClass('items_bottom')) {
            container.prepend(item);
        } else {
            container.append(item);
        }
    },

    clearStoneHighlights: function () {
        $('#Board .stone.highlight').remove();
    },
};