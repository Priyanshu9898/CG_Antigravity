// Battlezone - Player Tank

class Player {
    constructor(config = {}) {
        this.id = 'player';
        this.position = config.position ? [...config.position] : [0, 0, 0];
        this.rotation = config.rotation || 0;
        this.velocity = [0, 0, 0];

        // Tank properties
        this.collisionRadius = 2.0;
        this.height = 2.5;
        this.maxSpeed = 15;
        this.acceleration = 25;
        this.deceleration = 20;
        this.turnSpeed = 2.0;
        this.currentSpeed = 0;

        // Turret for 3D gameplay
        this.turretPitch = 0; // Up/down angle
        this.maxTurretPitch = Math.PI / 4;
        this.minTurretPitch = -Math.PI / 12;

        // Combat
        this.alive = true;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 3.0;
        this.canShoot = true;

        // Camera
        this.thirdPerson = false;
        this.cameraDistance = 10;
        this.cameraHeight = 5;

        // Visual - Dark military green (distinct from terrain)
        this.color = [0.15, 0.35, 0.15]; // Dark military green
        this.flashTimer = 0;

        // Input state
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            turretUp: false,
            turretDown: false,
            shoot: false
        };
    }

    update(deltaTime, physics, terrain, obstacles, enemies) {
        if (!this.alive) return;

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            this.flashTimer += deltaTime;

            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.flashTimer = 0;
            }
        }

        // Store old position for collision
        const oldPosition = [...this.position];

        // Update movement with physics
        physics.updateTankMovement(this, this.input, deltaTime, {
            maxSpeed: this.maxSpeed,
            acceleration: this.acceleration,
            deceleration: this.deceleration,
            turnSpeed: this.turnSpeed
        });

        // Update turret pitch for 3D gameplay
        if (this.input.turretUp) {
            this.turretPitch = Math.min(this.maxTurretPitch, this.turretPitch + deltaTime);
        }
        if (this.input.turretDown) {
            this.turretPitch = Math.max(this.minTurretPitch, this.turretPitch - deltaTime);
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
            this.velocity[0] = 0;
            this.velocity[2] = 0;
        }

        // Check mountain collision (mountains are circular with baseSize=8 * scale)
        for (const mountain of terrain.mountains) {
            const mountainRadius = 8 * mountain.scale; // baseSize * scale

            if (Collision.circleVsCircle(
                this.position[0], this.position[2], this.collisionRadius,
                mountain.position[0], mountain.position[2], mountainRadius
            )) {
                // Push back to old position
                this.position[0] = oldPosition[0];
                this.position[2] = oldPosition[2];
                this.velocity[0] = 0;
                this.velocity[2] = 0;
                break;
            }
        }

        // Check enemy collision
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            if (Collision.circleVsCircle(
                this.position[0], this.position[2], this.collisionRadius,
                enemy.position[0], enemy.position[2], enemy.collisionRadius
            )) {
                // Push back
                const resolution = Collision.resolveCircleCollision(this, enemy);
                if (resolution) {
                    this.position[0] += resolution.x;
                    this.position[2] += resolution.z;
                }
            }
        }

        // Keep in bounds
        terrain.clampToBounds(this.position, 10);
    }

    takeDamage() {
        if (this.invulnerable) return false;

        this.alive = false;
        return true;
    }

    respawn(position) {
        this.position = position ? [...position] : [...this.position];
        this.rotation = 0;
        this.velocity = [0, 0, 0];
        this.alive = true;
        this.invulnerable = true;
        this.invulnerabilityTime = this.invulnerabilityDuration;
        this.turretPitch = 0;
    }

    getViewMatrix() {
        const viewMatrix = mat4.create();

        if (this.thirdPerson) {
            // Third person camera
            const forward = Utils.angleToVector(this.rotation);

            const eyeX = this.position[0] - forward[0] * this.cameraDistance;
            const eyeY = this.position[1] + this.cameraHeight;
            const eyeZ = this.position[2] - forward[2] * this.cameraDistance;

            const targetX = this.position[0] + forward[0] * 5;
            const targetY = this.position[1] + 1.5;
            const targetZ = this.position[2] + forward[2] * 5;

            mat4.lookAt(viewMatrix,
                [eyeX, eyeY, eyeZ],
                [targetX, targetY, targetZ],
                [0, 1, 0]
            );
        } else {
            // First person camera
            const eyeHeight = 2.0;
            const forward = Utils.angleToVector(this.rotation);

            const eyeX = this.position[0];
            const eyeY = this.position[1] + eyeHeight;
            const eyeZ = this.position[2];

            // Apply turret pitch
            const pitchOffset = Math.sin(this.turretPitch) * 10;

            const targetX = eyeX + forward[0] * 10;
            const targetY = eyeY + pitchOffset;
            const targetZ = eyeZ + forward[2] * 10;

            mat4.lookAt(viewMatrix,
                [eyeX, eyeY, eyeZ],
                [targetX, targetY, targetZ],
                [0, 1, 0]
            );
        }

        return viewMatrix;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        mat4.rotateY(matrix, matrix, this.rotation);
        return matrix;
    }

    getShootDirection() {
        const forward = Utils.angleToVector(this.rotation);

        // Apply turret pitch
        const cosPitch = Math.cos(this.turretPitch);
        const sinPitch = Math.sin(this.turretPitch);

        return [
            forward[0] * cosPitch,
            sinPitch,
            forward[2] * cosPitch
        ];
    }

    getForwardDirection() {
        return Utils.angleToVector(this.rotation);
    }

    toggleView() {
        this.thirdPerson = !this.thirdPerson;
    }

    isVisible() {
        // Flash when invulnerable
        if (this.invulnerable) {
            return Math.floor(this.flashTimer * 10) % 2 === 0;
        }
        return true;
    }
}

// Second player support
class Player2 extends Player {
    constructor(config = {}) {
        super(config);
        this.id = 'player2';
        this.color = [0.2, 0.2, 0.6]; // Blue

        // Different controls mapping
        this.keyMap = {
            forward: 'KeyW',
            backward: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            turretUp: 'KeyR',
            turretDown: 'KeyF',
            shoot: 'KeyG'
        };
    }
}

// Make available globally
window.Player = Player;
window.Player2 = Player2;
