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
    var whiteInitial = function( piece ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(2.5);
    };

    var blackInitial = function( piece ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(-2.5);
    };

    /*
     * The actual object load method for creating the pawns
     */
    var loadPawns = function( setcolor, startpos ) {
        // Load in the pieces, starting with the pawns
        loader.load('models/pawn.obj', 'models/pawn.mtl', function( object ) {
            // Make the pawns
            var pawn = object;

            // Set up the first one
            setcolor(pawn);
            scalePiece(pawn);

            // Move into position
            startpos(pawn);

            // Add to the board
            board.add(pawn);

            // Place the rest
            for ( var i = 1; i < 8; ++i ) {
                // Clone it
                pawn = pawn.clone();

                // Move it into place
                // Should probably be replaced by a call to the moveTo function
                // whenever that is created
                pawn.translateX(1);

                // Add it to the board
                board.add(pawn);
            }
        });
    };

    /*
     * Generate the pawn sets These are done separately because the clone
     * methods were not properly transferring mesh colors & lighting
     */
    loadPawns(setWhite, whiteInitial);
    loadPawns(setBlack, blackInitial);

    /*
     * Rook loading functions
     */
    whiteInitial = function( piece ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(3.5);
    };

    blackInitial = function( piece ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
    };

    /*
     * Object load method for the Rooks
     */
    var loadRooks = function( setcolor, startpos ) {
        loader.load('models/rook.obj', 'models/rook.mtl', function( object ) {
            var rook = object;
            // Color and put in first position
            setcolor(rook);
            startpos(rook);

            // Scale it appropriately
            scalePiece(rook);

            // Add it to the board
            board.add(rook);

            // Make the other rook
            rook = rook.clone();
            // Move to other side of board
            rook.translateX(7);
            // Add it to the board
            board.add(rook);
        });
    };

    /*
     * Generate the rooks
     */
    loadRooks(setWhite, whiteInitial);
    loadRooks(setBlack, blackInitial);

    /*
     * Knight loading functions
     */
    whiteInitial = function( piece ) {
        piece.translateX(-2.5);
        piece.translateY(1);
        piece.translateZ(3.5);
    };

    blackInitial = function( piece ) {
        piece.translateX(-2.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
    };

    var whiteRotation = function( piece ) {
        piece.rotateY(Math.PI);
    };

    var resetWhiteRot = function( piece ) {
        piece.rotateY(-Math.PI);
    };

    /*
     * Object load function for the knights
     */
    var loadKnights = function( setcolor, startpos, dorotation, resetrotation ) {
        loader.load('models/knight.obj', 'models/knight.mtl',
                function( object ) {
                    var knight = object;

                    // You know the drill
                    setcolor(knight);
                    startpos(knight);
                    scalePiece(knight);
                    board.add(knight);

                    if ( dorotation )
                        dorotation(knight);

                    // and the second
                    knight = knight.clone();
                    // Clear the rotation for movement
                    if ( resetrotation )
                        resetrotation(knight);
                    // Move into position
                    knight.translateX(5);
                    // Do the rotation
                    if ( dorotation )
                        dorotation(knight);
                    board.add(knight);
                });
    };

    /*
     * Generate the knights
     */
    loadKnights(setWhite, whiteInitial, whiteRotation, resetWhiteRot);
    loadKnights(setBlack, blackInitial);

    /*
     * Bishop loading functions
     */
    whiteInitial = function( piece ) {
        piece.translateX(-1.5);
        piece.translateY(1);
        piece.translateZ(3.5);
    };

    blackInitial = function( piece ) {
        piece.translateX(-1.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
    };

    whiteRotation = function( piece ) {
        // Rotate the pieces by 90 degress so they face the right way
        piece.rotateY(Math.PI / 2);
    };

    resetWhiteRot = function( piece ) {
        piece.rotateY(-( Math.PI / 2 ));
    };

    var blackRotation = function( piece ) {
        // Rotate the pieces by 270 degress so they face the right way
        piece.rotateY(Math.PI * 1.5);
    };

    var resetBlackRot = function( piece ) {
        piece.rotateY(-( Math.PI * 1.5 ));
    };

    /*
     * Object load function for the bishops
     */
    var loadBishops = function( setcolor, startpos, dorotation, resetrotation ) {
        loader.load('models/bishop.obj', 'models/bishop.mtl',
                function( object ) {
                    var bishop = object;

                    // You know the drill
                    setcolor(bishop);
                    startpos(bishop);
                    scalePiece(bishop);
                    dorotation(bishop);

                    board.add(bishop);

                    // and the second
                    bishop = bishop.clone();
                    resetrotation(bishop);
                    bishop.translateX(3);
                    dorotation(bishop);
                    board.add(bishop);
                });
    };

    /*
     * Generate the bishops
     */
    loadBishops(setWhite, whiteInitial, whiteRotation, resetWhiteRot);
    loadBishops(setBlack, blackInitial, blackRotation, resetBlackRot);

    /*
     * Queen loading functions
     */
    whiteInitial = function( piece ) {
        piece.translateX(-0.5);
        piece.translateY(1);
        piece.translateZ(3.5);
    };

    blackInitial = function( piece ) {
        piece.translateX(-0.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
    };

    /*
     * Object load function for the Queens
     */
    var loadQueen = function( setcolor, startpos ) {
        loader.load('models/queen.obj', 'models/queen.mtl', function( object ) {
            var queen = object;
            // Only one king
            setcolor(queen);
            startpos(queen);
            scalePiece(queen);

            board.add(queen);
        });
    };

    /*
     * Generate the Queens
     */
    loadQueen(setWhite, whiteInitial);
    loadQueen(setBlack, blackInitial);

    /*
     * King loading functions
     */
    whiteInitial = function( piece ) {
        piece.translateX(0.5);
        piece.translateY(1);
        piece.translateZ(3.5);
    };

    blackInitial = function( piece ) {
        piece.translateX(0.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
    };

    /*
     * Object load function for the Kings
     */
    var loadKing = function( setcolor, startpos ) {
        loader.load('models/king.obj', 'models/king.mtl', function( object ) {
            var king = object;
            // Only one king
            setcolor(king);
            startpos(king);
            scalePiece(king);

            board.add(king);
        });
    };

    /*
     * Generate the Kings
     */
    loadKing(setWhite, whiteInitial);
    loadKing(setBlack, blackInitial);
};
