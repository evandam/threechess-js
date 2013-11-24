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
 * @param on_complete
 *            The function to call after the animation completes
 */
function ParticleField( from, to, color_start, color_end, duration, scene,
        s1_complete, s2_complete ) {

    var self = this;
    // For removing objects
    this.parent = scene;

    this.s1_complete = s1_complete;
    this.s2_complete = s2_complete;

    // Indicates if rendering field 1 or 2
    this.rendering1 = true;

    // Record from/to for particle movement
    var xz = this.calcXZ(from);
    this.f_x = xz['x'];
    this.f_z = xz['z'];

    xz = this.calcXZ(to);
    this.t_x = xz['x'];
    this.t_z = xz['z'];

    // Speed to move particles to/from the center
    this.VELOCITY = .1;

    // Number of particles to fill in the square
    this.PARTICLE_COUNT = 5000;
    // This is small enough to look nice
    this.PARTICLE_SIZE = .01;

    // Used so that no seizures result from debug code
    // this.last_update = Date.now();

    // Distance to edges
    this.EDGE_DISTS = [ 2, 4, 2 ];

    // Lifts the center of the field along the y-axis so it's not inside the
    // board
    this.y_base = 1 + .5;
    this.y_V_MULTIPLIER = 2;

    // The particle field for the start square
    this.pfield1 = new THREE.Geometry();
    // The particle field for the end square
    this.pfield2 = new THREE.Geometry();

    this.pfield1_mat = new THREE.ParticleSystemMaterial(
    {
        color : color_start,
        size : self.PARTICLE_SIZE
    });

    this.pfield2_mat = new THREE.ParticleSystemMaterial(
    {
        color : color_end,
        size : self.PARTICLE_SIZE
    });

    // Make the start particle field
    this.genParticles(this.f_x, this.f_z, this.pfield1, false);
    // Make the end particle field
    this.genParticles(this.t_x, this.t_z, this.pfield2, true);

    // Make the systems
    this.psys1 = new THREE.ParticleSystem(this.pfield1, this.pfield1_mat);
    this.psys1.sortParticles = true;
    this.psys1.frustumCulled = true;

    this.psys2 = new THREE.ParticleSystem(this.pfield2, this.pfield2_mat);
    this.psys2.sortParticles = true;
    this.psys2.frustumCulled = true;

    this.psys1.update = function( ) {
        self.update();
    };
    this.psys2.update = function( ) {
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
 * Generates a new particle field centered on x/z coords and stores it in the
 * pfield variable
 * 
 * @param x_center
 *            The center of the particle field on the x-axis
 * @param z_center
 *            The center of the field on the z-axis
 * @param pfield
 *            The field to build
 * @param explode
 *            true if the field should move from the inside out
 */
ParticleField.prototype.genParticles = function( x_center, z_center, pfield,
        explode ) {
    // The start positions of the particles
    var p_xyz = [ ];
    // The destination positions of the particles
    var dest_xyz = [ ];
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
                // Go in the -axis direction from the center
                p_xyz[i] = -p_xyz[i];
                // This ratio makes sure all particles animate smoothly from
                // start to finish and don't form bands
                velocities[i] = this.VELOCITY * p_xyz[i] / this.EDGE_DISTS[i];
                // In the - direction, so move in the + direction
                signs[i] = 1;
            }
            else {
                p_xyz[i] = p_xyz[i];
                velocities[i] = -this.VELOCITY * p_xyz[i] / this.EDGE_DISTS[i];
                signs[i] = -1;
            }
        }

        // p_xyz is relative distance from center, convert to absolute
        // position
        p_xyz[0] += x_center;
        p_xyz[1] += this.y_base;
        p_xyz[2] += z_center;

        if ( explode ) {
            // Moving from the center
            // Reverse direction
            for ( var i = 0; i < 3; ++i ) {
                dest_xyz[i] = p_xyz[i];
                velocities[i] *= -1;
                signs[i] *= -1;
            }
            p_xyz = [ x_center, this.y_base, z_center ];
        }
        else {
            dest_xyz = [ x_center, this.y_base, z_center ];
        }

        // Set up the vector with the start position
        particle = new THREE.Vector3(p_xyz[0], p_xyz[1], p_xyz[2]);

        // Record velocity, make sure that y updates fast enough
        particle.velocity = new THREE.Vector3(velocities[0], velocities[1]
                * this.y_V_MULTIPLIER, velocities[2]);

        // Record the sign of the velocity for later computation simplicity
        particle.signs = new THREE.Vector3(signs[0], signs[1], signs[2]);

        // Record the destination position
        particle.dests = new THREE.Vector3(dest_xyz[0], dest_xyz[1],
                dest_xyz[2]);

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
    /*
     * if ( Date.now() - 500 > this.last_update ) { this.last_update =
     * Date.now(); this.pfield1_mat.color.setHex('0x' + Math.floor(Math.random() *
     * 16777215).toString(16)); }
     */

    var p = this.PARTICLE_COUNT;
    var field = ( this.rendering1 ) ? this.pfield1 : this.pfield2;

    var part;
    var complete = true;
    // this.psys1.rotateOnAxis('y', .01);

    while ( --p ) {
        // Get a particle
        part = field.vertices[p];
        // Stop moving when at center
        part.velocity.x = Math.min(Math.abs(part.velocity.x), Math
                .abs(part.dests.x - part.x));
        part.velocity.y = Math.min(Math.abs(part.velocity.y), Math
                .abs(part.dests.y - part.y));
        part.velocity.z = Math.min(Math.abs(part.velocity.z), Math
                .abs(part.dests.z - part.z));
        // Reset the sign of the movement
        part.velocity.multiplyVectors(part.velocity, part.signs);
        // Change position
        part.add(part.velocity);

        if ( !( part.velocity.x == 0 && part.velocity.y == 0 && part.velocity.z == 0 ) ) {
            complete = false;
        }
    }

    if ( complete ) {
        if ( this.rendering1 ) {
            // Remove the first particle field
            this.parent.remove(this.psys1);
            // Add the second
            this.parent.add(this.psys2);
            this.rendering1 = false;
            // Execute s1 callback
            this.s1_complete();
        }
        else {
            this.parent.remove(this.psys2);
            // Callback to indicate that animation has finished
            this.s2_complete();
        }

    }
};
