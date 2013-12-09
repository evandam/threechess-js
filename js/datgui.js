var datView;
function initDatGui() {
    datView = {
        "Marble": true,
        "Wood": false,
        "GameID": 340,
        "Start game": function () {
            controller.connectTo(this.GameID);
        },
        "Alternate models": function () {
            controller.board.swapModels();
        },
        "Rotate view": rotateView,
        "Overhead": overheadView,
        "Board level": boardLevelView
    };

    var gui = new dat.GUI();

    var cameraControls = gui.addFolder('Camera');
    cameraControls.add(window, 'mouseEnabled');
    cameraControls.add(datView, 'Rotate view');
    cameraControls.add(datView, 'Overhead');
    cameraControls.add(datView, 'Board level');

    var themes = gui.addFolder('Theme');
    var marbleController = themes.add(datView, 'Marble').listen();
    var woodController = themes.add(datView, 'Wood').listen();
    marbleController.onChange(function (value) {
        datView.Wood = !value;
        controller.board.switchTheme('marble');
    });
    woodController.onChange(function (value) {
        datView.Marble = !value;
        controller.board.switchTheme('wood');
    });
    themes.add(datView, 'Alternate models');

    var game = gui.addFolder('Game');
    game.add(datView, 'GameID');
    game.add(datView, 'Start game');

    cameraControls.open();
    themes.open();
    game.open();
}