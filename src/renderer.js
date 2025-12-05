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

        // Create basic geometries
        this.createGeometries();

        // Set default viewport
        this.resize();
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

        // Tank body (box)
        const bodyWidth = 2.0;
        const bodyHeight = 1.0;
        const bodyLength = 3.0;

        // Helper to add a box
        const addBox = (cx, cy, cz, w, h, l) => {
            const hw = w / 2, hh = h / 2, hl = l / 2;
            const baseIdx = positions.length / 3;

            // 8 vertices
            const verts = [
                cx - hw, cy - hh, cz + hl,  // 0: front-bottom-left
                cx + hw, cy - hh, cz + hl,  // 1: front-bottom-right
                cx + hw, cy + hh, cz + hl,  // 2: front-top-right
                cx - hw, cy + hh, cz + hl,  // 3: front-top-left
                cx - hw, cy - hh, cz - hl,  // 4: back-bottom-left
                cx + hw, cy - hh, cz - hl,  // 5: back-bottom-right
                cx + hw, cy + hh, cz - hl,  // 6: back-top-right
                cx - hw, cy + hh, cz - hl   // 7: back-top-left
            ];

            // Add faces with proper normals
            // Front
            positions.push(...verts.slice(0, 3), ...verts.slice(3, 6), ...verts.slice(6, 9), ...verts.slice(9, 12));
            normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
            indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);

            // Back
            const backBase = positions.length / 3;
            positions.push(...verts.slice(15, 18), ...verts.slice(12, 15), ...verts.slice(21, 24), ...verts.slice(18, 21));
            normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
            indices.push(backBase, backBase + 1, backBase + 2, backBase, backBase + 2, backBase + 3);

            // Top
            const topBase = positions.length / 3;
            positions.push(...verts.slice(9, 12), ...verts.slice(6, 9), ...verts.slice(18, 21), ...verts.slice(21, 24));
            normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            indices.push(topBase, topBase + 1, topBase + 2, topBase, topBase + 2, topBase + 3);

            // Bottom
            const bottomBase = positions.length / 3;
            positions.push(...verts.slice(12, 15), ...verts.slice(15, 18), ...verts.slice(3, 6), ...verts.slice(0, 3));
            normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
            indices.push(bottomBase, bottomBase + 1, bottomBase + 2, bottomBase, bottomBase + 2, bottomBase + 3);

            // Right
            const rightBase = positions.length / 3;
            positions.push(...verts.slice(3, 6), ...verts.slice(15, 18), ...verts.slice(18, 21), ...verts.slice(6, 9));
            normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
            indices.push(rightBase, rightBase + 1, rightBase + 2, rightBase, rightBase + 2, rightBase + 3);

            // Left
            const leftBase = positions.length / 3;
            positions.push(...verts.slice(12, 15), ...verts.slice(0, 3), ...verts.slice(9, 12), ...verts.slice(21, 24));
            normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
            indices.push(leftBase, leftBase + 1, leftBase + 2, leftBase, leftBase + 2, leftBase + 3);
        };

        // Main body
        addBox(0, 0.5, 0, bodyWidth, bodyHeight, bodyLength);

        // Turret
        addBox(0, 1.2, -0.2, 1.2, 0.6, 1.5);

        // Cannon
        addBox(0, 1.2, 1.5, 0.25, 0.25, 2.0);

        // Tracks (left and right)
        addBox(-1.1, 0.3, 0, 0.4, 0.6, 3.2);
        addBox(1.1, 0.3, 0, 0.4, 0.6, 3.2);

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

    createGroundGeometry(width, depth, divisions) {
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

                positions.push(px, 0, pz);
                normals.push(0, 1, 0);
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

    createBufferedGeometry(positions, normals, indices, texCoords = null) {
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
