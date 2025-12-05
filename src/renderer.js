// Battlezone - WebGL Renderer

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', {
            antialias: true,
            alpha: false
        });

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.programs = {};
        this.buffers = {};
        this.geometries = {};

        this.init();
    }

    init() {
        const gl = this.gl;

        // Enable features
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Create shader programs
        this.programs.basic = this.createProgram(Shaders.basicVertex, Shaders.basicFragment);
        this.programs.line = this.createProgram(Shaders.lineVertex, Shaders.lineFragment);
        this.programs.terrain = this.createProgram(Shaders.terrainVertex, Shaders.terrainFragment);
        this.programs.particle = this.createProgram(Shaders.particleVertex, Shaders.particleFragment);
        this.programs.textured = this.createProgram(Shaders.texturedVertex, Shaders.texturedFragment);

        console.log('Sky Vertex Shader:', Shaders.skyVertex ? 'Defined' : 'Undefined');
        console.log('Sky Fragment Shader:', Shaders.skyFragment ? 'Defined' : 'Undefined');

        this.programs.sky = this.createProgram(Shaders.skyVertex, Shaders.skyFragment);

        // Load power-up textures
        this.textures = {};
        this.loadTexture('shield', 'assets/shield.png');
        this.loadTexture('freeze', 'assets/freeze.png');
        this.loadTexture('xray', 'assets/xray.png');

        // Create basic geometries
        this.createGeometries();

        // Set default viewport
        this.resize();
    }

    // Load texture from image file
    loadTexture(name, url) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Placeholder while loading
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255]));

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            console.log(`Texture loaded: ${name}`);
        };
        image.onerror = () => {
            console.warn(`Failed to load texture: ${url}`);
        };
        image.src = url;

        this.textures[name] = texture;
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return null;
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }

        // Link program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }

        // Get attribute and uniform locations
        program.attributes = {};
        program.uniforms = {};

        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(program, i);
            program.attributes[info.name] = gl.getAttribLocation(program, info.name);
        }

        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            program.uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }

        return program;
    }

    createGeometries() {
        // Create cube geometry
        this.geometries.cube = this.createCubeGeometry();

        // Create tank geometry
        this.geometries.tank = this.createTankGeometry();

        // Create projectile geometry
        this.geometries.projectile = this.createProjectileGeometry();

        // Create ground plane
        this.geometries.ground = this.createGroundGeometry(200, 200, 20);

        // Create mountain geometry
        this.geometries.mountain = this.createMountainGeometry();

        // Create pyramid geometry (for obstacles)
        this.geometries.pyramid = this.createPyramidGeometry();

        // Create UFO geometry (flying saucer)
        this.geometries.ufo = this.createUFOGeometry();

        // Create sphere geometry (for power-ups)
        this.geometries.sphere = this.createSphereGeometry();
    }

    createCubeGeometry() {
        const gl = this.gl;

        // Vertices with normals
        const positions = [
            // Front face
            -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
            // Back face
            0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
            // Top face
            -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
            // Bottom face
            -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
            // Right face
            0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
            // Left face
            -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5
        ];

        const normals = [
            // Front
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,    // Front
            4, 5, 6, 4, 6, 7,    // Back
            8, 9, 10, 8, 10, 11,  // Top
            12, 13, 14, 12, 14, 15,  // Bottom
            16, 17, 18, 16, 18, 19,  // Right
            20, 21, 22, 20, 22, 23   // Left
        ];

        return this.createBufferedGeometry(positions, normals, indices);
    }

    createTankGeometry() {
        const gl = this.gl;
        const positions = [];
        const normals = [];
        const indices = [];
        let indexOffset = 0;

        // Helper to add a box
        const addBox = (cx, cy, cz, w, h, l) => {
            const hw = w / 2;
            const hh = h / 2;
            const hl = l / 2;

            // Vertices
            const v = [
                // Front
                cx - hw, cy - hh, cz + hl,
                cx + hw, cy - hh, cz + hl,
                cx + hw, cy + hh, cz + hl,
                cx - hw, cy + hh, cz + hl,
                // Back
                cx - hw, cy - hh, cz - hl,
                cx - hw, cy + hh, cz - hl,
                cx + hw, cy + hh, cz - hl,
                cx + hw, cy - hh, cz - hl,
                // Top
                cx - hw, cy + hh, cz - hl,
                cx - hw, cy + hh, cz + hl,
                cx + hw, cy + hh, cz + hl,
                cx + hw, cy + hh, cz - hl,
                // Bottom
                cx - hw, cy - hh, cz - hl,
                cx + hw, cy - hh, cz - hl,
                cx + hw, cy - hh, cz + hl,
                cx - hw, cy - hh, cz + hl,
                // Right
                cx + hw, cy - hh, cz - hl,
                cx + hw, cy + hh, cz - hl,
                cx + hw, cy + hh, cz + hl,
                cx + hw, cy - hh, cz + hl,
                // Left
                cx - hw, cy - hh, cz - hl,
                cx - hw, cy - hh, cz + hl,
                cx - hw, cy + hh, cz + hl,
                cx - hw, cy + hh, cz - hl
            ];

            // Normals
            const n = [
                // Front
                0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
                // Back
                0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
                // Top
                0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
                // Bottom
                0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
                // Right
                1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
                // Left
                -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
            ];

            // Indices
            const i = [
                0, 1, 2, 0, 2, 3,    // Front
                4, 5, 6, 4, 6, 7,    // Back
                8, 9, 10, 8, 10, 11,  // Top
                12, 13, 14, 12, 14, 15,  // Bottom
                16, 17, 18, 16, 18, 19,  // Right
                20, 21, 22, 20, 22, 23   // Left
            ];

            positions.push(...v);
            normals.push(...n);
            for (let idx of i) {
                indices.push(indexOffset + idx);
            }
            indexOffset += 24;
        };

        // Lower Chassis (Main Body)
        addBox(0, 0.6, 0, 2.2, 0.8, 3.8);

        // Upper Chassis (Sloped look approximated with smaller box)
        addBox(0, 1.2, -0.2, 1.8, 0.4, 2.8);

        // Turret Base
        addBox(0, 1.6, -0.4, 1.4, 0.6, 1.6);

        // Turret Front (Mantlet)
        addBox(0, 1.6, 0.6, 0.8, 0.4, 0.6);

        // Cannon Barrel
        addBox(0, 1.6, 2.0, 0.2, 0.2, 3.0);

        // Muzzle Brake
        addBox(0, 1.6, 3.6, 0.3, 0.3, 0.4);

        // Commander's Hatch
        addBox(0.4, 1.95, -0.6, 0.5, 0.1, 0.5);

        // Antenna
        addBox(-0.5, 2.2, -0.8, 0.05, 1.2, 0.05);

        // Tracks (Left)
        addBox(-1.3, 0.4, 0, 0.5, 0.8, 4.0); // Main track block
        addBox(-1.3, 0.4, 1.5, 0.6, 0.6, 0.6); // Front wheel bulge
        addBox(-1.3, 0.4, -1.5, 0.6, 0.6, 0.6); // Rear wheel bulge

        // Tracks (Right)
        addBox(1.3, 0.4, 0, 0.5, 0.8, 4.0); // Main track block
        addBox(1.3, 0.4, 1.5, 0.6, 0.6, 0.6); // Front wheel bulge
        addBox(1.3, 0.4, -1.5, 0.6, 0.6, 0.6); // Rear wheel bulge

        // Engine Vents (Back)
        addBox(0, 1.0, -1.8, 1.4, 0.1, 0.4);

        return this.createBufferedGeometry(positions, normals, indices);
    }

    createProjectileGeometry() {
        // Missile-like shape - wider and more visible
        const positions = [];
        const normals = [];
        const indices = [];

        const length = 1.5;      // Longer missile
        const radius = 0.3;      // Much wider (was 0.1)
        const segments = 8;      // Smoother

        // Create a cone/missile shape
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            // Front tip (point)
            positions.push(0, 0, length);
            normals.push(0, 0, 1);

            // Back ring
            positions.push(x, y, 0);
            normals.push(x / radius, y / radius, 0);
        }

        // Add back cap center
        const backCenterIdx = positions.length / 3;
        positions.push(0, 0, -0.1);
        normals.push(0, 0, -1);

        // Create side triangles
        for (let i = 0; i < segments; i++) {
            const i1 = i * 2;
            const i2 = i * 2 + 1;
            const i3 = (i + 1) * 2;
            const i4 = (i + 1) * 2 + 1;

            indices.push(i1, i2, i4);
            indices.push(i1, i4, i3);

            // Back cap
            indices.push(i2, backCenterIdx, i4);
        }

        return this.createBufferedGeometry(positions, normals, indices);
    }

    setTerrain(terrain) {
        // Re-create ground geometry with terrain height
        this.geometries.ground = this.createGroundGeometry(200, 200, 64, terrain);
    }

    createGroundGeometry(width, depth, divisions, terrain = null) {
        const positions = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        const halfW = width / 2;
        const halfD = depth / 2;
        const stepW = width / divisions;
        const stepD = depth / divisions;

        // Create grid vertices
        for (let z = 0; z <= divisions; z++) {
            for (let x = 0; x <= divisions; x++) {
                const px = -halfW + x * stepW;
                const pz = -halfD + z * stepD;

                let py = 0;
                let ny = [0, 1, 0];

                if (terrain && terrain.use3DGameplay) {
                    py = terrain.getHeightAt(px, pz);
                    ny = terrain.getNormalAt(px, pz);
                }

                positions.push(px, py, pz);
                normals.push(ny[0], ny[1], ny[2]);
                texCoords.push(x / divisions, z / divisions);
            }
        }

        // Create indices
        for (let z = 0; z < divisions; z++) {
            for (let x = 0; x < divisions; x++) {
                const topLeft = z * (divisions + 1) + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * (divisions + 1) + x;
                const bottomRight = bottomLeft + 1;

                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        return this.createBufferedGeometry(positions, normals, indices, texCoords);
    }

    createMountainGeometry() {
        const positions = [];
        const normals = [];
        const indices = [];

        // Create a simple peaked shape
        const baseSize = 8;
        const height = 15;
        const segments = 8;

        // Base vertices
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            positions.push(
                Math.cos(angle) * baseSize,
                0,
                Math.sin(angle) * baseSize
            );
            normals.push(Math.cos(angle), 0.3, Math.sin(angle));
        }

        // Peak
        const peakIdx = positions.length / 3;
        positions.push(0, height, 0);
        normals.push(0, 1, 0);

        // Create triangles
        for (let i = 0; i < segments; i++) {
            indices.push(i, (i + 1) % segments, peakIdx);
        }

        // Base
        const centerIdx = positions.length / 3;
        positions.push(0, 0, 0);
        normals.push(0, -1, 0);

        for (let i = 0; i < segments; i++) {
            indices.push((i + 1) % segments, i, centerIdx);
        }

        return this.createBufferedGeometry(positions, normals, indices);
    }

    createPyramidGeometry() {
        const positions = [];
        const normals = [];
        const indices = [];

        const size = 1.0;
        const height = 1.5;

        // Base vertices
        positions.push(
            -size, 0, -size,  // 0
            size, 0, -size,  // 1
            size, 0, size,  // 2
            -size, 0, size,  // 3
            0, height, 0     // 4 (peak)
        );

        // Normals (approximate)
        const ny = size / Math.sqrt(size * size + height * height);
        const nxz = height / Math.sqrt(size * size + height * height);

        normals.push(
            -nxz, ny, -nxz,
            nxz, ny, -nxz,
            nxz, ny, nxz,
            -nxz, ny, nxz,
            0, 1, 0
        );

        // Faces
        indices.push(
            0, 1, 4,  // Front
            1, 2, 4,  // Right
            2, 3, 4,  // Back
            3, 0, 4,  // Left
            0, 2, 1,  // Base 1
            0, 3, 2   // Base 2
        );

        return this.createBufferedGeometry(positions, normals, indices);
    }

    // Create UFO geometry - flying saucer shape (disc + dome)
    createUFOGeometry() {
        const positions = [];
        const normals = [];
        const indices = [];

        const discRadius = 3.0;
        const discHeight = 0.5;
        const domeRadius = 1.5;
        const domeHeight = 1.2;
        const segments = 16;

        let vertexIndex = 0;

        // Bottom disc (flat disc shape)
        // Center bottom
        positions.push(0, -discHeight / 2, 0);
        normals.push(0, -1, 0);
        const bottomCenterIdx = vertexIndex++;

        // Bottom ring
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * discRadius;
            const z = Math.sin(angle) * discRadius;
            positions.push(x, -discHeight / 2, z);
            normals.push(0, -1, 0);
        }

        // Bottom disc triangles
        for (let i = 0; i < segments; i++) {
            indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i, bottomCenterIdx + 1 + ((i + 1) % segments));
        }
        vertexIndex += segments;

        // Top disc edge
        const topEdgeStart = vertexIndex;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * discRadius;
            const z = Math.sin(angle) * discRadius;
            positions.push(x, discHeight / 2, z);
            const nx = Math.cos(angle);
            const nz = Math.sin(angle);
            normals.push(nx, 0.3, nz);
        }
        vertexIndex += segments;

        // Disc side (connect bottom and top edge)
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const b1 = bottomCenterIdx + 1 + i;
            const b2 = bottomCenterIdx + 1 + next;
            const t1 = topEdgeStart + i;
            const t2 = topEdgeStart + next;
            indices.push(b1, t1, b2);
            indices.push(b2, t1, t2);
        }

        // Dome on top
        const domeBaseStart = vertexIndex;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * domeRadius;
            const z = Math.sin(angle) * domeRadius;
            positions.push(x, discHeight / 2, z);
            normals.push(Math.cos(angle) * 0.5, 0.5, Math.sin(angle) * 0.5);
        }
        vertexIndex += segments;

        // Dome peak
        positions.push(0, discHeight / 2 + domeHeight, 0);
        normals.push(0, 1, 0);
        const domePeakIdx = vertexIndex++;

        // Dome triangles
        for (let i = 0; i < segments; i++) {
            indices.push(domeBaseStart + i, domePeakIdx, domeBaseStart + ((i + 1) % segments));
        }

        // Connect dome base to disc top
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            indices.push(topEdgeStart + i, domeBaseStart + i, topEdgeStart + next);
            indices.push(topEdgeStart + next, domeBaseStart + i, domeBaseStart + next);
        }

        return this.createBufferedGeometry(positions, normals, indices);
    }

    // Create sphere geometry for power-ups with texture coordinates
    createSphereGeometry() {
        const positions = [];
        const normals = [];
        const indices = [];
        const texCoords = [];

        const radius = 1.0;
        const latSegments = 12;
        const lonSegments = 16;

        // Generate vertices with UV coordinates
        for (let lat = 0; lat <= latSegments; lat++) {
            const theta = (lat / latSegments) * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            const v = lat / latSegments;

            for (let lon = 0; lon <= lonSegments; lon++) {
                const phi = (lon / lonSegments) * Math.PI * 2;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const u = lon / lonSegments;

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(x * radius, y * radius, z * radius);
                normals.push(x, y, z);
                texCoords.push(u, v);
            }
        }

        // Generate indices
        for (let lat = 0; lat < latSegments; lat++) {
            for (let lon = 0; lon < lonSegments; lon++) {
                const first = lat * (lonSegments + 1) + lon;
                const second = first + lonSegments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        // Create colors (white)
        const colors = [];
        for (let i = 0; i < positions.length / 3; i++) {
            colors.push(1, 1, 1);
        }

        return this.createBufferedGeometry(positions, normals, indices, texCoords, colors);
    }

    createBufferedGeometry(positions, normals, indices, texCoords = null, colors = null) {
        const gl = this.gl;

        const geometry = {
            vertexCount: indices.length
        };

        // Position buffer
        geometry.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Normal buffer
        geometry.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        // Index buffer
        geometry.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // Texture coordinate buffer (optional)
        if (texCoords) {
            geometry.texCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        }

        // Color buffer (optional)
        if (colors) {
            geometry.colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        }

        return geometry;
    }

    resize() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
    }

    clear(color = [0.05, 0.1, 0.05, 1.0]) {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(color[0], color[1], color[2], color[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    setViewport(x, y, width, height) {
        this.gl.viewport(x, y, width, height);
    }

    useProgram(program) {
        this.gl.useProgram(program);
        this.currentProgram = program;
    }

    setUniforms(uniforms) {
        const gl = this.gl;
        const program = this.currentProgram;

        for (const name in uniforms) {
            const location = program.uniforms[name];
            if (location === undefined) continue;

            const value = uniforms[name];

            if (value instanceof Float32Array || Array.isArray(value)) {
                switch (value.length) {
                    case 2: gl.uniform2fv(location, value); break;
                    case 3: gl.uniform3fv(location, value); break;
                    case 4: gl.uniform4fv(location, value); break;
                    case 9: gl.uniformMatrix3fv(location, false, value); break;
                    case 16: gl.uniformMatrix4fv(location, false, value); break;
                }
            } else if (typeof value === 'number') {
                gl.uniform1f(location, value);
            } else if (typeof value === 'boolean') {
                gl.uniform1i(location, value ? 1 : 0);
            }
        }
    }

    drawGeometry(geometry, modelMatrix, uniforms = {}) {
        const gl = this.gl;
        const program = this.currentProgram;

        // Clean up attributes
        this.disableAllAttributes();

        // Set model matrix
        uniforms.uModelMatrix = modelMatrix;

        // Calculate normal matrix
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        uniforms.uNormalMatrix = normalMatrix;

        this.setUniforms(uniforms);

        // Bind position buffer
        if (program.attributes.aPosition !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
            gl.enableVertexAttribArray(program.attributes.aPosition);
            gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind normal buffer
        if (program.attributes.aNormal !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalBuffer);
            gl.enableVertexAttribArray(program.attributes.aNormal);
            gl.vertexAttribPointer(program.attributes.aNormal, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind texture coordinate buffer
        if (program.attributes.aTexCoord !== undefined && geometry.texCoordBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
            gl.enableVertexAttribArray(program.attributes.aTexCoord);
            gl.vertexAttribPointer(program.attributes.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        }

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.drawElements(gl.TRIANGLES, geometry.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Draw textured geometry (for power-ups)
    drawTexturedGeometry(geometry, modelMatrix, textureName, uniforms = {}) {
        const gl = this.gl;

        // Switch to textured program
        this.useProgram(this.programs.textured);
        const program = this.programs.textured;

        // Set model matrix
        uniforms.uModelMatrix = modelMatrix;

        // Calculate normal matrix
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        uniforms.uNormalMatrix = normalMatrix;

        // Set texture
        const texture = this.textures[textureName];
        if (texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(program.uniforms.uTexture, 0);
        }

        this.setUniforms(uniforms);

        // Bind position buffer
        if (program.attributes.aPosition !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
            gl.enableVertexAttribArray(program.attributes.aPosition);
            gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind normal buffer
        if (program.attributes.aNormal !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalBuffer);
            gl.enableVertexAttribArray(program.attributes.aNormal);
            gl.vertexAttribPointer(program.attributes.aNormal, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind texture coordinate buffer
        if (program.attributes.aTexCoord !== undefined && geometry.texCoordBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
            gl.enableVertexAttribArray(program.attributes.aTexCoord);
            gl.vertexAttribPointer(program.attributes.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        }

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.drawElements(gl.TRIANGLES, geometry.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    disableAllAttributes() {
        const gl = this.gl;
        const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        for (let i = 0; i < maxAttribs; i++) {
            gl.disableVertexAttribArray(i);
        }
    }

    drawTexturedGeometry(geometry, modelMatrix, textureName, uniforms = {}) {
        const gl = this.gl;
        const program = this.programs.textured;

        this.useProgram(program);

        // Clean up attributes from previous calls
        this.disableAllAttributes();

        // Debug logging (once)
        if (!window.debugLogged) {
            console.log('DrawTexturedGeometry Debug:');
            console.log('Program Attributes:', program.attributes);
            console.log('Geometry:', geometry);
            console.log('Texture Name:', textureName);
            window.debugLogged = true;
        }

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[textureName]);

        // Set uniforms
        const allUniforms = {
            uModelMatrix: modelMatrix,
            uViewMatrix: uniforms.uViewMatrix,
            uProjectionMatrix: uniforms.uProjectionMatrix,
            uNormalMatrix: uniforms.uNormalMatrix || mat4.create(),
            uTexture: 0,
            uColor: uniforms.uColor || [1, 1, 1],
            uLightDirection: uniforms.uLightDirection || [0.5, 0.8, 0.3],
            uTime: performance.now() / 1000,
            uGlow: uniforms.uGlow || 0.0
        };

        // Calculate normal matrix if not provided
        if (!uniforms.uNormalMatrix) {
            const normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            allUniforms.uNormalMatrix = normalMatrix;
        }

        this.setUniforms(allUniforms);

        // Bind position buffer
        if (program.attributes.aPosition !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
            gl.enableVertexAttribArray(program.attributes.aPosition);
            gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind normal buffer
        if (program.attributes.aNormal !== undefined) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalBuffer);
            gl.enableVertexAttribArray(program.attributes.aNormal);
            gl.vertexAttribPointer(program.attributes.aNormal, 3, gl.FLOAT, false, 0, 0);
        }

        // Bind texture coordinate buffer
        if (program.attributes.aTexCoord !== undefined && geometry.texCoordBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
            gl.enableVertexAttribArray(program.attributes.aTexCoord);
            gl.vertexAttribPointer(program.attributes.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        }

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.drawElements(gl.TRIANGLES, geometry.vertexCount, gl.UNSIGNED_SHORT, 0);
    }

    drawSkybox(viewMatrix, projectionMatrix) {
        const gl = this.gl;
        this.useProgram(this.programs.sky);

        // Clean up attributes
        this.disableAllAttributes();

        // Disable culling so we see inside of cube
        gl.disable(gl.CULL_FACE);
        // Change depth function to LEQUAL to allow drawing at far plane
        gl.depthFunc(gl.LEQUAL);

        this.setUniforms({
            uViewMatrix: viewMatrix,
            uProjectionMatrix: projectionMatrix
        });

        // Use cube geometry
        const geometry = this.geometries.cube;

        // Bind attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertexBuffer);
        const positionLoc = this.programs.sky.attributes.aPosition;
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
        gl.drawElements(gl.TRIANGLES, geometry.numElements, gl.UNSIGNED_SHORT, 0);

        // Restore state
        gl.enable(gl.CULL_FACE);
        gl.depthFunc(gl.LESS);
    }

    drawLines(positions, color, modelMatrix) {
        const gl = this.gl;
        const program = this.programs.line;

        this.useProgram(program);

        // Create temporary buffer
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

        gl.enableVertexAttribArray(program.attributes.aPosition);
        gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);

        this.setUniforms({
            uModelMatrix: modelMatrix,
            uColor: color,
            uAlpha: 1.0
        });

        gl.drawArrays(gl.LINES, 0, positions.length / 3);

        gl.deleteBuffer(buffer);
    }
}

// Make available globally
window.Renderer = Renderer;
