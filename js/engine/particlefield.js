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
 * @param scene
 *            The parent rendering node to attach to
 * @param on_complete
 *            The function to call after the animation completes
 */
function ParticleField( from, to, color_start, color_end, scene, s1_complete,
        s2_complete ) {

    var self = this;
    // For removing objects
    this.parent = scene;
    // Time to wait before executing scene end in ms
    this.endWait = 250;

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
    this.PARTICLE_SIZE = .1;

    // Distance to edges
    this.EDGE_DISTS = [ 8, 16, 8 ];
    // Bounding box of piece
    this.BBOX_DISTS = [ 1, 2, 1 ];

    // Lifts the center of the field along the y-axis so it's not inside the
    // board
    this.y_base = 1 + .5;
    this.y_V_MULTIPLIER = this.EDGE_DISTS[1] / this.EDGE_DISTS[0];

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

    scene.add(this.psys1);
    setTimeout(function( ) {
        self.update();
    }, this.updateRate);
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
    var particle;

    var theta, phi;
    var theta2, phi2;

    var velocities = [ ];

    // Make the particles
    for ( var p = 0; p < this.PARTICLE_COUNT; ++p ) {

        theta = 2 * Math.PI * Math.random();
        phi = 2 * Math.asin(2 * Math.random() - 1);
        theta2 = 2 * Math.PI * Math.random();
        phi2 = 2 * Math.asin(2 * Math.random() - 1);

        // Start field radiates from outside in
        // Generating points on a unit circle
        p_xyz[0] = Math.cos(theta) * Math.cos(phi);
        p_xyz[1] = Math.sin(theta) * Math.cos(phi);
        p_xyz[2] = Math.sin(phi);
        // Generate destination points
        dest_xyz[0] = Math.cos(theta2) * Math.cos(phi2);
        dest_xyz[1] = Math.sin(theta2) * Math.cos(phi2);
        dest_xyz[2] = Math.sin(phi2);

        // Then stretching them along the axes so the match the elipse
        p_xyz[0] *= this.EDGE_DISTS[0];
        p_xyz[1] *= this.EDGE_DISTS[1];
        p_xyz[2] *= this.EDGE_DISTS[2];

        dest_xyz[0] *= this.BBOX_DISTS[0];
        dest_xyz[1] *= this.BBOX_DISTS[1];
        dest_xyz[2] *= this.BBOX_DISTS[2];

        for ( var i = 0; i < 3; ++i ) {
            // This ratio makes sure all particles animate smoothly from
            // start to finish and don't form bands
            // Negate the velocity so that it moves from start to dest
            velocities[i] = -this.VELOCITY * Math.abs(dest_xyz[i] - p_xyz[i])
                    / Math.abs(this.BBOX_DISTS[i] - this.EDGE_DISTS[i]);
        }

        // p_xyz is relative distance from center, convert to absolute
        // position
        p_xyz[0] += x_center;
        p_xyz[1] += this.y_base;
        p_xyz[2] += z_center;

        // Same for dest
        dest_xyz[0] += x_center;
        dest_xyz[1] += this.y_base;
        dest_xyz[2] += z_center;

        if ( explode ) {
            // Moving from the center
            // Reverse direction
            var temp = dest_xyz;
            dest_xyz = p_xyz;
            p_xyz = temp;
            for ( var i = 0; i < 3; ++i ) {
                velocities[i] *= -1;
            }
        }

        // Set up the vector with the start position
        particle = new THREE.Vector3(p_xyz[0], p_xyz[1], p_xyz[2]);

        // Record velocity, make sure that y updates fast enough
        particle.velocity = new THREE.Vector3(velocities[0], velocities[1]
                * this.y_V_MULTIPLIER, velocities[2]);

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

    var field = ( this.rendering1 ) ? this.pfield1 : this.pfield2;

    var part;
    var completed = true;

    // TODO Make this faster
    for ( var p = 0; p < this.PARTICLE_COUNT; ++p ) {
        // Get a particle
        part = field.vertices[p];
        // Stop moving when at dest, this updates velocity appropriately
        if ( part.dests.x > part.x ) {
            // Moving in positive x towards destination
            if ( part.velocity.x < 0 )
                part.velocity.x = -part.velocity.x;

            part.velocity.x = Math.min(part.velocity.x,
                    ( part.dests.x - part.x ));
        }
        else {
            // Moving in negative x towards destination
            // On the offchance the particle slides past the middle, change the
            // velocity so the calculation behaves properly
            if ( part.velocity.x > 0 )
                part.velocity.x = -part.velocity.x;

            part.velocity.x = Math.max(part.velocity.x,
                    ( part.dests.x - part.x ));
        }
        // Handle y movement
        if ( part.dests.y > part.y ) {
            // Moving in positive y towards destination
            if ( part.velocity.y < 0 )
                part.velocity.y = -part.velocity.y;

            part.velocity.y = Math.min(part.velocity.y,
                    ( part.dests.y - part.y ));
        }
        else {
            // Moving in negative y towards destination
            if ( part.velocity.y > 0 )
                part.velocity.y = -part.velocity.y;

            part.velocity.y = Math.max(part.velocity.y,
                    ( part.dests.y - part.y ));
        }
        // Handle z movement
        if ( part.dests.z > part.z ) {
            // Moving in positive z towards destination
            if ( part.velocity.z < 0 )
                part.velocity.z = -part.velocity.z;

            part.velocity.z = Math.min(part.velocity.z,
                    ( part.dests.z - part.z ));
        }
        else {
            // Moving in negative z towards destination
            if ( part.velocity.z > 0 )
                part.velocity.z = -part.velocity.z;

            part.velocity.z = Math.max(part.velocity.z,
                    ( part.dests.z - part.z ));
        }

        // Change position
        part.add(part.velocity);

        if ( !( part.velocity.x == 0 && part.velocity.y == 0 && part.velocity.z == 0 ) ) {
            // A particle is in position
            completed = false;
        }
    }

    if ( completed ) {
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
            // Use callback to indicate that animation has finished
            var self = this;
            this.parent.remove(self.psys2);

            setTimeout(function( ) {
                self.s2_complete();
            }, this.endWait);
        }
    }
};
