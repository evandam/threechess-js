/**
 * Constructs a Controller with a board & pieces in a base state and prepares it
 * for game rendering
 */
function Controller( scene ) {
    // Get a new chess board with all the pieces
    // Hold a reference to it so it can be manipulated later
    var self = this;
    this.board = new Board(scene, function( ) {
        // setTimeout(function( ) {
        // self.connectTo();
        // }, 2000);
    });
    // root of url - append the game id
    this.root = 'https://10.11.18.65/cg/chess/';
    this.url;
    this.gameover;
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

    // if ( gameId ) {
    self.url = self.root + gameId;
    // Clear the current queue of moves
    // And queue up the moves from the server
    // TODO: need to reset the pieces
    $.ajax(
    {
        url : self.url,
        async : false,
        dataType : 'json',
        success : function( data ) {
            self.lastmovenumber = data.lastmovenumber;
            self.gameover = data.gameover;
            self.board.moveQueue = [ ];
            for ( var i in data.moves ) {
                self.board.queueMove(data.moves[i][0], data.moves[i].slice(1));
            }
        }
    });

    // Poll for next move every second, stop when gameover
    var intervalId = setInterval(function( ) {
        if ( !self.gameover ) {
            self.poll();
        }
        else
            clearInterval(intervalId);
    }, 1000);

    /*
     * }
     * 
     * else { // TODO Set up debug interactions // Run the example game var
     * moves = [ "Ph2h4", "Pg7h3", "Ph7h5", "Pg2h6", "Pa2a8Q", "Pb2b8R",
     * "Pc2c8B", "Pd2d8N", "Pa7a1Q", "Pb7b1R", "Pc7c1B", "Pd7d1N" ];
     * 
     * for ( var m = 0; m < moves.length; ++m ) {
     * this.board.queueMove(moves[m][0], moves[m].slice(1)); } }
     */
};

// Continuously poll the server until the game is over and queue up the latest
// move
Controller.prototype.poll = function( ) {
    var self = this;
    $.get(self.url, function( data ) {
        // there has been a move since the server was last polled
        if ( data.lastmovenumber != self.lastmovenumber ) {
            // queue the last move to be animated
            // bug where sometimes 2 moves can happen between polling, so account for that
            for (var i = self.lastmovenumber + 1; i < data.moves.length; i++) {
                self.board.queueMove(data.moves[i][0], data.moves[i].slice(1));
            }            
        }

        self.lastmovenumber = data.lastmovenumber;
        self.gameover = data.gameover;

        // update clocks
        var mins = Math.floor(data.whitetime / 60);
        var secs = Math.floor(data.whitetime % 60);
        if (secs < 10)
            secs = '0' + secs;
        $('#whiteTime').text(mins + ':' + secs);

        mins = Math.floor(data.blacktime / 60);
        secs = Math.floor(data.blacktime % 60);
        if (secs < 10)
            secs = '0' + secs;
        $('#blackTime').text(mins + ':' + secs);

    }, 'json');
};
