/**
 * Defines a basic chess board and functions for interacting with it
 * 
 * @param scene
 *            The scene that this board will attach to
 * @param afterload
 *            The function to execute after the board is loaded
 */
function Board(scene, afterload) {
    this.downloadedModels = {};
    this.customModels = {};
    this.currentModels = 0; // 0 for custom, 1 for downloaded

    // No generated pieces yet
    this.pieces = { };

    // Captured pieces positions
    // TODO Separate w/b
    this.captureXMin = -4.5;
    this.captureXMax = 4.5;
    this.captureZMin = -4.5;
    this.captureZMax = 4.5;
    this.captureX = -4.5;
    this.captureZ = 4.5;

    this.boardFrame = null;
    this.boardSquares = [ ];

    this.moveQueue = [ ];
    // True if the board is executing a move sequence
    this.working = false;

    // The 3D board object, Board intial load code by @evan
    this.board = new THREE.Object3D();
    var board = this.board;
    this.CASTLING_MOVES = [ 'e8c8', 'e8g8', 'e1g1', 'e1c1' ];

    // Stores cloneable pieces/clone functions for promotion
    // indexed by piece character, "R", "N", "Q", "B" for
    // rook, knight, queen, bishop, with "W", or "B" for the color
    // Initialized in loadPieces, called using
    // this.cloneLibrary["R"]["W"(position) where position is a square string
    // e.g. a1
    this.cloneLibrary =
    {
        "R" : { },
        "Q" : { },
        "N" : { },
        "B" : { }
    };

    // Closure for adding pieces to the board
    var self = this;

    var endcolor = 0xFFFFFF;

    // Data for the particle cloud generated at the destination location of
    // a captured piece
    this.capture_ldata =
    {
        se :
        {
            // Bounding boxes for external/internal
            'start' : [ .5, 1, .5 ],
            'end' : [ 2, 4, 2 ],
        },
        cloud :
        {
            // Speed, # of particles, color, size
            'velocity' : .035,
            'count' : 2000,
            'color' : endcolor,
            'size' : .2,
            'fade_rate' : -0.01,
            'alpha' : .02,
        },
        decay :
        {
            'start' : 20,
            'rate' : .1,
        }
    };

    // Particle cloud to generate at piece destination for movement
    this.move_ldata =
    {
        se :
        {
            // Bounding boxes for external/internal
            'start' : [ 1, 2, 1 ],
            'end' : [ 2, 18, 2 ],
        },
        cloud :
        {
            // Speed, # of particles, color, size
            'velocity' : .16,
            'count' : 2000,
            'color' : endcolor,
            'size' : .1,
        },
        decay :
        {
            // start decay after 7 frames, 10% of particles
            // culled per frame
            'start' : 7,
            'rate' : .1,
        }
    };

    this.move_sdata =
    {
        se :
        {
            // Bounding boxes for external/internal
            'start' : [ 2, 4, 2 ],
            'end' : [ .5, 1, .5 ],
        },
        cloud :
        {
            // Speed, # of particles, color, size
            'velocity' : .055,
            'count' : 2000,
            'color' : 0x0,
            'size' : .4,
            'fade_rate' : -0.01,
            'alpha' : .02,
        },
        decay :
        {
            'start' : 50,
            'speed_delta' :
            {
                'x' : .02,
                'y' : .02,
                'z' : .02
            },
        }
    };

    // Get a loader for our models
    var loader = new THREE.OBJMTLLoader();

    // Load in the Board data itself
    loader.load('models/boardBlocks.obj', 'models/boardBlocks.mtl', function(
            object) {
        // marble texture provided by 
        // http://www.designyourway.net/drb/useful-free-marble-textures-for-cg-artists-and-not-only/
        var texture = THREE.ImageUtils.loadTexture("textures/marble.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material.map = texture;
                child.material.color.setRGB(1, 1, 1);
            }
        });
        board.add(object);
        self.boardSquares.push(object);

        // black spaces
        var cloned = cloneObj(object);
        cloned.traverse(function( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material.map = texture;
                child.material.color.setRGB(0.1, 0.1, 0.1);
            }
        });
        cloned.rotateY(Math.PI / 2); // 90 degrees
        board.add(cloned);
        self.boardSquares.push(cloned);

        // Now load in the frame
        loader.load('models/boardFrame.obj', 'models/boardFrame.mtl', function(
                object ) {
            // Prevents overlap with the tiles
            object.translateY(-0.01);
            // Make it a kind of wood color for now
            // Dark wood: 133;94;66 RGB

            // load a texture, set wrap mode to repeat
            // texture from:
            // http://www.tutorialsforblender3d.com/Textures/Marble/Marble_Rendered_1.html
            var texture = THREE.ImageUtils
                    .loadTexture("textures/BloodMarble.png");
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(16, 16);
            object.traverse(function( child ) {
                if ( child instanceof THREE.Mesh ) {
                    // child.material.color.setRGB(133 / 256, 94 / 256, 66 /
                    // 256);
                    child.material.color.setRGB(0.0, 0.1, 0.1);
                    child.material.map = texture;
                }
            });
            board.add(object);
            self.boardFrame = object;
            // Now that the board layout is done, put the pieces on it
            self.loadPieces(afterload);
        });
    });

    // Add it to the passed-in scene
    scene.add(this.board);

};

/**
 * Queues up a move for the board
 * 
 * @param piece
 *            The piece code of the move
 * @param move
 *            The move set string e.g. "a7b2"
 */
Board.prototype.queueMove = function( piece, move ) {
    this.moveQueue.push(
    {
        'p' : piece,
        'm' : move
    });
    if ( !this.working ) {
        this.working = true;
        var self = this;
        // Sort of spin off a thread, this isn't the "right" way to do it with
        // web-workers & etc. but it's good enough for now
        setTimeout(function( ) {
            self.executeMove();
        }, 0);
    }
};

/**
 * Runs through the move queue
 */
Board.prototype.executeMove = function( ) {
    if ( this.moveQueue.length > 0 ) {
        // Dequeue the move
        var move = this.moveQueue.shift();
        var piece = move['p'];
        move = move['m'];
        var promote = undefined;
        if ( move.length == 5 ) {
            // It's a promotion
            promote = move[4];
        }

        // Check for castling
        if ( piece == "K" && ( this.CASTLING_MOVES.indexOf(move) != -1 ) ) {
            // Castling
            var s = move.slice(0, 2);
            var e = move.slice(2);

            var self = this;

            setTimeout(function( ) {
                // Moving the king
                self.movePiece(s, e, piece, promote, true);
            }, 0);

            // Moving the rook
            if ( e[0] == 'c' )
                // Queenside rook @a# to d#, e[1] is column #
                this.movePiece('a' + e[1], 'd' + e[1], piece);
            else
                // Kingside rook @h# to f#
                this.movePiece('h' + e[1], 'f' + e[1], piece);
        }
        else {
            var s = move.slice(0, 2);
            var e = ( promote ) ? move.slice(2, 4) : move.slice(2);

            // Cut into first two/last two characters of move string and execute
            if ( !this.movePiece(s, e, piece, promote) ) {
                console.log("move failed: " + piece + move);
            }
        }
    }
    else {
        // Queue is empty, so not working
        this.working = false;
    }
};

/**
 * Moves a piece from a position on the board to a new position
 * 
 * @param start
 *            The start position of the piece in the form "a7" etc.
 * @param end
 *            The end position of the piece
 * @param promotion
 *            The piece to promote to if it is a promotion
 * @param code
 *            The piece code, eg "Pawn"
 * @param promotion
 *            Set to the string for the promotion if promoting
 * @param stop_after
 *            Indicates if the next move waiting after this one should be
 *            executed. Used for castling
 */
Board.prototype.movePiece = function( start, end, code, promotion, stop_after ) {

    if ( start in this.pieces ) {
        var self = this;

        // Animation complete callback function
        var nxtMove = function( ) {
            if ( !stop_after )
                // Do the next move after the animation completes
                self.executeMove();
        };

        var start_coords = this.calcXYZ(start);
        var end_coords = this.calcXYZ(end);

        var dz = end_coords['z'] - start_coords['z'];
        var dx = end_coords['x'] - start_coords['x'];

        // Get the piece from the piece map
        var piece = this.pieces[start];
        // Capturing if dest is already occupied
        var capturing = ( end in self.pieces );

        var enpassant = false;
        
        if ( code == "P" && !capturing && dx != 0 ) {
            // It's a pawn, it moved diagonal, AND there is no piece at its
            // destination
            // Therefore it's an enpassant capture
            enpassant = true;
            capturing = true;
        }

        var endcolor = 0xFFFFFF;
        if ( capturing ) {
            endcolor = 0xFF0000;
        }

        // Update cloud colors
        self.move_ldata.cloud.color = endcolor;
        self.capture_ldata.cloud.color = endcolor;

        // Function to execute after first animation completes
        var inbetween = function( ) {
            if ( capturing ) {
                var cpiece;
                var ccoords = end.slice(0);
                var cr_coords;

                if ( enpassant ) {
                    ccoords = ccoords.split('');
                    
                    // Pick the piece in the appropriate direction
                    if ( dz < 0 ) {
                        // Moving white, pick the piece back one row
                        ccoords[1] = parseInt(ccoords[1]) - 1;
                    }
                    else {
                        // Moving black, pick the piece up one row
                        ccoords[1] = parseInt(ccoords[1]) + 1;
                    }
                    
                    ccoords = ccoords.join('');
                }
                
                // capture, just pick the piece at the dest
                cpiece = self.pieces[ccoords];
                delete self.pieces[ccoords];

                var coords =
                {
                    x : self.captureX,
                    y : 1.5,
                    z : self.captureZ
                };

                // Make a particle cloud to show the piece landing in the
                // capture area
                new ParticleField(coords, self.board, undefined, -1, 0,
                        'sphere', self.capture_ldata.se,
                        self.capture_ldata.cloud, self.capture_ldata.decay);

                // Move piece to capture area
                // Calculate distance
                cr_coords = self.calcXYZ(ccoords);
                var cdx = self.captureX - cr_coords.x;
                var cdz = self.captureZ - cr_coords.z;

                // Move piece
                cpiece.move(cdx, cdz);

                if ( self.captureX == self.captureXMax ) {
                    // Placed a piece in the last position on x
                    self.captureX = self.captureXMin;
                    self.captureZ -= 1;
                }
                else {
                    if ( !( self.captureZ == self.captureZMin )
                            && !( self.captureZ == self.captureZMax ) ) {
                        // Placing on edge
                        self.captureX = self.captureXMax;
                    }
                    else {
                        // Placing on front/back row
                        self.captureX += 1;
                    }
                }

            }

            // Generate the destination particle field
            new ParticleField(self.calcXYZ(end), self.board, nxtMove, -1, 250,
                    'sphere', self.move_ldata.se, self.move_ldata.cloud,
                    self.move_ldata.decay);

            // Normal move
            if ( !promotion ) {
                piece.move(dx, dz);
            }
            else {
                // Do the promotion
                self.board.remove(piece);
                // Check color, if moving in -z, then white
                if ( dz < 0 ) {
                    piece = self.cloneLibrary[promotion]["W"](end);
                }
                else {
                    piece = self.cloneLibrary[promotion]["B"](end);
                }
            }

            // Remove the old piece @ old position
            delete self.pieces[start];
            // Put it in the new position
            self.pieces[end] = piece;

        };

        // Make the pretty particle effects
        // Make a cloud, expand outwards, after finish: call inbetween, max
        // duration of effect is 1s, wait 0ms before executing inbetween
        new ParticleField(self.calcXYZ(start), self.board, inbetween, 60, 0,
                'sphere', self.move_sdata.se, self.move_sdata.cloud,
                self.move_sdata.decay);
        return true;
    }
    else {
        console.log("No piece @ " + start);
        console.log(this.pieces);
        return false;
    }
};

/**
 * Calculates the X/Z position based on the position string
 * 
 * @param position
 *            the position string using standard notation
 * @return A map of {x: x_coord, z: z_coord}
 */
Board.prototype.calcXYZ = function( position ) {
    // a1 is at -3.5 x, 3.5 z
    var a1_x = -3.5;
    var a1_z = 3.5;

    // Calculate offset from a1
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

    // a1 - dest_pos + base_a1_value == Z coord of position
    var z = 1 - position[1] + a1_z;

    // dest_pos - a1 + base_a1_value == X coord of position
    var x = map[position[0]] - 1 + a1_x;

    var res =
    {
        'x' : x,
        'y' : 1.5,
        'z' : z
    };

    return res;
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
    // http://www.designyourway.net/drb/useful-free-marble-textures-for-cg-artists-and-not-only/
    var texture = THREE.ImageUtils.loadTexture("textures/marble.jpg");
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    var setWhite = function (object) {
        object.pieceColor = 0;
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material.map = texture;
                child.material.color.setRGB(0.9, 0.9, 0.9);
            }
        });
    };

    var setBlack = function (object) {
        object.pieceColor = 1;
        object.traverse(function( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material.map = texture;
                child.material.color.setRGB(.10, .10, .10);
            }
        });
    };

    var scalePiece = function( piece ) {
        piece.scale.x = 0.40;
        piece.scale.y = 0.40;
        piece.scale.z = 0.40;
    };

    var map = [ "a", "b", "c", "d", "e", "f", "g", "h" ];

    /*
     * Pawn-specific loading functions
     */
    var whiteInitial = function (piece, pos) {
        piece.translateX(-3.5);
        piece.translateY(1);
        piece.translateZ(2.5);
        // White starts at a2
        pos[0] = 'a';
        pos[1] = 2;
    };

    var blackInitial = function (piece, pos) {
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
        loader.load('models/pawn.obj', 'models/pawn.mtl', function (object) {
            self.customModels.pawn = object;
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
            pawn.name = "P";

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
                pawn.name = "P";

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
        loader.load('models/rook.obj', 'models/rook.mtl', function (object) {
            self.customModels.rook = object;
            var rook = object;
            rook.move = simpleMove;
            rook.name = "R";

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
            rook.name = "R";
            // Move to other side of board
            rook.translateX(7);
            // h1 or h8
            pos[0] = 'h';
            // Add it to the board
            board.add(rook);
            self.pieces[pos.join('')] = rook;
            pieceCount++;

            // row 1 if white
            var color = ( pos[1] == 1 ) ? "W" : "B";

            var initial = pos.join('');
            var rookclone = rook.clone();

            // Store a clone function so it can be used in promotions
            self.cloneLibrary["R"][color] = function( position ) {
                // this.rook will be set outside of this later
                var rook = rookclone.clone();
                rook.move = move;
                rook.name = "R";

                // Start is always going to be pos, since this.rook is the rook
                // previous
                var start_coords = self.calcXYZ(initial);
                var end_coords = self.calcXYZ(position);

                var dz = end_coords['z'] - start_coords['z'];
                var dx = end_coords['x'] - start_coords['x'];

                // Put the rook in the right place
                rook.move(dx, dz);
                board.add(rook);

                self.pieces[position] = rook;
            };

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
                function (object) {
                    self.customModels.knight = object;
                    var knight = object;
                    var pos = [ ];
                    knight.move = kMove;
                    knight.name = "N";
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
                    knight.name = "N";
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

                    // row 1 if white
                    var color = ( pos[1] == 1 ) ? "W" : "B";

                    var initial = pos.join('');
                    var knightclone = knight.clone();

                    // Store a clone function so it can be used in promotions
                    self.cloneLibrary["N"][color] = function( position ) {
                        // this.knight will be set outside of this later
                        var knight = knightclone.clone();
                        knight.move = kMove;
                        knight.rotate = dorotation;
                        knight.resetRotation = resetrotation;
                        knight.name = "N";

                        // Start is always going to be pos, since this.knight is
                        // the knight previous
                        var start_coords = self.calcXYZ(initial);
                        var end_coords = self.calcXYZ(position);

                        var dz = end_coords['z'] - start_coords['z'];
                        var dx = end_coords['x'] - start_coords['x'];

                        // Put the knight in the right place
                        knight.move(dx, dz);
                        board.add(knight);

                        self.pieces[position] = knight;
                    };

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
                function (object) {
                    self.customModels.bishop = object;
                    var bishop = object;
                    var pos = [ ];

                    bishop.move = bMove;
                    bishop.name = "B";
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
                    bishop.name = "B";
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

                    // row 1 if white
                    var color = ( pos[1] == 1 ) ? "W" : "B";

                    var bishopclone = bishop.clone();
                    var initial = pos.join('');

                    // Store a clone function so it can be used in promotions
                    self.cloneLibrary["B"][color] = function( position ) {
                        // this.bishop will be set outside of this later
                        var bishop = bishopclone.clone();
                        bishop.move = bMove;
                        bishop.rotate = dorotation;
                        bishop.resetRotation = resetrotation;
                        bishop.name = "B";

                        // Start is always going to be pos, since this.bishop is
                        // the bishop previous
                        var start_coords = self.calcXYZ(initial);
                        var end_coords = self.calcXYZ(position);

                        var dz = end_coords['z'] - start_coords['z'];
                        var dx = end_coords['x'] - start_coords['x'];

                        // Put the bishop in the right place
                        bishop.move(dx, dz);
                        board.add(bishop);

                        self.pieces[position] = bishop;
                    };

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
        loader.load('models/queen.obj', 'models/queen.mtl', function (object) {
            self.customModels.queen = object;
            var queen = object;
            var pos = [ ];

            queen.move = move;
            queen.name = "Q";

            // Only one king
            setcolor(queen);
            startpos(queen, pos);
            scalePiece(queen);

            board.add(queen);
            self.pieces[pos.join('')] = queen;
            pieceCount++;

            // row 1 if white
            var color = ( pos[1] == 1 ) ? "W" : "B";

            var clonequeen = queen.clone();
            var initial = pos.join('');

            // Store a clone function so it can be used in promotions
            self.cloneLibrary["Q"][color] = function( position ) {
                // this.queen will be set outside of this later
                var queen = clonequeen.clone();
                queen.move = move;
                queen.name = "Q";

                // Start is always going to be pos, since this.queen is
                // the queen previous
                var start_coords = self.calcXYZ(initial);
                var end_coords = self.calcXYZ(position);

                var dz = end_coords['z'] - start_coords['z'];
                var dx = end_coords['x'] - start_coords['x'];

                // Put the queen in the right place
                queen.move(dx, dz);
                board.add(queen);

                self.pieces[position] = queen;
            };

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
        loader.load('models/king.obj', 'models/king.mtl', function (object) {
            self.customModels.king = object;
            var king = object;
            var pos = [ ];

            king.move = move;
            king.name = "K";

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

    // add functionality for other models
    self.loadOtherModels(loader);
};

/**
 * Loads in a single piece based on a piece code
 * 
 * @param x
 *            The x coordinate to load the piece at
 * @param y
 *            The y coordinate to load the piece at
 * @param piece
 *            A string representing the piece to load
 */

/**
 * Executes any animations that need to happen for piece movement/misc. actions
 */
Board.prototype.animate = function( ) {
    for ( var i = 0; i < this.board.children.length; ++i ) {

        var object = this.board.children[i];

        if ( object instanceof THREE.ParticleSystem ) {
            object.update();
        }
    }
};

// Have different texture "themes"
// theme can be either "marble" or "wood"
Board.prototype.switchTheme = function (theme) {
    if (theme == "wood") {
        // update datgui var
        datView.Marble = false;
        datView.Wood = true;

        // http://webtreats.mysitemyway.com/greyscale-natural-grunge-textures/
        var texture = THREE.ImageUtils
                .loadTexture("textures/grunge/greyscale_natural_grunge1.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);
        this.boardFrame.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.7, 0.2, 0.1);
            }
        });

        // http://webtreats.mysitemyway.com/greyscale-natural-grunge-textures/
        var texture = THREE.ImageUtils
                .loadTexture("textures/grunge/greyscale_natural_grunge1.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        this.boardSquares[0].traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.7, 0.2, 0.1);
            }
        });
        this.boardSquares[1].traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.1, 0.0, 0.0);
            }
        });

        texture = THREE.ImageUtils
                .loadTexture("textures/grunge/greyscale_natural_grunge4.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        for (var piece in this.pieces) {
            this.pieces[piece].traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material.map = texture;
                }
            });
        }
    }
    else {
        // update datgui var
        datView.Marble = true;
        datView.Wood = false;
        // texture from 
        // http://www.tutorialsforblender3d.com/Textures/Marble/Marble_Rendered_1.html
        var texture = THREE.ImageUtils.loadTexture("textures/BloodMarble.png");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(16, 16);
        this.boardFrame.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.0, 0.1, 0.1);
            }
        });
        // http://www.designyourway.net/drb/useful-free-marble-textures-for-cg-artists-and-not-only/
        var texture = THREE.ImageUtils.loadTexture("textures/marble.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        this.boardSquares[0].traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.9, 0.9, 0.9);
            }
        });
        this.boardSquares[1].traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.color.setRGB(0.1, 0.1, 0.1);
            }
        });
        // http://www.designyourway.net/drb/useful-free-marble-textures-for-cg-artists-and-not-only/
        texture = THREE.ImageUtils.loadTexture("textures/marble1.jpg");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        for (var piece in this.pieces) {
            this.pieces[piece].traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material.map = texture;
                }
            });
        }
    }
};

// These models were downloaded from http://www.turbosquid.com/
Board.prototype.loadOtherModels = function (loader) {
    var self = this;

    loader.load('models/downloaded/King.obj', 'models/downloaded/King.mtl', function (object) {
        self.downloadedModels.king = object;
    });
    loader.load('models/downloaded/Queen.obj', 'models/downloaded/Queen.mtl', function( object ) {
        self.downloadedModels.queen = object;
    });
    loader.load('models/downloaded/Rook.obj', 'models/downloaded/Rook.mtl', function( object ) {
        self.downloadedModels.rook = object;
    });
    loader.load('models/downloaded/Bishop.obj', 'models/downloaded/Bishop.mtl', function( object ) {
        self.downloadedModels.bishop = object;
    });
    loader.load('models/downloaded/Knight.obj', 'models/downloaded/Knight.mtl', function( object ) {
        self.downloadedModels.knight = object;
    });
    loader.load('models/downloaded/Pawn.obj', 'models/downloaded/Pawn.mtl', function( object ) {
        self.downloadedModels.pawn = object;
    });
};

// replace geometries
Board.prototype.swapModels = function () {
    var models = this.downloadedModels;
    
    if (this.currentModels === 1) {
        models = this.customModels;
        this.currentModels = 0;
    }
    else
        this.currentModels = 1;

    if (models.king && models.queen && models.rook && models.bishop && models.knight && models.pawn) {
        var pieces = this.pieces;
        for (var i in pieces) {
            if (pieces[i]) {
                var model;
                switch (pieces[i].name) {
                    case 'P':
                        model = models.pawn;
                        break;
                    case 'R':
                        model = models.rook;
                        break;
                    case 'N':
                        model = models.knight;
                        break;
                    case 'B':
                        model = models.bishop;
                        break;
                    case 'Q':
                        model = models.queen;
                        break;
                    case 'K':
                        model = models.king;
                        break;
                    default:
                        console.log('invalid name');
                        return;
                }

                // find the color of the piece we're changing
                // when the mesh is changed it does not save the material
                var color;
                pieces[i].traverse(function (child) {
                    if (child instanceof THREE.Mesh)
                        color = child.material.color.r;
                })
                model = cloneObjMtl(model);

                // remove all children parts of piece
                for (var child = pieces.length - 1; child >= 0; child--) {
                    pieces[i].remove(child);
                }
                // and replace them with the new model meshes
                model.traverse(function (child) {
                    if (child instanceof THREE.Mesh) {
                        child.material.color.setRGB(color, color, color);
                        child.material.needsUpdate = true;
                    }
                    pieces[i].add(child);
                });
                // rescale pieces and rotate knights and bishops to be correct
                if (this.currentModels === 1) {
                    pieces[i].scale.z = pieces[i].scale.y = pieces[i].scale.x = 0.05;
                    if (pieces[i].name == 'N')
                        pieces[i].rotateY(Math.PI / 2);
                    else if (pieces[i].name == 'B')
                        pieces[i].rotateY(Math.PI);
                }
                else {
                    pieces[i].scale.z = pieces[i].scale.y = pieces[i].scale.x = 0.4;
                }
            }
        }
    }
    else
        alert("Please wait for all of the models to load");
};
