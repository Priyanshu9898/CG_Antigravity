// Battlezone - Projectile System

class Projectile {
    constructor(config = {}) {
        this.id = config.id || `projectile_${Date.now()}_${Math.random()}`;
        this.ownerId = config.ownerId;
        this.position = config.position ? [...config.position] : [0, 1, 0];
        this.velocity = config.velocity ? [...config.velocity] : [0, 0, 0];
        this.rotation = config.rotation || 0;
        this.speed = config.speed || 50;
        this.damage = config.damage || 1;
        this.lifetime = config.lifetime || 5;
        this.age = 0;
        this.alive = true;
        this.type = config.type || 'normal'; // normal, guided, ballistic
        this.target = config.target || null;
        this.turnRate = config.turnRate || 3.5; // Faster turning for guided missiles

        // Visual properties - larger for better visibility
        this.color = config.color || [1, 0.8, 0.2];
        this.scale = config.scale || 2.0; // Larger projectile (was 1)
        this.trail = [];
        this.maxTrailLength = 10;
    }

    update(deltaTime, physics, terrain) {
        if (!this.alive) return;

        this.age += deltaTime;

        // Check lifetime
        if (this.age >= this.lifetime) {
            this.alive = false;
            return;
        }

        // Store trail position
        if (this.trail.length >= this.maxTrailLength) {
            this.trail.shift();
        }
        this.trail.push([...this.position]);

        // Update based on type
        switch (this.type) {
            case 'ballistic':
                const hitGround = physics.updateBallisticProjectile(this, deltaTime);
                if (hitGround) {
                    this.alive = false;
                }
                break;

            case 'guided':
                physics.updateGuidedMissile(this, this.target, deltaTime);
                break;

            default:
                physics.updateStraightProjectile(this, deltaTime);
                break;
        }

        // Check bounds
        if (terrain && !terrain.isInBounds(this.position[0], this.position[2], -10)) {
            this.alive = false;
        }

        // Check below ground
        if (this.position[1] < 0) {
            this.alive = false;
        }

        // Update rotation based on velocity
        if (this.velocity[0] !== 0 || this.velocity[2] !== 0) {
            this.rotation = Math.atan2(this.velocity[0], this.velocity[2]);
        }
    }

    checkCollisions(obstacles, entities, excludeId = null) {
        if (!this.alive) return null;

        // Check obstacle collision
        for (const obstacle of obstacles) {
            const sizeX = obstacle.size[0];
            const sizeY = obstacle.size[1];
            const sizeZ = obstacle.size[2];

            let box;

            if (obstacle.type === 'pyramid') {
                // Pyramid geometry base goes from -1 to +1
                box = {
                    minX: obstacle.position[0] - sizeX,
                    maxX: obstacle.position[0] + sizeX,
                    minY: 0,
                    maxY: sizeY,
                    minZ: obstacle.position[2] - sizeZ,
                    maxZ: obstacle.position[2] + sizeZ
                };
            } else {
                // Cube geometry goes from -0.5 to +0.5
                box = {
                    minX: obstacle.position[0] - sizeX / 2,
                    maxX: obstacle.position[0] + sizeX / 2,
                    minY: 0,
                    maxY: sizeY,
                    minZ: obstacle.position[2] - sizeZ / 2,
                    maxZ: obstacle.position[2] + sizeZ / 2
                };
            }

            if (Collision.pointVsAabb(
                this.position[0], this.position[1], this.position[2], box
            )) {
                this.alive = false;
                return { type: 'obstacle', target: obstacle };
            }
        }

        // Check entity collision
        const hitEntity = Collision.checkProjectileCollision(this, entities, excludeId);
        if (hitEntity) {
            this.alive = false;
            return { type: 'entity', target: hitEntity };
        }

        return null;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, this.position);
        mat4.rotateY(matrix, matrix, this.rotation);
        mat4.scale(matrix, matrix, [this.scale, this.scale, this.scale * 2]);
        return matrix;
    }
}

class ProjectileManager {
    constructor() {
        this.projectiles = [];
        this.maxProjectiles = 50;
    }

    createProjectile(config) {
        // Remove oldest if at max
        if (this.projectiles.length >= this.maxProjectiles) {
            this.projectiles.shift();
        }

        const projectile = new Projectile(config);
        this.projectiles.push(projectile);
        return projectile;
    }

    fireFromEntity(entity, config = {}) {
        // Calculate spawn position in front of entity
        const forward = Utils.angleToVector(entity.rotation);
        const spawnOffset = config.spawnOffset || 2.5;
        const height = config.height || 1.2;

        const position = [
            entity.position[0] + forward[0] * spawnOffset,
            entity.position[1] + height,
            entity.position[2] + forward[2] * spawnOffset
        ];

        // Calculate velocity
        const speed = config.speed || 50;
        let velocity;

        if (config.targetPosition) {
            // Aim at target
            const dir = [
                config.targetPosition[0] - position[0],
                config.targetPosition[1] - position[1] + 1, // Aim slightly higher
                config.targetPosition[2] - position[2]
            ];
            const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
            velocity = [
                (dir[0] / len) * speed,
                (dir[1] / len) * speed,
                (dir[2] / len) * speed
            ];
        } else {
            // Fire in aim direction (uses turret pitch if available)
            let direction;
            if (entity.getShootDirection) {
                direction = entity.getShootDirection();
            } else {
                direction = [forward[0], 0, forward[2]];
            }
            velocity = [
                direction[0] * speed,
                direction[1] * speed,
                direction[2] * speed
            ];
        }

        return this.createProjectile({
            ownerId: entity.id,
            position: position,
            velocity: velocity,
            rotation: entity.rotation,
            speed: speed,
            type: config.type || 'normal',
            target: config.target,
            color: config.color,
            ...config
        });
    }

    update(deltaTime, physics, terrain, obstacles, entities) {
        const hits = [];

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            // Update projectile
            projectile.update(deltaTime, physics, terrain);

            // Check collisions
            if (projectile.alive) {
                const excludeId = projectile.ownerId;
                const hit = projectile.checkCollisions(obstacles, entities, excludeId);

                if (hit) {
                    hits.push({
                        projectile: projectile,
                        ...hit
                    });
                }
            }

            // Remove dead projectiles
            if (!projectile.alive) {
                this.projectiles.splice(i, 1);
            }
        }

        return hits;
    }

    getProjectilesForOwner(ownerId) {
        return this.projectiles.filter(p => p.ownerId === ownerId && p.alive);
    }

    hasActiveProjectile(ownerId) {
        return this.projectiles.some(p => p.ownerId === ownerId && p.alive);
    }

    clear() {
        this.projectiles = [];
    }
}

// Particle effect for explosions and visual effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    emit(config) {
        const count = config.count || 20;
        const position = config.position || [0, 0, 0];
        const color = config.color || [1, 0.5, 0];
        const speed = config.speed || 10;
        const lifetime = config.lifetime || 1;
        const size = config.size || 0.3;
        const spread = config.spread || 1;

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                this.particles.shift();
            }

            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = Math.random() * speed * spread;

            this.particles.push({
                position: [...position],
                velocity: [
                    Math.sin(phi) * Math.cos(theta) * r,
                    Math.cos(phi) * r * 0.5 + speed * 0.5,
                    Math.sin(phi) * Math.sin(theta) * r
                ],
                color: [...color],
                lifetime: lifetime * (0.5 + Math.random() * 0.5),
                age: 0,
                size: size * (0.5 + Math.random() * 0.5)
            });
        }
    }

    createExplosion(position, scale = 1) {
        // Core explosion
        this.emit({
            position: position,
            color: [1, 0.8, 0.2],
            count: 30 * scale,
            speed: 15 * scale,
            lifetime: 0.5,
            size: 0.5 * scale,
            spread: 0.8
        });

        // Smoke
        this.emit({
            position: position,
            color: [0.3, 0.3, 0.3],
            count: 20 * scale,
            speed: 8 * scale,
            lifetime: 1.5,
            size: 0.8 * scale,
            spread: 0.5
        });

        // Sparks
        this.emit({
            position: position,
            color: [1, 0.3, 0],
            count: 15 * scale,
            speed: 20 * scale,
            lifetime: 0.8,
            size: 0.2 * scale,
            spread: 1.2
        });
    }

    createHitSpark(position) {
        this.emit({
            position: position,
            color: [1, 1, 0.5],
            count: 10,
            speed: 5,
            lifetime: 0.3,
            size: 0.15,
            spread: 0.5
        });
    }

    update(deltaTime) {
        const gravity = -15;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.age += deltaTime;

            if (p.age >= p.lifetime) {
                this.particles.splice(i, 1);
                continue;
            }

            // Apply gravity
            p.velocity[1] += gravity * deltaTime;

            // Update position
            p.position[0] += p.velocity[0] * deltaTime;
            p.position[1] += p.velocity[1] * deltaTime;
            p.position[2] += p.velocity[2] * deltaTime;

            // Bounce off ground
            if (p.position[1] < 0) {
                p.position[1] = 0;
                p.velocity[1] *= -0.3;
                p.velocity[0] *= 0.8;
                p.velocity[2] *= 0.8;
            }
        }
    }

    clear() {
        this.particles = [];
    }
}

// Make available globally
window.Projectile = Projectile;
window.ProjectileManager = ProjectileManager;
window.ParticleSystem = ParticleSystem;
