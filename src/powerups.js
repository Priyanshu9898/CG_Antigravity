// Battlezone - Power-Up System

const PowerUpType = {
    SHIELD: 'shield',
    FREEZE: 'freeze',
    XRAY: 'xray'
};

class PowerUp {
    constructor(config = {}) {
        this.id = config.id || `powerup_${Date.now()}_${Math.random()}`;
        this.position = config.position ? [...config.position] : [0, 0, 0];
        this.type = config.type || PowerUpType.SHIELD;
        this.collisionRadius = 1.5;
        this.collected = false;
        this.lifetime = config.lifetime || 30;
        this.age = 0;

        // Animation
        this.rotation = 0;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Visual based on type
        this.color = this.getColorForType();
        this.duration = this.getDurationForType();
    }

    getColorForType() {
        switch (this.type) {
            case PowerUpType.SHIELD: return [0.2, 0.5, 1.0]; // Blue
            case PowerUpType.FREEZE: return [0.5, 0.9, 1.0]; // Cyan
            case PowerUpType.XRAY: return [0.8, 0.2, 0.8]; // Purple
            default: return [1, 1, 1];
        }
    }

    getDurationForType() {
        switch (this.type) {
            case PowerUpType.SHIELD: return 10;
            case PowerUpType.FREEZE: return 5;
            case PowerUpType.XRAY: return 15;
            default: return 10;
        }
    }

    update(deltaTime) {
        if (this.collected) return;

        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.collected = true;
            return;
        }

        // Rotate and bob
        this.rotation += deltaTime * 2;
        this.bobPhase += deltaTime * 3;
    }

    checkCollection(player) {
        if (this.collected) return false;

        const dist = Utils.distance2D(
            this.position[0], this.position[2],
            player.position[0], player.position[2]
        );

        if (dist < this.collisionRadius + player.collisionRadius) {
            this.collected = true;
            return true;
        }

        return false;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        const bobHeight = 1.5 + Math.sin(this.bobPhase) * 0.3;

        mat4.translate(matrix, matrix, [
            this.position[0],
            this.position[1] + bobHeight,
            this.position[2]
        ]);
        mat4.rotateY(matrix, matrix, this.rotation);
        mat4.scale(matrix, matrix, [0.8, 0.8, 0.8]);

        return matrix;
    }
}

class PowerUpManager {
    constructor() {
        this.powerups = [];
        this.activePowerups = {};
        this.spawnTimer = 0;
        this.spawnInterval = 20;
        this.maxPowerups = 3;
    }

    spawn(terrain, avoidPositions = []) {
        if (this.powerups.length >= this.maxPowerups) return null;

        // Random type
        const types = Object.values(PowerUpType);
        const type = types[Utils.randomInt(0, types.length - 1)];

        // Find position
        const position = terrain.getRandomSpawnPosition(20, avoidPositions, 10);

        const powerup = new PowerUp({
            position: position,
            type: type
        });

        this.powerups.push(powerup);
        return powerup;
    }

    update(deltaTime, player, terrain) {
        // Update spawn timer
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval && this.powerups.length < this.maxPowerups) {
            this.spawn(terrain, [player.position]);
            this.spawnTimer = 0;
        }

        // Update powerups
        const collectedPowerups = [];

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];

            powerup.update(deltaTime);

            if (powerup.checkCollection(player)) {
                this.activate(powerup.type, powerup.duration);
                collectedPowerups.push(powerup);
            }

            if (powerup.collected) {
                this.powerups.splice(i, 1);
            }
        }

        // Update active powerup timers
        for (const type in this.activePowerups) {
            this.activePowerups[type] -= deltaTime;

            if (this.activePowerups[type] <= 0) {
                delete this.activePowerups[type];
            }
        }

        return collectedPowerups;
    }

    activate(type, duration) {
        this.activePowerups[type] = duration;
    }

    isActive(type) {
        return this.activePowerups[type] > 0;
    }

    getActiveTypes() {
        return Object.keys(this.activePowerups);
    }

    getRemainingTime(type) {
        return this.activePowerups[type] || 0;
    }

    applyEffects(player, enemies) {
        // Shield effect
        if (this.isActive(PowerUpType.SHIELD)) {
            player.invulnerable = true;
            player.invulnerabilityTime = this.activePowerups[PowerUpType.SHIELD];
        }

        // Freeze effect - enemies don't move
        // This is handled in the enemy update loop by checking this.isActive(PowerUpType.FREEZE)
    }

    isFreezeActive() {
        return this.isActive(PowerUpType.FREEZE);
    }

    isXRayActive() {
        return this.isActive(PowerUpType.XRAY);
    }

    clear() {
        this.powerups = [];
        this.activePowerups = {};
        this.spawnTimer = 0;
    }
}

// Make available globally
window.PowerUpType = PowerUpType;
window.PowerUp = PowerUp;
window.PowerUpManager = PowerUpManager;
