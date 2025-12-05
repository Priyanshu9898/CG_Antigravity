// Battlezone - Physics Engine

class PhysicsEngine {
    constructor() {
        this.gravity = -9.8;
        this.airResistance = 0.98;
        this.groundFriction = 0.9;
    }

    // Update entity with velocity and acceleration
    updateEntity(entity, deltaTime) {
        if (!entity.velocity) {
            entity.velocity = [0, 0, 0];
        }

        // Apply gravity if entity is in air
        if (entity.useGravity && entity.position[1] > 0) {
            entity.velocity[1] += this.gravity * deltaTime;
        }

        // Apply air resistance
        entity.velocity[0] *= this.airResistance;
        entity.velocity[2] *= this.airResistance;

        // Update position
        entity.position[0] += entity.velocity[0] * deltaTime;
        entity.position[1] += entity.velocity[1] * deltaTime;
        entity.position[2] += entity.velocity[2] * deltaTime;

        // Ground collision
        if (entity.position[1] < 0) {
            entity.position[1] = 0;
            entity.velocity[1] = 0;

            // Apply ground friction
            entity.velocity[0] *= this.groundFriction;
            entity.velocity[2] *= this.groundFriction;
        }
    }

    // Apply tank-like movement with acceleration/deceleration
    updateTankMovement(tank, input, deltaTime, config = {}) {
        const maxSpeed = config.maxSpeed || 15;
        const acceleration = config.acceleration || 25;
        const deceleration = config.deceleration || 20;
        const turnSpeed = config.turnSpeed || 2.0;
        const turnSpeedMoving = config.turnSpeedMoving || 1.5;

        // Current speed along forward direction
        const forward = Utils.angleToVector(tank.rotation);
        const currentSpeed = tank.velocity ?
            (tank.velocity[0] * forward[0] + tank.velocity[2] * forward[2]) : 0;

        // Initialize velocity if needed
        if (!tank.velocity) {
            tank.velocity = [0, 0, 0];
        }

        // Determine target speed
        let targetSpeed = 0;
        if (input.forward) targetSpeed = maxSpeed;
        if (input.backward) targetSpeed = -maxSpeed * 0.5;

        // Accelerate/decelerate toward target speed
        let newSpeed = currentSpeed;
        if (targetSpeed > currentSpeed) {
            newSpeed = Math.min(targetSpeed, currentSpeed + acceleration * deltaTime);
        } else if (targetSpeed < currentSpeed) {
            newSpeed = Math.max(targetSpeed, currentSpeed - deceleration * deltaTime);
        } else {
            // Natural deceleration when no input
            if (Math.abs(currentSpeed) > 0.1) {
                const sign = currentSpeed > 0 ? 1 : -1;
                newSpeed = currentSpeed - sign * deceleration * 0.5 * deltaTime;
                if (sign * newSpeed < 0) newSpeed = 0;
            } else {
                newSpeed = 0;
            }
        }

        // Apply new velocity
        tank.velocity[0] = forward[0] * newSpeed;
        tank.velocity[2] = forward[2] * newSpeed;

        // Rotation (slower when moving)
        const effectiveTurnSpeed = Math.abs(newSpeed) > 0.5 ? turnSpeedMoving : turnSpeed;
        if (input.left) {
            tank.rotation += effectiveTurnSpeed * deltaTime;
        }
        if (input.right) {
            tank.rotation -= effectiveTurnSpeed * deltaTime;
        }

        // Normalize rotation
        tank.rotation = Utils.normalizeAngle(tank.rotation);

        // Update position
        tank.position[0] += tank.velocity[0] * deltaTime;
        tank.position[2] += tank.velocity[2] * deltaTime;

        // Store speed for audio
        tank.currentSpeed = newSpeed;

        return newSpeed;
    }

    // Update projectile with ballistic trajectory (gravity)
    updateBallisticProjectile(projectile, deltaTime) {
        if (!projectile.velocity) return false;

        // Apply gravity
        projectile.velocity[1] += this.gravity * deltaTime;

        // Update position
        projectile.position[0] += projectile.velocity[0] * deltaTime;
        projectile.position[1] += projectile.velocity[1] * deltaTime;
        projectile.position[2] += projectile.velocity[2] * deltaTime;

        // Check if hit ground
        if (projectile.position[1] <= 0) {
            projectile.position[1] = 0;
            return true; // Hit ground
        }

        return false; // Still in flight
    }

    // Update straight-line projectile (non-ballistic)
    updateStraightProjectile(projectile, deltaTime) {
        if (!projectile.velocity) return;

        projectile.position[0] += projectile.velocity[0] * deltaTime;
        projectile.position[1] += projectile.velocity[1] * deltaTime;
        projectile.position[2] += projectile.velocity[2] * deltaTime;
    }

    // Update guided missile (homes toward target) - improved tracking
    updateGuidedMissile(missile, target, deltaTime) {
        if (!target || !missile.velocity) return;

        // Check if target still alive
        if (!target.alive) {
            // Target destroyed, keep flying straight
            this.updateStraightProjectile(missile, deltaTime);
            return;
        }

        const turnRate = missile.turnRate || 3.5;  // Faster turning
        const speed = missile.speed || 30;  // Faster speed

        // Direction to target (predict slightly ahead)
        const toTarget = [
            target.position[0] - missile.position[0],
            target.position[1] + 1.5 - missile.position[1], // Aim at center of target
            target.position[2] - missile.position[2]
        ];

        // Normalize
        const dist = Math.sqrt(toTarget[0] * toTarget[0] + toTarget[1] * toTarget[1] + toTarget[2] * toTarget[2]);
        if (dist > 0.001) {
            toTarget[0] /= dist;
            toTarget[1] /= dist;
            toTarget[2] /= dist;
        }

        // Current direction
        const currentDir = [
            missile.velocity[0],
            missile.velocity[1],
            missile.velocity[2]
        ];
        const currentSpeed = Math.sqrt(currentDir[0] * currentDir[0] + currentDir[1] * currentDir[1] + currentDir[2] * currentDir[2]);
        if (currentSpeed > 0.001) {
            currentDir[0] /= currentSpeed;
            currentDir[1] /= currentSpeed;
            currentDir[2] /= currentSpeed;
        }

        // Lerp toward target direction
        const t = Math.min(1, turnRate * deltaTime);
        const newDir = [
            Utils.lerp(currentDir[0], toTarget[0], t),
            Utils.lerp(currentDir[1], toTarget[1], t),
            Utils.lerp(currentDir[2], toTarget[2], t)
        ];

        // Normalize and apply speed
        const newDirLen = Math.sqrt(newDir[0] * newDir[0] + newDir[1] * newDir[1] + newDir[2] * newDir[2]);
        if (newDirLen > 0.001) {
            missile.velocity[0] = (newDir[0] / newDirLen) * speed;
            missile.velocity[1] = (newDir[1] / newDirLen) * speed;
            missile.velocity[2] = (newDir[2] / newDirLen) * speed;
        }

        // Update position
        missile.position[0] += missile.velocity[0] * deltaTime;
        missile.position[1] += missile.velocity[1] * deltaTime;
        missile.position[2] += missile.velocity[2] * deltaTime;

        // Keep above ground
        if (missile.position[1] < 0.5) {
            missile.position[1] = 0.5;
            if (missile.velocity[1] < 0) {
                missile.velocity[1] = 0;
            }
        }

        // Update rotation to face velocity direction
        missile.rotation = Math.atan2(missile.velocity[0], missile.velocity[2]);
    }

    // Calculate ballistic trajectory for shooting
    calculateBallisticShot(origin, target, speed) {
        const dx = target[0] - origin[0];
        const dy = target[1] - origin[1];
        const dz = target[2] - origin[2];

        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        // Calculate launch angle for reaching target
        const g = Math.abs(this.gravity);
        const v2 = speed * speed;
        const v4 = v2 * v2;

        // Discriminant for quadratic formula
        const discriminant = v4 - g * (g * horizontalDist * horizontalDist + 2 * dy * v2);

        if (discriminant < 0) {
            // Target unreachable, shoot straight
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return [
                (dx / len) * speed,
                (dy / len) * speed + 5, // Add some arc
                (dz / len) * speed
            ];
        }

        // Low trajectory angle
        const angle = Math.atan2(v2 - Math.sqrt(discriminant), g * horizontalDist);

        // Horizontal direction
        const horizontalDir = [dx / horizontalDist, 0, dz / horizontalDist];

        // Velocity components
        const vHorizontal = speed * Math.cos(angle);
        const vVertical = speed * Math.sin(angle);

        return [
            horizontalDir[0] * vHorizontal,
            vVertical,
            horizontalDir[2] * vHorizontal
        ];
    }

    // Apply explosion force to entities
    applyExplosionForce(center, radius, force, entities) {
        for (const entity of entities) {
            if (!entity.velocity) entity.velocity = [0, 0, 0];

            const dx = entity.position[0] - center[0];
            const dy = entity.position[1] - center[1];
            const dz = entity.position[2] - center[2];

            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < radius && dist > 0.001) {
                const falloff = 1 - (dist / radius);
                const impulse = force * falloff;

                entity.velocity[0] += (dx / dist) * impulse;
                entity.velocity[1] += (dy / dist) * impulse * 0.5 + impulse * 0.3;
                entity.velocity[2] += (dz / dist) * impulse;
            }
        }
    }
}

// Make available globally
window.PhysicsEngine = PhysicsEngine;
