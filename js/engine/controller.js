/**
 * Constructs a Controller with a board & pieces in a base state and prepares it
 * for game rendering
 */
function Controller( scene ) {
    // Get a new chess board with all the pieces
    // Hold a reference to it so it can be manipulated later
    var self = this;
    this.board = new Board(scene, function( ) {
        setTimeout(function( ) {
            self.connectTo();
        }, 2000);
    });
};

/**
 * Connects to a supplied URL for reading game moves. If the url is not
 * specified, a default board will be created with default camera & debug
 * interactions enabled
 * 
 * @param url
 *            The url to connect to
 */
Controller.prototype.connectTo = function( url ) {

    if ( url ) {
        // TODO Open the connection and do stuff with it
    }
    else {
        // TODO Set up debug interactions
        // Check some basic movement of pawns
        // white forward 1
        this.board.movePiece('a2', 'a3');
        this.board.movePiece('d2', 'd3');
        // white diagonal
        this.board.movePiece('b2', 'c3');
        // black forward 2
        this.board.movePiece('d7', 'd5');
        //Then rooks
        //white/black forward 3
        this.board.movePiece('a1', 'a4');
        this.board.movePiece('h8', 'h4');
        //Then knights, white
        this.board.movePiece('g1', 'h3');
        this.board.movePiece('b1', 'd2');
        //and black
        this.board.movePiece('g8', 'f6');
        //Then bishop, 2 diagonal white/black
        this.board.movePiece('c1', 'e3');
        this.board.movePiece('f8', 'd6');
        //Then queen
        this.board.movePiece('d1', 'a1');
        this.board.movePiece('d8', 'h8');
        //Reverse it to check that we're updating the map
        this.board.movePiece('a1', 'b1');
        this.board.movePiece('h8', 'g8');
        //Then king
        this.board.movePiece('e1', 'd1');
        this.board.movePiece('e8', 'd8');
    }
};
