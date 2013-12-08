var view = {
    "Marble": true,
    "Wood": false,
    "GameID": 340,
    "Start game": function () {
        controller.connectTo(this.GameID);
    },
    "Use alternate models": function () {
        controller.board.swapModels(false);
    }
};

var gui = new dat.GUI();

var themes = gui.addFolder('Theme');
var marbleController = themes.add(view, 'Marble').listen();
var woodController = themes.add(view, 'Wood').listen();
marbleController.onChange(function (value) {
    view.Wood = !value;
    controller.board.switchTheme('marble');
});
woodController.onChange(function (value) {
    view.Marble = !value;
    controller.board.switchTheme('wood');
});
themes.add(view, 'Use alternate models');

var game = gui.addFolder('Game');
game.add(view, 'GameID');
game.add(view, 'Start game');
themes.open();
game.open();