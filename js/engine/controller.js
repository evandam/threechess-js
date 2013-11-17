/**
 * Constructs a Controller with a board & pieces in a base state and prepares it
 * for game rendering
 */
function Controller( scene ) {
    // Get a new chess board with all the pieces
    //  Hold a reference to it so it can be manipulated later
    this.board = new Board(scene);
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
    }
};
