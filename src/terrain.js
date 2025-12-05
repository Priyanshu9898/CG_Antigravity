// Battlezone - Terrain and Obstacles

class Terrain {
    constructor(config = {}) {
        this.size = config.size || 200;
        this.obstacles = [];
        this.mountains = [];
        this.bounds = {
            minX: -this.size / 2,
            maxX: this.size / 2,
            minZ: -this.size / 2,
            maxZ: this.size / 2
        };

        // For 3D gameplay
        this.heightMap = null;
        this.heightMapSize = config.heightMapSize || 64;
        this.maxElevation = config.maxElevation || 5;
        this.use3DGameplay = config.use3DGameplay || false;

        this.generate();
    }

    generate() {
        this.generateMountains();
        this.generateObstacles();

        if (this.use3DGameplay) {
            this.generateHeightMap();
        }
    }

    generateMountains() {
        this.mountains = [];

        const mountainCount = 20;
        const edgeDistance = this.size / 2 - 10;

        // Place mountains around the perimeter
        for (let i = 0; i < mountainCount; i++) {
            const angle = (i / mountainCount) * Math.PI * 2;
            const variance = Utils.random(-15, 15);
            const distance = edgeDistance + variance;

            this.mountains.push({
                position: [
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                ],
                scale: Utils.random(0.8, 1.5),
                rotation: Utils.random(0, Math.PI * 2),
                color: [0.3, 0.35, 0.25] // Earthy mountain color
            });
        }
    }

    generateObstacles() {
        this.obstacles = [];

        const obstacleCount = 15;
        const margin = 20;

        for (let i = 0; i < obstacleCount; i++) {
            let position;
            let attempts = 0;

            // Find non-overlapping position
            do {
                position = [
                    Utils.random(-this.size / 2 + margin, this.size / 2 - margin),
                    0,
                    Utils.random(-this.size / 2 + margin, this.size / 2 - margin)
                ];
                attempts++;
            } while (this.checkObstacleOverlap(position, 8) && attempts < 20);

            const type = Math.random() > 0.5 ? 'cube' : 'pyramid';
            const baseSize = Utils.random(3, 6);

            this.obstacles.push({
                id: `obstacle_${i}`,
                position: position,
                rotation: Utils.random(0, Math.PI * 2),
                type: type,
                size: type === 'cube' ?
                    [baseSize, Utils.random(2, 5), baseSize] :
                    [baseSize, baseSize * 1.5, baseSize],
                color: [0.4, 0.35, 0.3], // Brown/tan color
                collisionRadius: baseSize * 0.7
            });
        }
    }

    checkObstacleOverlap(position, minDistance) {
        for (const obstacle of this.obstacles) {
            const dist = Utils.distance2D(
                position[0], position[2],
                obstacle.position[0], obstacle.position[2]
            );
            if (dist < minDistance) return true;
        }
        return false;
    }

    generateHeightMap() {
        const size = this.heightMapSize;
        this.heightMap = new Float32Array(size * size);

        // Generate smooth terrain using multiple octaves of noise
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                let height = 0;

                // Multiple octaves of noise for natural terrain
                const nx = x / size - 0.5;
                const nz = z / size - 0.5;

                height += this.noise(nx * 2, nz * 2) * 0.5;
                height += this.noise(nx * 4, nz * 4) * 0.25;
                height += this.noise(nx * 8, nz * 8) * 0.125;

                // Keep center flatter for gameplay
                const distFromCenter = Math.sqrt(nx * nx + nz * nz);
                const flattenFactor = Utils.smoothstep(0, 0.3, distFromCenter);
                height *= flattenFactor;

                this.heightMap[z * size + x] = height * this.maxElevation;
            }
        }
    }

    // Simple noise function
    noise(x, z) {
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        z -= Math.floor(z);

        const u = x * x * (3 - 2 * x);
        const v = z * z * (3 - 2 * z);

        const n00 = this.hash(X, Z);
        const n01 = this.hash(X, Z + 1);
        const n10 = this.hash(X + 1, Z);
        const n11 = this.hash(X + 1, Z + 1);

        const nx0 = Utils.lerp(n00, n10, u);
        const nx1 = Utils.lerp(n01, n11, u);

        return Utils.lerp(nx0, nx1, v);
    }

    hash(x, z) {
        let n = x + z * 57;
        n = (n << 13) ^ n;
        return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0) * 0.5 + 0.5;
    }

    getHeightAt(x, z) {
        if (!this.heightMap) return 0;

        // Convert world coords to heightmap coords
        const size = this.heightMapSize;
        const hx = ((x / this.size) + 0.5) * size;
        const hz = ((z / this.size) + 0.5) * size;

        // Clamp to valid range
        const x0 = Utils.clamp(Math.floor(hx), 0, size - 2);
        const z0 = Utils.clamp(Math.floor(hz), 0, size - 2);

        // Bilinear interpolation
        const fx = hx - x0;
        const fz = hz - z0;

        const h00 = this.heightMap[z0 * size + x0];
        const h10 = this.heightMap[z0 * size + x0 + 1];
        const h01 = this.heightMap[(z0 + 1) * size + x0];
        const h11 = this.heightMap[(z0 + 1) * size + x0 + 1];

        const h0 = Utils.lerp(h00, h10, fx);
        const h1 = Utils.lerp(h01, h11, fx);

        return Utils.lerp(h0, h1, fz);
    }

    getNormalAt(x, z) {
        const delta = 1.0;

        const hL = this.getHeightAt(x - delta, z);
        const hR = this.getHeightAt(x + delta, z);
        const hD = this.getHeightAt(x, z - delta);
        const hU = this.getHeightAt(x, z + delta);

        // Calculate normal
        const normal = [
            hL - hR,
            2 * delta,
            hD - hU
        ];

        // Normalize
        const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        if (len > 0) {
            normal[0] /= len;
            normal[1] /= len;
            normal[2] /= len;
        }

        return normal;
    }

    isInBounds(x, z, margin = 0) {
        return x >= this.bounds.minX + margin &&
            x <= this.bounds.maxX - margin &&
            z >= this.bounds.minZ + margin &&
            z <= this.bounds.maxZ - margin;
    }

    clampToBounds(position, margin = 5) {
        position[0] = Utils.clamp(
            position[0],
            this.bounds.minX + margin,
            this.bounds.maxX - margin
        );
        position[2] = Utils.clamp(
            position[2],
            this.bounds.minZ + margin,
            this.bounds.maxZ - margin
        );
        return position;
    }

    getRandomSpawnPosition(margin = 10, avoidPositions = [], minDistance = 15) {
        let position;
        let attempts = 0;

        do {
            position = [
                Utils.random(this.bounds.minX + margin, this.bounds.maxX - margin),
                0,
                Utils.random(this.bounds.minZ + margin, this.bounds.maxZ - margin)
            ];

            // Check distance from avoid positions
            let valid = true;
            for (const avoidPos of avoidPositions) {
                const dist = Utils.distance2D(
                    position[0], position[2],
                    avoidPos[0], avoidPos[2]
                );
                if (dist < minDistance) {
                    valid = false;
                    break;
                }
            }

            // Check distance from obstacles
            if (valid && Collision.checkObstacleCollision(position, 5, this.obstacles)) {
                valid = false;
            }

            if (valid) return position;
            attempts++;
        } while (attempts < 50);

        return position;
    }

    getEdgeSpawnPosition(avoidPositions = [], viewDirection = null) {
        let position;
        let attempts = 0;

        do {
            // Spawn at edge of map
            const side = Utils.randomInt(0, 3);
            const margin = 15;

            switch (side) {
                case 0: // North
                    position = [
                        Utils.random(this.bounds.minX + margin, this.bounds.maxX - margin),
                        0,
                        this.bounds.maxZ - margin
                    ];
                    break;
                case 1: // East
                    position = [
                        this.bounds.maxX - margin,
                        0,
                        Utils.random(this.bounds.minZ + margin, this.bounds.maxZ - margin)
                    ];
                    break;
                case 2: // South
                    position = [
                        Utils.random(this.bounds.minX + margin, this.bounds.maxX - margin),
                        0,
                        this.bounds.minZ + margin
                    ];
                    break;
                case 3: // West
                    position = [
                        this.bounds.minX + margin,
                        0,
                        Utils.random(this.bounds.minZ + margin, this.bounds.maxZ - margin)
                    ];
                    break;
            }

            // Check if position is behind player
            if (viewDirection) {
                const toSpawn = [
                    position[0] - viewDirection.from[0],
                    position[2] - viewDirection.from[2]
                ];
                const dot = toSpawn[0] * viewDirection.dir[0] + toSpawn[1] * viewDirection.dir[2];

                // If in front of player, try again
                if (dot > 0) {
                    attempts++;
                    continue;
                }
            }

            // Check distance from avoid positions
            let valid = true;
            for (const avoidPos of avoidPositions) {
                const dist = Utils.distance2D(
                    position[0], position[2],
                    avoidPos[0], avoidPos[2]
                );
                if (dist < 20) {
                    valid = false;
                    break;
                }
            }

            if (valid) return position;
            attempts++;
        } while (attempts < 30);

        return position;
    }
}

// Make available globally
window.Terrain = Terrain;
