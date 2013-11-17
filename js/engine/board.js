/**
 * Defines a basic chess board and functions for interacting with it
 * 
 * @param scene
 *            The scene that this board will attach to
 */
function Board( scene ) {
    // No generated pieces yet
    this.pieces = [ ];

    // The 3D board object, Board intial load code by @evan
    this.board = new THREE.Object3D();
    var board = this.board;
    // Closure for adding pieces to the board
    var self = this;

    // Get a loader for our models
    var loader = new THREE.OBJMTLLoader();

    // Load in the Board data itself
    loader.load('models/boardBlocks.obj', 'models/boardBlocks.mtl', function(
            object ) {
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(1, 1, 1);
        });
        board.add(object);

        // black spaces
        var cloned = cloneObj(object);
        cloned.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(0, 0, 0);
        });
        cloned.rotateY(Math.PI / 2); // 90 degrees
        board.add(cloned);

        // Now that the board layout is done, put the pieces on it
        self.loadPieces();
    });

    // Add it to the passed-in scene
    scene.add(this.board);
};

/**
 * Adds pieces to the board for display
 */
Board.prototype.loadPieces = function( ) {
    // Get an object loader
    var loader = new THREE.OBJMTLLoader();
    var board = this.board;

    var setWhite = function( object ) {
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(1, 1, 1);
        });
    };

    var setBlack = function( object ) {
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(0, 0, 0);
        });
    };

    var scalePiece = function( piece ) {
        piece.scale.x = 0.50;
        piece.scale.y = 0.50;
        piece.scale.z = 0.50;
    };
    
    /*
     * Pawn-specific loading functions
     */
    var whiteInitial = function(piece) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(2.5);
    };
    
    var blackInitial = function(piece) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(-2.5);
    };

    /*
     * The actual object load method for creating the pawns
     */
    var loadPawn = function( setcolor, startpos) {
        // Load in the pieces, starting with the pawns
        loader.load('models/pawn.obj', 'models/pawn.mtl', function( object ) {
            // Make the pawns
            var piece = object;

            // Set up the first one
            setcolor(piece);
            scalePiece(piece);

            // Move into position
            startpos(piece);

            // Add to the board
            board.add(piece);

            // Place the rest
            for ( var i = 1; i < 8; ++i ) {
                // Clone it
                piece = piece.clone();

                // Make it white
                setcolor(piece);

                // Scale it
                scalePiece(piece);

                // Move it into place
                // Should probably be replaced by a call to the moveTo function
                // whenever that is created
                piece.translateX(1);

                // Add it to the board
                board.add(piece);
            }
        });
    };
    
    /*
     * Generate the pawn sets
     * These are done separately because the clone methods were not properly 
     * transferring mesh colors & lighting
     */
    loadPawn(setWhite, whiteInitial);
    loadPawn(setBlack, blackInitial);
    
    /*
     * Rook loading functions 
     */

};
