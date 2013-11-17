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

    //Get a loader for our models
    var loader = new THREE.OBJMTLLoader();
    
    //Load in the Board data itself
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
    });
    
    //TODO Add in chess pieces to board
    
    //Add it to the passed-in scene
    scene.add(this.board);
};

/**
 * Adds pieces to the board for display
 */
Board.prototype.renderPieces = function() {
    
};
