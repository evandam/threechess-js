/**
 * Creates a particle field with the specified attributes in 3d space The
 * creator of the field is responsible for scheduling the field's update
 * function
 * 
 * @param location
 *            The xyz coordinates of the center of the field
 * @param scene
 *            The rendering scene to attach to
 * @param on_complete
 *            A callback function to execute after the field has finished
 * @param duration
 *            The Number of frames to execute the animation for
 * @param delay_after
 *            The time in ms to wait before executing the callback function
 * @param field_shape
 *            The shape of the field, currently only 'sphere' is a choice
 * @param field_bounds
 *            The xyz distances from the center of the field that the particles
 *            can extend from the center of the field. Can specify both start
 *            bounding box and end bounding box. Specified by a map of
 *            {'start':[x, y, z], 'end':[x, y, z]}
 * @param particle_data
 *            Data on the type of particles to create. The options are specified
 *            by a map of {'velocity':Number, 'count':Number, 'size':Number,
 *            'randomize':Boolean, 'fade_rate':Number, 'alpha':Number}.
 *            Randomize defaults to false, if set to true the velocity of the
 *            particles will be Math.random() * velocity. Fade_rate defaults to
 *            0 if unset, otherwise it should be a number between 0 and 1
 *            indicating the change in alpha per frame. Alpha is the initial
 *            alpha value of the particles.
 * @param decay_values
 *            Sets data relating to particle decay rate. This takes the form of
 *            the map {'start':Number, 'rate':Number, 'speed_delta':{x:Number,
 *            y:Number, z:Number}} Where start is the delay in frames to wait
 *            before starting the decay. Rate is % of particles to cull per
 *            frame. speed_delta is the change in speed per frame. speed_delta
 *            should be a map of {x:rate, y:rate, z:rate}
 * @returns self
 */
function ParticleField( location, scene, on_complete, duration, delay_after,
        field_shape, field_bounds, particle_data, decay_values ) {

    var self = this;
    // For removing objects
    this.parent = scene;

    this.delay = delay_after;

    // Function to execute after field finishes animation
    this.on_complete = on_complete;

    // Shape of the field, affects how particles move
    this.type = field_shape;

    // XYZ Bounding box sizes of the fields
    // Starting field
    this.start_bounds = ( 'start' in field_bounds ) ? field_bounds.start : [ 8,
            8, 8 ];
    // Ending field
    this.end_bounds = ( 'end' in field_bounds ) ? field_bounds.end
            : [ 1, 1, 1 ];

    // Speed of the particles
    this.velocity = ( 'velocity' in particle_data ) ? particle_data.velocity
            : 1;

    // Normalized velocities to y velocity so things move smoothly
    this.v_normalized = [
            Math.abs(this.end_bounds[0] - this.start_bounds[0])
                    / Math.abs(this.end_bounds[1] - this.start_bounds[1]),
            1,
            Math.abs(this.end_bounds[2] - this.start_bounds[2])
                    / Math.abs(this.end_bounds[1] - this.start_bounds[1]) ];

    // Number of particles
    this.particles = ( 'count' in particle_data ) ? particle_data.count : 1000;

    // Color of particles
    this.color = ( 'color' in particle_data ) ? particle_data.color : 0x000000;

    // Size of the particle
    this.p_size = ( 'size' in particle_data ) ? particle_data.size : .1;

    // Handles fading out particles over time
    this.fade_rate = ( 'fade_rate' in particle_data ) ? particle_data.fade_rate
            : 0;

    // Should the velocity be randomized or not (will be a percentage of
    // this.velocity)
    this.randomize_v = ( 'randomize' in particle_data ) ? particle_data.randomize
            : false;

    // Center of the particle field
    this.x_center = location['x'];
    this.y_center = location['y'];
    this.z_center = location['z'];

    // The particle field
    this.pfield = new THREE.Geometry();

    // Make the shader material, allows more advanced manipulation of
    // colors/alphas
    // Need to create the dynamic alpha particle shaders
    // The 300.0 is there because every single example I could find used this
    // magic number with no explanation that I could find
    var vert_shader = "\
    		attribute float alpha; \
    		varying float vAlpha; \
            uniform float size; \
            void main() { \
                vAlpha = alpha; \
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); \
                gl_PointSize = size * (300.0 / length(mvPosition.xyz)); \
                gl_Position = projectionMatrix * mvPosition; \
                \
            }";
    var frag_shader = " \
            uniform vec3 color; \
            varying float vAlpha; \
            void main() { \
                gl_FragColor = vec4( color, vAlpha ); \
                \
            }";

    // attributes
    this.p_attributes =
    {
        alpha :
        {
            type : 'f',
            value : [ ]
        },
    };

    // uniforms
    this.p_uniforms =
    {
        size :
        {
            type : 'f',
            value : this.p_size
        },
        color :
        {
            type : "c",
            value : new THREE.Color(self.color)
        },
    };

    // particle system material
    this.pfield_mat = new THREE.ShaderMaterial(
    {
        uniforms : this.p_uniforms,
        attributes : this.p_attributes,
        vertexShader : vert_shader,
        fragmentShader : frag_shader,
        transparent : true
    });

    // Make the particle field
    if ( field_shape = 'sphere' ) {
        this.genSphere();
    }
    else {
        console.log("No such field");
    }

    // Make the system
    this.psys = new THREE.ParticleSystem(this.pfield, this.pfield_mat);
    this.psys.sortParticles = true;
    this.psys.frustumCulled = true;

    var alphastart = ( 'alpha' in particle_data ) ? particle_data.alpha : 1;
    // If initial is zero somehow, just make it tiny
    alphastart = ( alphastart ) ? alphastart : 0.000000001;

    // Set up initial alpha values
    for ( var i = 0; i < this.particles; ++i ) {
        this.p_attributes.alpha.value[i] = alphastart;
    }

    // Register a frame update function
    this.psys.update = function( ) {
        self.update();
    };

    // Unrenderable particles
    this.dead_count = 0;

    scene.add(this.psys);

    // cool field decay effects controller
    if ( decay_values ) {
        this.decay = true;
        this.decaying = false;
        // The chance of a particle being removed every frame after decay_start
        // ms
        this.decay_rate = ( 'rate' in decay_values ) ? decay_values.rate : 0;

        this.decay_velocities = [ 0, 0, 0 ];

        // The velocity change in the particles every frame after decay_start
        if ( 'speed_delta' in decay_values ) {
            this.decay_velocities[0] = ( 'x' in decay_values.speed_delta ) ? decay_values.speed_delta.x
                    : 0;
            this.decay_velocities[1] = ( 'y' in decay_values.speed_delta ) ? decay_values.speed_delta.y
                    : 0;
            this.decay_velocities[2] = ( 'z' in decay_values.speed_delta ) ? decay_values.speed_delta.z
                    : 0;
        }

        // Time to wait until starting to decay the field
        this.decay_start = decay_values.start;
    }
    else {
        this.decay = false;
    }

    this.duration = duration;
    this.frame = 0;
}

/**
 * Generates a spherical or elliptical shaped particle field
 * 
 */
ParticleField.prototype.genSphere = function( ) {
    // The start positions of the particles
    var p_xyz = [ ];
    // The destination positions of the particles
    var dest_xyz = [ ];
    var particle;

    var theta, phi;
    var theta2, phi2;

    var velocities = [ ];
    var velocity;

    velocity = this.velocity;

    // Make the particles
    for ( var p = 0; p < this.particles; ++p ) {

        // Get random angles for generating points on unit circles
        theta = 2 * Math.PI * Math.random();
        phi = 2 * Math.asin(2 * Math.random() - 1);

        theta2 = 2 * Math.PI * Math.random();
        phi2 = 2 * Math.asin(2 * Math.random() - 1);

        // Generating the actual points on a unit circle in 3d space
        p_xyz[0] = Math.cos(theta) * Math.cos(phi);
        p_xyz[1] = Math.sin(theta) * Math.cos(phi);
        p_xyz[2] = Math.sin(phi);

        // Generate destination points
        dest_xyz[0] = Math.cos(theta2) * Math.cos(phi2);
        dest_xyz[1] = Math.sin(theta2) * Math.cos(phi2);
        dest_xyz[2] = Math.sin(phi2);

        // Then stretching them along the axes so the match the sphere/ellipse
        p_xyz[0] *= this.start_bounds[0];
        p_xyz[1] *= this.start_bounds[1];
        p_xyz[2] *= this.start_bounds[2];

        dest_xyz[0] *= this.end_bounds[0];
        dest_xyz[1] *= this.end_bounds[1];
        dest_xyz[2] *= this.end_bounds[2];

        // Now set up smooth animations to move the particles properly
        for ( var i = 0; i < 3; ++i ) {
            if ( this.randomize_v ) {
                // make a random velocity
                velocity = Math.random() * this.velocity;
            }
            // This ratio makes sure all particles animate smoothly from
            // start to finish and don't form bands
            velocities[i] = velocity * Math.abs(dest_xyz[i] - p_xyz[i])
                    / Math.abs(this.end_bounds[i] - this.start_bounds[i]);
            // Correct sign of velocity
            velocities[i] *= ( Math.abs(dest_xyz[i] - p_xyz[i]) / ( dest_xyz[i] - p_xyz[i] ) );
            // And normalize
            velocities[i] *= this.v_normalized[i];
        }

        // p_xyz is relative distance from center, convert to absolute
        // position
        p_xyz[0] += this.x_center;
        p_xyz[1] += this.y_center;
        p_xyz[2] += this.z_center;

        // Same for dest
        dest_xyz[0] += this.x_center;
        dest_xyz[1] += this.y_center;
        dest_xyz[2] += this.z_center;

        // Set up the vector with the start position
        particle = new THREE.Vector3(p_xyz[0], p_xyz[1], p_xyz[2]);

        // Record velocity
        particle.velocity = new THREE.Vector3(velocities[0], velocities[1],
                velocities[2]);

        // Record the destination position
        particle.dests = new THREE.Vector3(dest_xyz[0], dest_xyz[1],
                dest_xyz[2]);

        // Add it to the field
        this.pfield.vertices.push(particle);
    }
};

/**
 * Animates the particlefield movements
 */
ParticleField.prototype.update = function( ) {
    var part;

    // check for decay trigger
    if ( this.decay && !this.decaying && this.frame == this.decay_start ) {
        this.decaying = true;
    }

    ++this.frame;

    for ( var p = 0; p < this.particles; ++p ) {

        if ( this.p_attributes.alpha.value[p] === 0 ) {
            // It's not renderable
            continue;
        }

        // Get a particle
        part = this.pfield.vertices[p];

        // check for decay actions
        if ( this.decay && this.decaying ) {
            if ( this.decay_rate && Math.random() < this.decay_rate ) {
                // Cull particle
                this.p_attributes.alpha.value[p] = 0;
                ++this.dead_count;
                // Nothing else to do
                continue;
            }
            // Decay velocity
            for ( var i = 0; i < 3; ++i ) {
                if ( part.velocity[i] < 0 )
                    part.velocity[i] += this.decay_velocities[i];
                else if ( part.velocity[i] > 0 )
                    part.velocity[i] -= this.decay_velocities[i];
            }
        }

        // check for fadeout
        if ( this.fade_rate ) {
            this.p_attributes.alpha.value[p] -= this.fade_rate;
            // Don't exceed 1
            this.p_attributes.alpha.value[p] = Math.min(
                    this.p_attributes.alpha.value[p], 1);
            // Handle negative/0 alpha
            if ( this.p_attributes.alpha.value[p] <= 0 ) {
                this.p_attributes.alpha.value[p] = 0;
                ++this.dead_count;
                continue;
            }
        }

        // Change position
        part.add(part.velocity);
    }

    // Check if field is done (timeout or no particles)
    if ( this.frame == this.duration || ( this.particles == this.dead_count ) ) {
        // Remove the field
        this.parent.remove(this.psys);

        if ( this.on_complete ) {
            var self = this;
            // Execute the callback
            setTimeout(function( ) {
                self.on_complete();
            }, this.delay);
        }
    }
};
