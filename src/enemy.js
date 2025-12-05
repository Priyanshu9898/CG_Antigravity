// Battlezone - Enemy Tank AI

class EnemyTank {
    constructor(config = {}) {
        this.id = config.id || `enemy_${Date.now()}_${Math.random()}`;
        this.position = config.position ? [...config.position] : [0, 0, 0];
        this.rotation = config.rotation || Math.random() * Math.PI * 2;
        this.velocity = [0, 0, 0];

        // Tank properties - made easier
        this.collisionRadius = 2.0;
        this.height = 2.5;
        this.maxSpeed = config.maxSpeed || 5;  // Slower enemies (was 8)
        this.turnSpeed = config.turnSpeed || 1.2; // Slower turning
        this.currentSpeed = 0;

        // AI behavior - less aggressive
        this.targetRotation = this.rotation;
        this.moveTimer = 0;
        this.moveDuration = Utils.random(2, 5);
        this.state = 'wander'; // wander, pursue, shoot
        this.playerBias = config.playerBias || 0.4; // Less tendency toward player (was 0.6)

        // Combat - shoot less often
        this.alive = true;
        this.shootTimer = Utils.random(4, 7); // Longer initial delay
        this.shootCooldown = config.shootCooldown || 5; // Shoot less often (was 3)
        this.invulnerable = false;

        // Visual - Dark maroon/red (clearly enemy)
        this.color = config.color || [0.5, 0.15, 0.1]; // Dark maroon red
        this.points = config.points || 100;
    }

    update(deltaTime, player, terrain, obstacles, otherEnemies, physics, level = 1) {
        if (!this.alive) return;

        // Update timers
        this.moveTimer += deltaTime;
        this.shootTimer -= deltaTime;

        // AI state machine
        this.updateAI(player, level, terrain);

        // Rotate toward target rotation
        const rotDiff = Utils.normalizeAngle(this.targetRotation - this.rotation);
        const rotStep = this.turnSpeed * deltaTime;

        if (Math.abs(rotDiff) > rotStep) {
            this.rotation += Math.sign(rotDiff) * rotStep;
        } else {
            this.rotation = this.targetRotation;
        }

        this.rotation = Utils.normalizeAngle(this.rotation);

        // Move forward
        const oldPosition = [...this.position];

        if (this.state !== 'shoot') {
            const forward = Utils.angleToVector(this.rotation);
            const speed = this.maxSpeed * (0.5 + Math.random() * 0.5);

            this.position[0] += forward[0] * speed * deltaTime;
            this.position[2] += forward[2] * speed * deltaTime;
        }

        // Apply terrain height if using 3D gameplay
        if (terrain.use3DGameplay) {
            this.position[1] = terrain.getHeightAt(this.position[0], this.position[2]);
        }

        // Check obstacle collision
        const obstacleHit = Collision.checkObstacleCollision(
            this.position, this.collisionRadius, obstacles
        );

        if (obstacleHit) {
            this.position[0] = oldPosition[0];
            this.position[2] = oldPosition[2];

            // Turn away from obstacle
            this.targetRotation = this.rotation + Math.PI / 2 + Math.random() * Math.PI;
            this.moveTimer = 0;
        }

        // Check mountain collision (mountains are circular with baseSize=8 * scale)
        for (const mountain of terrain.mountains) {
            const mountainRadius = 8 * mountain.scale;

            if (Collision.circleVsCircle(
                this.position[0], this.position[2], this.collisionRadius,
                mountain.position[0], mountain.position[2], mountainRadius
            )) {
                this.position[0] = oldPosition[0];
                this.position[2] = oldPosition[2];
                this.targetRotation = this.rotation + Math.PI / 2 + Math.random() * Math.PI;
                this.moveTimer = 0;
                break;
            }
        }

        // Check player collision
        if (player.alive) {
            if (Collision.circleVsCircle(
                this.position[0], this.position[2], this.collisionRadius,
                player.position[0], player.position[2], player.collisionRadius
            )) {
                this.position[0] = oldPosition[0];
                this.position[2] = oldPosition[2];
                this.targetRotation = this.rotation + Math.PI;
                this.moveTimer = 0;
            }
        }

        // Check other enemy collision
        for (const other of otherEnemies) {
            if (other.id === this.id || !other.alive) continue;

            if (Collision.circleVsCircle(
                this.position[0], this.position[2], this.collisionRadius,
                other.position[0], other.position[2], other.collisionRadius
            )) {
                const resolution = Collision.resolveCircleCollision(this, other);
                if (resolution) {
                    this.position[0] += resolution.x;
                    this.position[2] += resolution.z;
                }
            }
        }

        // Keep in bounds
        terrain.clampToBounds(this.position, 15);
    }

    updateAI(player, level, terrain = null) {
        if (!player.alive) {
            this.state = 'wander';
        }

        // Level modifies behavior
        const levelBias = Math.min(0.9, this.playerBias + level * 0.05);
        const shootInterval = Math.max(1, this.shootCooldown - level * 0.2);

        // Check line of sight to player (for shooting)
        this.hasLineOfSight = true;
        if (terrain && player.alive) {
            this.hasLineOfSight = this.checkLineOfSight(player.position, terrain);
        }

        // Check if it's time to change direction
        if (this.moveTimer >= this.moveDuration) {
            this.moveTimer = 0;
            this.moveDuration = Utils.random(2, 5);

            // Decide new direction
            if (player.alive && Math.random() < levelBias) {
                // Move toward player
                const toPlayer = [
                    player.position[0] - this.position[0],
                    player.position[2] - this.position[2]
                ];
                this.targetRotation = Math.atan2(toPlayer[0], toPlayer[1]);

                // Add some randomness
                this.targetRotation += Utils.random(-0.5, 0.5);
                this.state = 'pursue';
            } else {
                // Random direction
                this.targetRotation = Math.random() * Math.PI * 2;
                this.state = 'wander';
            }
        }

        // Shooting logic
        if (player.alive && this.shootTimer <= 0) {
            // Calculate angle to player
            const toPlayer = [
                player.position[0] - this.position[0],
                player.position[2] - this.position[2]
            ];
            const angleToPlayer = Math.atan2(toPlayer[0], toPlayer[1]);
            const angleDiff = Math.abs(Utils.normalizeAngle(angleToPlayer - this.rotation));

            // Turn to face player and shoot
            this.targetRotation = angleToPlayer;

            if (angleDiff < 0.3) {
                // Check line of sight - don't fire if mountain blocks
                if (this.hasLineOfSight) {
                    this.state = 'shoot';
                    this.shouldShoot = true;
                    this.shootTimer = shootInterval;
                }
            }
        }
    }

    // Check if there's a clear line of sight to target (no mountains blocking)
    checkLineOfSight(targetPos, terrain) {
        const dx = targetPos[0] - this.position[0];
        const dz = targetPos[2] - this.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Check along the path for mountain collisions
        const steps = Math.ceil(dist / 5); // Check every 5 units
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const checkX = this.position[0] + dx * t;
            const checkZ = this.position[2] + dz * t;

            // Check against mountains
            for (const mountain of terrain.mountains) {
                const mountainRadius = 8 * mountain.scale;
                const mdx = checkX - mountain.position[0];
                const mdz = checkZ - mountain.position[2];
                const mdist = Math.sqrt(mdx * mdx + mdz * mdz);

                if (mdist < mountainRadius) {
                    return false; // Mountain blocking
                }
            }
        }
        return true; // Clear line of sight
    }

    getShootDirection(player) {
        // Aim directly at player (enemies are accurate!)
        const dir = [
            player.position[0] - this.position[0],
            1 - this.position[1], // Aim at player center
            player.position[2] - this.position[2]
        ];

        const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);

        return [
            dir[0] / len,
            dir[1] / len,
            dir[2] / len
        ];
    }

    takeDamage() {
        if (this.invulnerable) return false;
        this.alive = false;
        return true;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        mat4.rotateY(matrix, matrix, this.rotation);
        return matrix;
    }
}

// UFO enemy for bonus content
class UFO {
    constructor(config = {}) {
        this.id = config.id || `ufo_${Date.now()}`;
        this.position = config.position ? [...config.position] : [0, 20, 0];
        this.rotation = 0;
        this.velocity = [0, 0, 0];

        this.collisionRadius = 3.0;
        this.height = 2.0;
        this.speed = config.speed || 4;  // SLOWED from 12 to 4

        this.alive = true;
        this.shootTimer = Utils.random(5, 8);  // Slower shooting
        this.shootCooldown = 6;  // Longer cooldown

        this.color = [0.7, 0.7, 0.9]; // Lighter metallic color
        this.points = 500;

        // Movement pattern - slower
        this.moveAngle = Math.random() * Math.PI * 2;
        this.bobPhase = Math.random() * Math.PI * 2;
    }

    update(deltaTime, player, terrain) {
        if (!this.alive) return;

        // Update shooting
        this.shootTimer -= deltaTime;

        // Rotate slowly
        this.rotation += deltaTime * 0.3;

        // Move in a slower pattern
        this.moveAngle += deltaTime * 0.1;  // SLOWED from 0.3
        this.bobPhase += deltaTime * 1.5;   // Slower bob

        const moveX = Math.cos(this.moveAngle);
        const moveZ = Math.sin(this.moveAngle);

        this.position[0] += moveX * this.speed * deltaTime;
        this.position[2] += moveZ * this.speed * deltaTime;

        // Bob up and down gently
        this.position[1] = 12 + Math.sin(this.bobPhase) * 2;  // Lower and gentler

        // Keep in bounds
        terrain.clampToBounds(this.position, 20);

        // Shooting
        if (player.alive && this.shootTimer <= 0) {
            this.shouldShoot = true;
            this.shootTimer = this.shootCooldown;
        }
    }

    getShootDirection(player) {
        const dir = [
            player.position[0] - this.position[0],
            player.position[1] + 1 - this.position[1],
            player.position[2] - this.position[2]
        ];

        const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);

        return [dir[0] / len, dir[1] / len, dir[2] / len];
    }

    takeDamage() {
        this.alive = false;
        return true;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        mat4.rotateY(matrix, matrix, this.rotation);
        mat4.scale(matrix, matrix, [2, 0.5, 2]);
        return matrix;
    }
}

// Enemy manager
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.ufo = null;
        this.maxEnemies = 5;
        this.spawnTimer = 0;
        this.spawnInterval = 5;

        // Difficulty settings (can be overridden)
        this.difficultySettings = {
            enemyMaxSpeed: 5,
            enemyShootCooldown: 5,
            enemyPlayerBias: 0.4,
            ufoSpawnLevel: 3
        };
    }

    // Set difficulty from game settings
    setDifficulty(settings) {
        this.difficultySettings = {
            enemyMaxSpeed: settings.enemyMaxSpeed || 5,
            enemyShootCooldown: settings.enemyShootCooldown || 5,
            enemyPlayerBias: settings.enemyPlayerBias || 0.4,
            ufoSpawnLevel: settings.ufoSpawnLevel || 3
        };
    }

    spawnEnemy(terrain, player, level = 1) {
        if (this.enemies.length >= this.maxEnemies) return null;

        // Get spawn position at edge, out of player's view
        const viewDir = {
            from: player.position,
            dir: Utils.angleToVector(player.rotation)
        };

        const avoidPositions = [
            player.position,
            ...this.enemies.map(e => e.position)
        ];

        const position = terrain.getEdgeSpawnPosition(avoidPositions, viewDir);

        // Use difficulty settings with level scaling
        const ds = this.difficultySettings;
        const config = {
            position: position,
            maxSpeed: ds.enemyMaxSpeed + level * 0.5,
            shootCooldown: Math.max(2, ds.enemyShootCooldown - level * 0.2),
            playerBias: Math.min(0.85, ds.enemyPlayerBias + level * 0.05)
        };

        const enemy = new EnemyTank(config);
        this.enemies.push(enemy);

        return enemy;
    }

    spawnUFO(terrain) {
        if (this.ufo && this.ufo.alive) return null;

        this.ufo = new UFO({
            position: [
                Utils.random(-50, 50),
                20,
                Utils.random(-50, 50)
            ]
        });

        return this.ufo;
    }

    update(deltaTime, player, terrain, obstacles, physics, level) {
        // Update spawn timer
        this.spawnTimer += deltaTime;

        // Spawn new enemy if needed
        if (this.enemies.filter(e => e.alive).length < this.maxEnemies) {
            if (this.spawnTimer >= this.spawnInterval / level) {
                this.spawnEnemy(terrain, player, level);
                this.spawnTimer = 0;
            }
        }

        // Update enemies
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            enemy.update(
                deltaTime, player, terrain, obstacles,
                this.enemies.filter(e => e.id !== enemy.id),
                physics, level
            );
        }

        // Update UFO
        if (this.ufo && this.ufo.alive) {
            this.ufo.update(deltaTime, player, terrain);
        }
    }

    getEnemiesNeedingToShoot() {
        const shooters = [];

        for (const enemy of this.enemies) {
            if (enemy.alive && enemy.shouldShoot) {
                shooters.push(enemy);
                enemy.shouldShoot = false;
            }
        }

        if (this.ufo && this.ufo.alive && this.ufo.shouldShoot) {
            shooters.push(this.ufo);
            this.ufo.shouldShoot = false;
        }

        return shooters;
    }

    removeDeadEnemies() {
        const deadCount = this.enemies.filter(e => !e.alive).length;
        this.enemies = this.enemies.filter(e => e.alive);
        return deadCount;
    }

    getAllEntities() {
        const entities = [...this.enemies];
        if (this.ufo && this.ufo.alive) {
            entities.push(this.ufo);
        }
        return entities;
    }

    getAliveCount() {
        let count = this.enemies.filter(e => e.alive).length;
        if (this.ufo && this.ufo.alive) count++;
        return count;
    }

    clear() {
        this.enemies = [];
        this.ufo = null;
        this.spawnTimer = 0;
    }

    reset(terrain, player, level = 1, initialCount = 3) {
        this.clear();

        // Spawn initial enemies
        for (let i = 0; i < initialCount; i++) {
            this.spawnEnemy(terrain, player, level);
        }
    }
}

// Make available globally
window.EnemyTank = EnemyTank;
window.UFO = UFO;
window.EnemyManager = EnemyManager;
