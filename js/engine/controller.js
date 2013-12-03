/**
 * Constructs a Controller with a board & pieces in a base state and prepares it
 * for game rendering
 */
function Controller( scene ) {
    // Get a new chess board with all the pieces
    // Hold a reference to it so it can be manipulated later
    var self = this;
    this.board = new Board(scene, function( ) {
        /*setTimeout(function( ) {
            self.connectTo();
        }, 2000);*/
    });
    // root of url - append the game id
    this.root = 'http://www.bencarle.com/chess/cg/'
    this.url;
};

/**
 * Connects to a supplied URL for reading game moves. If the url is not
 * specified, a default board will be created with default camera & debug
 * interactions enabled
 * 
 * @param url
 *            The url to connect to
 */
Controller.prototype.connectTo = function( gameId ) {
    var self = this;
    self.url = self.root + gameId;
    var gameover;
    // Clear the current queue of moves
    // And queue up the moves from the server
    // TODO: need to reset the pieces
    $.ajax({
        url: self.url,
        async: false,
        dataType: 'json',
        success: function (data) {
            console.log(data.moves);
            this.lastmovenumber = data.lastmovenumber;
            gameover = data.gameover;
            console.log(gameover);
            self.board.moveQueue = [];
            for(var i in data.moves) {
                self.board.queueMove(data.moves[i][0], data.moves[i].slice(1));
            }
        }
    });

    // Poll for next move every second, stop when gameover
    var intervalId = setInterval(function () {
        if (!gameover) {
            self.poll();
        }
        else
            clearInterval(intervalId);
    }, 1000);

        
    /*else {
        // TODO Set up debug interactions
        // Run the example game
        var moves = [ "Pe2e4", "Pd7d6", "Pd2d4", "Ng8f6", "Nb1c3", "Pg7g6",
                "Bc1e3", "Bf8g7", "Qd1d2", "Pc7c6", "Pf2f3", "Pb7b5", "Ng1e2",
                "Nb8d7", "Be3h6", "Bg7h6", "Qd2h6", "Bc8b7", "Pa2a3", "Pe7e5",
                "Ke1c1", "Qd8e7", "Kc1b1", "Pa7a6", "Ne2c1", "Ke8c8", "Nc1b3",
                "Pe5d4", "Rd1d4", "Pc6c5", "Rd4d1", "Nd7b6", "Pg2g3", "Kc8b8",
                "Nb3a5", "Bb7a8", "Bf1h3", "Pd6d5", "Qh6f4", "Kb8a7", "Rh1e1",
                "Pd5d4", "Nc3d5", "Nb6d5", "Pe4d5", "Qe7d6", "Rd1d4", "Pc5d4",
                "Re1e7", "Ka7b6", "Qf4d4", "Kb6a5", "Pb2b4", "Ka5a4", "Qd4c3",
                "Qd6d5", "Re7a7", "Ba8b7", "Ra7b7", "Qd5c4", "Qc3f6", "Ka4a3",
                "Qf6a6", "Ka3b4", "Pc2c3", "Kb4c3", "Qa6a1", "Kc3d2", "Qa1b2",
                "Kd2d1", "Bh3f1", "Rd8d2", "Rb7d7", "Rd2d7", "Bf1c4", "Pb5c4",
                "Qb2h8", "Rd7d3", "Qh8a8", "Pc4c3", "Qa8a4", "Kd1e1", "Pf3f4",
                "Pf7f5", "Kb1c1", "Rd3d2", "Qa4a7" ];

        for ( var m = 0; m < moves.length; ++m ) {
            this.board.queueMove(moves[m][0], moves[m].slice(1));
        }
    }*/
};

// Continuously poll the server until the game is over and queue up the latest move
Controller.prototype.poll = function () {
    var self = this;
    $.get(self.url, function (data) {
        // there has been a move since the server was last polled
        if (data.lastmovenumber != self.lastmovenumber) {
            // queue the last move to be animated
            var i = data.moves.length - 1;
            self.board.queueMove(data.moves[i][0], data.moves[i].slice(1));
        }
    });
};
