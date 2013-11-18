/**
 * Defines a basic chess board and functions for interacting with it
 * 
 * @param scene
 *            The scene that this board will attach to
 * @param afterload
 *            The function to execute after the board is loaded
 */
function Board( scene, afterload ) {
    // No generated pieces yet
    this.pieces = { };

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
        self.loadPieces(afterload);
    });

    // Add it to the passed-in scene
    scene.add(this.board);
};

/**
 * Moves a piece from a position on the board to a new position
 * 
 * @param start
 *            The start position of the piece in the form "a7" etc.
 * @param end
 *            The end position of the piece
 */
Board.prototype.movePiece = function( start, end ) {

    if ( start in this.pieces ) {

        // Map of chars to numbers for get dy
        // maybe could be cleaned up later
        var map =
        {
            'a' : 1,
            'b' : 2,
            'c' : 3,
            'd' : 4,
            'e' : 5,
            'f' : 6,
            'g' : 7,
            'h' : 8
        };

        var getDZ = function( s, e ) {
            return -( e - s );
        };

        var getDX = function( s, e ) {
            return map[e] - map[s];
        };

        // Get the piece from the piece map
        var piece = this.pieces[start];
        piece.move(getDX(start[0], end[0]), getDZ(start[1], end[1]));
        // TODO Handle captures/pieces landing on same square
        // Remove the old piece @ old position
        delete this.pieces[start];
        // Put it in the new position
        this.pieces[end] = piece;
    }
    else {
        console.log("No piece @ " + start);
        console.log(this.pieces);
    }
};

/**
 * Adds pieces to the board for display
 * 
 * @param afterload
 *            The function to execute after loading is complete
 */
Board.prototype.loadPieces = function( afterload ) {
    // Get an object loader
    var loader = new THREE.OBJMTLLoader();
    var board = this.board;
    var self = this;

    var pieceCount = 0;

    var checkLoaded = function( ) {
        // If everything is loaded, done
        if ( pieceCount == 32 )
            afterload();
    };

    var setWhite = function( object ) {
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(1, 1, 1);
        });
    };

    var setBlack = function( object ) {
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh )
                child.material.color.setRGB(.10, .10, .10);
        });
    };

    var scalePiece = function( piece ) {
        piece.scale.x = 0.50;
        piece.scale.y = 0.50;
        piece.scale.z = 0.50;
    };

    var map = [ "a", "b", "c", "d", "e", "f", "g", "h" ];

    /*
     * Pawn-specific loading functions
     */
    var whiteInitial = function( piece, pos ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(2.5);
        // White starts at a2
        pos[0] = 'a';
        pos[1] = 2;
    };

    var blackInitial = function( piece, pos ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(-2.5);
        // Black starts at a7
        pos[0] = 'a';
        pos[1] = 7;
    };

    // Pawn movement function
    var simpleMove = function( dx, dz ) {
        if ( dx )
            this.translateX(dx);
        if ( dz )
            this.translateZ(dz);
    };

    /*
     * The actual object load method for creating the pawns
     */
    var loadPawns = function( setcolor, startpos ) {
        // Load in the pieces, starting with the pawns
        loader.load('models/pawn.obj', 'models/pawn.mtl', function( object ) {
            // Make the pawns
            var pawn = object;
            var pos = [ ];

            // Set up the first one
            setcolor(pawn);
            scalePiece(pawn);

            // Move into position
            startpos(pawn, pos);
            // Move function for later
            pawn.move = simpleMove;

            // Add to the board
            board.add(pawn);
            // Store it so it can be moved
            self.pieces[pos.join('')] = pawn;
            pieceCount++;

            // Place the rest
            for ( var i = 1; i < 8; ++i ) {
                pos = [ map[i], pos[1] ];
                // Clone it
                pawn = pawn.clone();
                pawn.move = move;

                // Move it into place
                // Should probably be replaced by a call to the moveTo function
                // whenever that is created
                pawn.translateX(1);

                // Add it to the board
                board.add(pawn);
                self.pieces[pos.join('')] = pawn;
                pieceCount++;
            }

            checkLoaded();
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
    whiteInitial = function( piece, pos ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(3.5);
        // white starts at a1
        pos[0] = 'a';
        pos[1] = 1;
    };

    blackInitial = function( piece, pos ) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
        // black starts at a8
        pos[0] = 'a';
        pos[1] = 8;
    };

    /*
     * Object load method for the Rooks
     */
    var loadRooks = function( setcolor, startpos ) {
        loader.load('models/rook.obj', 'models/rook.mtl', function( object ) {
            var rook = object;
            rook.move = simpleMove;
            var pos = [ ];

            // Color and put in first position
            setcolor(rook);
            startpos(rook, pos);

            // Scale it appropriately
            scalePiece(rook);

            // Add it to the board
            board.add(rook);
            self.pieces[pos.join('')] = rook;
            pieceCount++;

            // Make the other rook
            rook = rook.clone();
            rook.move = move;
            // Move to other side of board
            rook.translateX(7);
            // h1 or h8
            pos[0] = 'h';
            // Add it to the board
            board.add(rook);
            self.pieces[pos.join('')] = rook;
            pieceCount++;

            checkLoaded();
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
    whiteInitial = function( piece, pos ) {
        piece.translateX(-2.5);
        piece.translateY(1);
        piece.translateZ(3.5);
        // b1
        pos[0] = 'b';
        pos[1] = 1;
    };

    blackInitial = function( piece, pos ) {
        piece.translateX(-2.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
        pos[0] = 'b';
        pos[1] = 8;
    };

    var whiteRotation = function( piece ) {
        piece.rotateY(Math.PI);
    };

    var resetWhiteRot = function( piece ) {
        piece.rotateY(-Math.PI);
    };

    var kMove = function( dx, dz ) {
        // Handle the fact that knights have to rotate
        if ( this.rotate ) {
            // reset
            this.resetRotation(this);
            // move
            if ( dx )
                this.translateX(dx);
            if ( dz )
                this.translateZ(dz);
            // re-rotate
            this.rotate(this);
        }
        else {
            // Just move
            if ( dx )
                this.translateX(dx);
            if ( dz )
                this.translateZ(dz);
        }
    };

    /*
     * Object load function for the knights
     */
    var loadKnights = function( setcolor, startpos, dorotation, resetrotation ) {
        loader.load('models/knight.obj', 'models/knight.mtl',
                function( object ) {
                    var knight = object;
                    var pos = [ ];
                    knight.move = kMove;
                    knight.rotate = dorotation;
                    knight.resetRotation = resetrotation;

                    // You know the drill
                    setcolor(knight);
                    startpos(knight, pos);
                    scalePiece(knight);
                    board.add(knight);
                    self.pieces[pos.join('')] = knight;
                    pieceCount++;

                    if ( dorotation )
                        dorotation(knight);

                    // and the second
                    knight = knight.clone();
                    knight.move = kMove;
                    knight.rotate = dorotation;
                    knight.resetRotation = resetrotation;

                    // Clear the rotation for movement
                    if ( resetrotation )
                        resetrotation(knight);
                    // Move into position
                    knight.translateX(5);
                    // g1 or g8
                    pos[0] = 'g';
                    // Do the rotation
                    if ( dorotation )
                        dorotation(knight);
                    board.add(knight);
                    self.pieces[pos.join('')] = knight;
                    pieceCount++;

                    checkLoaded();
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
    whiteInitial = function( piece, pos ) {
        piece.translateX(-1.5);
        piece.translateY(1);
        piece.translateZ(3.5);
        pos[0] = 'c';
        pos[1] = 1;
    };

    blackInitial = function( piece, pos ) {
        piece.translateX(-1.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
        pos[0] = 'c';
        pos[1] = 8;
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

    var bMove = function( dx, dz ) {
        // Handle the fact that bishops have to rotate
        // reset
        this.resetRotation(this);
        // move
        if ( dx )
            this.translateX(dx);
        if ( dz )
            this.translateZ(dz);
        // re-rotate
        this.rotate(this);
    };

    /*
     * Object load function for the bishops
     */
    var loadBishops = function( setcolor, startpos, dorotation, resetrotation ) {
        loader.load('models/bishop.obj', 'models/bishop.mtl',
                function( object ) {
                    var bishop = object;
                    var pos = [ ];
                    
                    bishop.move = bMove;
                    bishop.rotate = dorotation;
                    bishop.resetRotation = resetrotation;

                    // You know the drill
                    setcolor(bishop);
                    startpos(bishop, pos);
                    scalePiece(bishop);
                    dorotation(bishop);

                    board.add(bishop);
                    self.pieces[pos.join('')] = bishop;
                    pieceCount++;

                    // and the second
                    bishop = bishop.clone();
                    bishop.move = bMove;
                    bishop.rotate = dorotation;
                    bishop.resetRotation = resetrotation;

                    resetrotation(bishop);
                    bishop.translateX(3);
                    // f1 or f8
                    pos[0] = 'f';

                    dorotation(bishop);
                    board.add(bishop);
                    self.pieces[pos.join('')] = bishop;
                    pieceCount++;

                    checkLoaded();
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
    whiteInitial = function( piece, pos ) {
        piece.translateX(-0.5);
        piece.translateY(1);
        piece.translateZ(3.5);
        pos[0] = 'd';
        pos[1] = 1;
    };

    blackInitial = function( piece, pos ) {
        piece.translateX(-0.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
        pos[0] = 'd';
        pos[1] = 8;
    };

    var move = function( dx, dz ) {
        if ( dx )
            this.translateX(dx);
        if ( dz )
            this.translateZ(dz);
    };

    /*
     * Object load function for the Queens
     */
    var loadQueen = function( setcolor, startpos ) {
        loader.load('models/queen.obj', 'models/queen.mtl', function( object ) {
            var queen = object;
            var pos = [ ];
            
            queen.move = move;

            // Only one king
            setcolor(queen);
            startpos(queen, pos);
            scalePiece(queen);

            board.add(queen);
            self.pieces[pos.join('')] = queen;
            pieceCount++;

            checkLoaded();
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
    whiteInitial = function( piece, pos ) {
        piece.translateX(0.5);
        piece.translateY(1);
        piece.translateZ(3.5);
        pos[0] = 'e';
        pos[1] = 1;
    };

    blackInitial = function( piece, pos ) {
        piece.translateX(0.5);
        piece.translateY(1);
        piece.translateZ(-3.5);
        pos[0] = 'e';
        pos[1] = 8;
    };

    /*
     * Object load function for the Kings
     */
    var loadKing = function( setcolor, startpos ) {
        loader.load('models/king.obj', 'models/king.mtl', function( object ) {
            var king = object;
            var pos = [ ];
            
            king.move = move;

            // Only one king
            setcolor(king);
            startpos(king, pos);
            scalePiece(king);

            board.add(king);
            self.pieces[pos.join('')] = king;
            pieceCount++;

            checkLoaded();
        });
    };

    /*
     * Generate the Kings
     */
    loadKing(setWhite, whiteInitial);
    loadKing(setBlack, blackInitial);
};
