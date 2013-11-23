/**
 * Creates a 'teleportation' particle field for use during piece movement
 * 
 * @param from
 *            The square the piece is starting in
 * @param to
 *            The square the piece is moving to
 * @param color_start
 *            The hexidecimal color to use for the particles in the start square
 * @param color_end
 *            Same as above but for the destination square
 * @param duration
 *            The time in ms to leave the system running
 * @param scene
 *            The parent rendering node to attach to
 */
function ParticleField( from, to, color_start, color_end, duration, scene ) {

    var self = this;

    // Record from/to for particle movement
    var xz = this.calcXZ(from);
    this.f_x = xz['x'];
    this.f_z = xz['z'];

    xz = this.calcXZ(to);
    this.t_x = xz['x'];
    this.t_z = xz['z'];

    // Speed to move particles to/from the center
    this.VELOCITY = .05;

    // Number of particles to fill in the square
    this.PARTICLE_COUNT = 1000;
    // This is small enough to look nice
    this.PARTICLE_SIZE = .1;

    // Used so that no seizures result from debug code
    this.last_update = Date.now();

    // Distance to edges
    this.EDGE_DISTS = [ .5, 1, .5 ];

    // Lifts the center of the field along the y-axis so it's not inside the
    // board
    this.y_base = 1 + this.EDGE_DISTS[1];

    // The particle field for the start square
    this.pfield1 = new THREE.Geometry();

    this.pfield1_mat = new THREE.ParticleSystemMaterial(
    {
        color : color_start,
        size : self.PARTICLE_SIZE
    });

    // Make the start particle field
    this.genParticles(this.f_x, this.f_z, this.pfield1);

    this.psys1 = new THREE.ParticleSystem(this.pfield1, this.pfield1_mat);
    this.psys1.sortParticles = true;

    this.psys1.update = function( ) {
        self.update();
    };

    // TODO Set up logic to make particles flow inward
    scene.add(this.psys1);
    // TODO Set up timeout function to remove field from scene
}

/**
 * Calculates the X/Z position based on the position string
 * 
 * @param position
 *            the position string using standard notation
 * @return A map of {x: x_coord, z: z_coord}
 */
ParticleField.prototype.calcXZ = function( position ) {
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
        'z' : z
    };

    return res;
};

/**
 * Generates a new particle field centered on x/z coords and stores it in
 * the pfield variable
 * 
 * @param x_center The center of the particle field on the x-axis
 * @param z_center The center of the field on the z-axis
 * @param pfield The field to build
 * @param explode true if the field should move from the inside out
 */
ParticleField.prototype.genParticles = function( x_center, z_center, pfield, explode ) {
    var p_xyz = [ ];
    var edge, particle;

    var velocities = [ ];
    var signs = [ ];

    // Make the particles
    for ( var p = 0; p < this.PARTICLE_COUNT; ++p ) {
        // Start field radiates from outside in
        p_xyz[0] = Math.random() * this.EDGE_DISTS[0];
        p_xyz[1] = Math.random() * this.EDGE_DISTS[1];
        p_xyz[2] = Math.random() * this.EDGE_DISTS[2];

        // Pick the edge to start from
        edge = Math.round(Math.random() * 3);
        p_xyz[edge] = this.EDGE_DISTS[edge];

        // Randomize which side of the axis it's on
        for ( var i = 0; i < 3; ++i ) {
            // Only store the hundredth's place
            p_xyz[i] = Math.round(p_xyz[i] * 100) / 100;
            if ( Math.random() < .5 ) {
                p_xyz[i] = -p_xyz[i];
                velocities[i] = this.VELOCITY;
                signs[i] = 1;
            }
            else {
                p_xyz[i] = p_xyz[i];
                velocities[i] = -this.VELOCITY;
                signs[i] = -1;
            }

        }

        particle = new THREE.Vector3(x_center + p_xyz[0], this.y_base
                + p_xyz[1], z_center + p_xyz[2]);
        particle.velocity = new THREE.Vector3(velocities[0], velocities[1],
                velocities[2]);
        particle.signs = new THREE.Vector3(signs[0], signs[1], signs[2]);

        // Add it to the field
        pfield.vertices.push(particle);
    }
};

/**
 * Animates the particlefield movements
 */
ParticleField.prototype.update = function( ) {

    // Color randomizer from
    // from http://www.paulirish.com/2009/random-hex-color-code-snippets/
    // for debugging
    // Only update 1/s
    if ( Date.now() - 500 > this.last_update ) {
        this.last_update = Date.now();
        this.pfield1_mat.color.setHex('0x'
                + Math.floor(Math.random() * 16777215).toString(16));
    }

    var p = this.PARTICLE_COUNT;
    var part;
    // this.psys1.rotateOnAxis('y', .01);

    while ( --p ) {
        // Get a particle
        part = this.pfield1.vertices[p];
        // Stop moving when at center
        part.velocity.x = Math.min(Math.abs(part.velocity.x), Math.abs(this.f_x
                - part.x));
        part.velocity.y = Math.min(Math.abs(part.velocity.y), Math
                .abs(this.y_base - part.y));
        part.velocity.z = Math.min(Math.abs(part.velocity.z), Math.abs(this.f_z
                - part.z));
        //Reset the sign of the movement
        part.velocity.multiplyVectors(part.velocity, part.signs);
        //Change position
        part.add(part.velocity);
    }
};
