// Battlezone - UI System

class UI {
    constructor() {
        // Get DOM elements
        this.scoreValue = document.getElementById('score-value');
        this.livesValue = document.getElementById('lives-value');
        this.levelValue = document.getElementById('level-value');
        this.viewLabel = document.getElementById('view-label');
        this.statusMessage = document.getElementById('status-message');
        this.gameMessage = document.getElementById('game-message');
        this.messageTitle = document.getElementById('message-title');
        this.messageText = document.getElementById('message-text');
        this.controlsInfo = document.getElementById('controls-info');
        this.powerupIndicators = document.getElementById('powerup-indicators');
        this.shieldIndicator = document.getElementById('shield-indicator');
        this.freezeIndicator = document.getElementById('freeze-indicator');
        this.xrayIndicator = document.getElementById('xray-indicator');
        this.speedIndicator = document.getElementById('speed-indicator');

        // Radar canvas
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas.getContext('2d');

        this.statusTimeout = null;
    }

    init() {
        // Set radar canvas size
        const container = this.radarCanvas.parentElement;
        this.radarCanvas.width = container.clientWidth;
        this.radarCanvas.height = container.clientHeight;
    }

    updateScore(score) {
        if (this.scoreValue) {
            this.scoreValue.textContent = score.toString().padStart(6, '0');
        }
    }

    updateLives(lives) {
        if (this.livesValue) {
            this.livesValue.textContent = lives;
        }
    }

    updateLevel(level) {
        if (this.levelValue) {
            this.levelValue.textContent = level;
        }
    }

    updateViewMode(isThirdPerson) {
        if (this.viewLabel) {
            this.viewLabel.textContent = isThirdPerson ? '3RD PERSON' : '1ST PERSON';
        }
    }

    showStatus(message, duration = 2000) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message;
            this.statusMessage.classList.add('visible');

            if (this.statusTimeout) {
                clearTimeout(this.statusTimeout);
            }

            this.statusTimeout = setTimeout(() => {
                this.statusMessage.classList.remove('visible');
            }, duration);
        }
    }

    showGameMessage(title, text, showControls = false) {
        if (this.gameMessage) {
            this.messageTitle.textContent = title;
            this.messageText.textContent = text;
            this.controlsInfo.style.display = showControls ? 'block' : 'none';
            this.gameMessage.classList.remove('hidden');
        }
    }

    hideGameMessage() {
        if (this.gameMessage) {
            this.gameMessage.classList.add('hidden');
        }
    }

    updatePowerupIndicators(powerupManager) {
        if (!this.powerupIndicators) return;

        const hasAny = powerupManager.getActiveTypes().length > 0;
        this.powerupIndicators.classList.toggle('hidden', !hasAny);

        // Update individual indicators - only update the span text, keep images
        if (this.shieldIndicator) {
            const shieldTime = powerupManager.getRemainingTime(PowerUpType.SHIELD);
            this.shieldIndicator.classList.toggle('hidden', shieldTime <= 0);
            if (shieldTime > 0) {
                const span = this.shieldIndicator.querySelector('span');
                if (span) span.textContent = `SHIELD (${Math.ceil(shieldTime)}s)`;
            }
        }

        if (this.freezeIndicator) {
            const freezeTime = powerupManager.getRemainingTime(PowerUpType.FREEZE);
            this.freezeIndicator.classList.toggle('hidden', freezeTime <= 0);
            if (freezeTime > 0) {
                const span = this.freezeIndicator.querySelector('span');
                if (span) span.textContent = `FREEZE (${Math.ceil(freezeTime)}s)`;
            }
        }

        if (this.xrayIndicator) {
            const xrayTime = powerupManager.getRemainingTime(PowerUpType.XRAY);
            this.xrayIndicator.classList.toggle('hidden', xrayTime <= 0);
            if (xrayTime > 0) {
                const span = this.xrayIndicator.querySelector('span');
                if (span) span.textContent = `RADAR (${Math.ceil(xrayTime)}s)`;
            }
        }

        if (this.speedIndicator) {
            const speedTime = powerupManager.getRemainingTime(PowerUpType.SPEED);
            this.speedIndicator.classList.toggle('hidden', speedTime <= 0);
            if (speedTime > 0) {
                const span = this.speedIndicator.querySelector('span');
                if (span) span.textContent = `SPEED (${Math.ceil(speedTime)}s)`;
            }
        }
    }

    drawRadar(player, enemies, obstacles, terrain, ufo = null) {
        const ctx = this.radarCtx;
        const width = this.radarCanvas.width;
        const height = this.radarCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radarRange = 80; // World units visible on radar
        const scale = Math.min(width, height) / (radarRange * 2);

        // Clear
        ctx.fillStyle = 'rgba(0, 20, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        // Draw range circles
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;

        for (let r = 0.25; r <= 1; r += 0.25) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radarRange * r) * scale, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Transform function: world position to radar position
        const toRadar = (worldX, worldZ) => {
            // Relative to player
            const dx = worldX - player.position[0];
            const dz = worldZ - player.position[2];

            // Rotate by player rotation (radar is player-centric)
            const cos = Math.cos(-player.rotation);
            const sin = Math.sin(-player.rotation);

            const rx = dx * cos - dz * sin;
            const rz = dx * sin + dz * cos;

            return {
                x: centerX + rx * scale,
                y: centerY - rz * scale // Invert Z for screen coords
            };
        };

        // Draw obstacles
        ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
        for (const obstacle of obstacles) {
            const pos = toRadar(obstacle.position[0], obstacle.position[2]);
            const size = (obstacle.size[0] || obstacle.size) * scale;

            ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
        }

        // Draw enemies
        ctx.fillStyle = '#ff3333';
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const pos = toRadar(enemy.position[0], enemy.position[2]);
            const dist = Utils.distance2D(
                player.position[0], player.position[2],
                enemy.position[0], enemy.position[2]
            );

            if (dist < radarRange) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw UFO
        if (ufo && ufo.alive) {
            ctx.fillStyle = '#ff00ff';
            const pos = toRadar(ufo.position[0], ufo.position[2]);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw player (always at center, as a triangle pointing up)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 6);
        ctx.lineTo(centerX - 4, centerY + 4);
        ctx.lineTo(centerX + 4, centerY + 4);
        ctx.closePath();
        ctx.fill();

        // Draw player direction indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - 15);
        ctx.stroke();
    }

    setAlternateMode(enabled) {
        document.body.classList.toggle('alternate-mode', enabled);
    }
}

// Make available globally
window.UI = UI;
