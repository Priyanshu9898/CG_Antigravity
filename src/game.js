// Battlezone - Game State Manager

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    LEVEL_COMPLETE: 'levelcomplete'
};

class Game {
    constructor(config = {}) {
        // Core systems
        this.renderer = null;
        this.audio = null;
        this.physics = null;
        this.ui = null;

        // Game objects
        this.terrain = null;
        this.player = null;
        this.player2 = null;
        this.enemyManager = null;
        this.projectileManager = null;
        this.particleSystem = null;
        this.powerupManager = null;

        // Game state
        this.state = GameState.MENU;
        this.score = 0;
        this.lives = 10;
        this.level = 1;
        this.alternateMode = false;
        this.difficulty = 'medium'; // easy, medium, hard

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.radarBeepTimer = 0;
        this.radarBeepInterval = 2;

        // Difficulty presets
        this.difficultySettings = {
            easy: {
                enemyMaxSpeed: 4,           // Slightly faster (was 3)
                enemyShootCooldown: 4,      // More aggressive (was 7)
                enemyPlayerBias: 0.4,       // More aggressive (was 0.2)
                startingLives: 10,
                ufoSpawnLevel: 1  // UFO spawns from level 1
            },
            medium: {
                enemyMaxSpeed: 5,
                enemyShootCooldown: 5,
                enemyPlayerBias: 0.4,
                startingLives: 5,
                ufoSpawnLevel: 1  // UFO spawns from level 1
            },
            hard: {
                enemyMaxSpeed: 8,
                enemyShootCooldown: 3,
                enemyPlayerBias: 0.7,
                startingLives: 3,
                ufoSpawnLevel: 1  // UFO spawns from level 1
            }
        };

        // Configuration
        this.config = {
            use3DGameplay: config.use3DGameplay || false,
            useBallistics: config.useBallistics || false,
            enableSecondPlayer: config.enableSecondPlayer || false,
            ...config
        };
    }

    init(canvas) {
        // Initialize renderer
        this.renderer = new Renderer(canvas);

        // Initialize audio
        this.audio = new AudioManager();

        // Initialize physics
        this.physics = new PhysicsEngine();

        // Initialize UI
        this.ui = new UI();
        this.ui.init();

        // Initialize terrain
        this.terrain = new Terrain({
            size: 200,
            use3DGameplay: this.config.use3DGameplay,
            maxElevation: 5
        });

        // Update renderer with terrain for 3D ground
        if (this.config.use3DGameplay) {
            this.renderer.setTerrain(this.terrain);
        }

        // Initialize player
        this.player = new Player({
            position: [0, 0, 0]
        });

        // Initialize second player if enabled
        if (this.config.enableSecondPlayer) {
            this.player2 = new Player2({
                position: [5, 0, 0]
            });
        }

        // Initialize managers
        this.enemyManager = new EnemyManager();
        this.projectileManager = new ProjectileManager();
        this.particleSystem = new ParticleSystem();
        this.powerupManager = new PowerUpManager();

        // Set up input handlers
        this.setupInput();

        // Show menu
        this.showMenu();
    }

    setupInput() {
        // Keyboard down
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Keyboard up
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });

        // Prevent default for game keys
        document.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
                e.preventDefault();
            }
        });

        // Click to initialize audio
        document.addEventListener('click', () => {
            this.audio.init();
            this.audio.resume();
        }, { once: true });

        // Difficulty button handlers
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.audio.init();
                this.audio.resume();
                this.difficulty = e.target.dataset.difficulty;
                this.startGame();
            });
        });

        // 2-Player toggle button handler
        const toggle2PlayerBtn = document.getElementById('toggle-2player');
        if (toggle2PlayerBtn) {
            toggle2PlayerBtn.addEventListener('click', () => {
                this.config.enableSecondPlayer = !this.config.enableSecondPlayer;
                toggle2PlayerBtn.textContent = this.config.enableSecondPlayer ? '2 PLAYER: ON' : '2 PLAYER: OFF';
                toggle2PlayerBtn.classList.toggle('active', this.config.enableSecondPlayer);

                // Show/hide Player 2 controls info
                const p2Controls = document.getElementById('p2-controls');
                if (p2Controls) {
                    p2Controls.classList.toggle('hidden', !this.config.enableSecondPlayer);
                }
            });
        }
    }

    handleKeyDown(e) {
        // Global keys
        switch (e.code) {
            case 'Enter':
                if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
                    this.startGame();
                } else if (this.state === GameState.LEVEL_COMPLETE) {
                    this.nextLevel();
                }
                return;

            case 'KeyP':
                if (this.state === GameState.PLAYING) {
                    this.pause();
                } else if (this.state === GameState.PAUSED) {
                    this.resume();
                }
                return;

            case 'KeyM':
                this.audio.toggle();
                this.ui.showStatus(this.audio.enabled ? 'SOUND ON' : 'SOUND OFF');
                return;

            case 'Digit1':
                if (e.shiftKey) { // ! key
                    this.toggleAlternateMode();
                }
                return;
        }

        // Player 1 controls
        if (this.state === GameState.PLAYING && this.player) {
            switch (e.code) {
                case 'ArrowUp':
                    this.player.input.forward = true;
                    break;
                case 'ArrowDown':
                    this.player.input.backward = true;
                    break;
                case 'ArrowLeft':
                    this.player.input.left = true;
                    break;
                case 'ArrowRight':
                    this.player.input.right = true;
                    break;
                case 'KeyW':
                    // Always enable turret pitch for UFO targeting
                    this.player.input.turretUp = true;
                    if (this.player2) {
                        this.player2.input.forward = true;
                    }
                    break;
                case 'KeyS':
                    // Always enable turret pitch for UFO targeting
                    this.player.input.turretDown = true;
                    if (this.player2) {
                        this.player2.input.backward = true;
                    }
                    break;
                case 'KeyA':
                    if (this.player2) {
                        this.player2.input.left = true;
                    }
                    break;
                case 'KeyD':
                    if (this.player2) {
                        this.player2.input.right = true;
                    }
                    break;
                case 'Space':
                    this.playerShoot(this.player);
                    break;
                case 'KeyE':
                    // Fire guided missile
                    this.playerShootGuided(this.player);
                    break;
                case 'KeyG':
                    if (this.player2) {
                        this.playerShoot(this.player2);
                    }
                    break;
                case 'KeyT':
                    // Player 2 guided missile
                    if (this.player2) {
                        this.playerShootGuided(this.player2);
                    }
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.player.toggleView();
                    this.ui.updateViewMode(this.player.thirdPerson);
                    break;
            }
        }
    }

    handleKeyUp(e) {
        // Player 1 controls
        if (this.player) {
            switch (e.code) {
                case 'ArrowUp':
                    this.player.input.forward = false;
                    break;
                case 'ArrowDown':
                    this.player.input.backward = false;
                    break;
                case 'ArrowLeft':
                    this.player.input.left = false;
                    break;
                case 'ArrowRight':
                    this.player.input.right = false;
                    break;
                case 'KeyW':
                    this.player.input.turretUp = false;
                    if (this.player2) {
                        this.player2.input.forward = false;
                    }
                    break;
                case 'KeyS':
                    this.player.input.turretDown = false;
                    if (this.player2) {
                        this.player2.input.backward = false;
                    }
                    break;
                case 'KeyA':
                    if (this.player2) {
                        this.player2.input.left = false;
                    }
                    break;
                case 'KeyD':
                    if (this.player2) {
                        this.player2.input.right = false;
                    }
                    break;
            }
        }
    }

    playerShoot(player) {
        if (!player.alive || !player.canShoot) return;

        // Check if player already has an active projectile
        if (this.projectileManager.hasActiveProjectile(player.id)) {
            return;
        }

        // Create projectile
        this.projectileManager.fireFromEntity(player, {
            type: this.config.useBallistics ? 'ballistic' : 'normal',
            speed: 60,
            color: [1, 0.9, 0.3]
        });

        this.audio.playShot();
    }

    playerShootGuided(player) {
        if (!player.alive || !player.canShoot) return;

        // Check if player already has an active projectile
        if (this.projectileManager.hasActiveProjectile(player.id + '_guided')) {
            return;
        }

        // Find nearest enemy to target
        let nearestEnemy = null;
        let nearestDist = Infinity;

        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.alive) continue;

            const dist = Utils.distance2D(
                player.position[0], player.position[2],
                enemy.position[0], enemy.position[2]
            );

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        // Check UFO too
        if (this.enemyManager.ufo && this.enemyManager.ufo.alive) {
            const ufo = this.enemyManager.ufo;
            const dist = Utils.distance2D(
                player.position[0], player.position[2],
                ufo.position[0], ufo.position[2]
            );
            if (dist < nearestDist) {
                nearestEnemy = ufo;
            }
        }

        if (!nearestEnemy) {
            this.ui.showStatus('NO TARGET!', 1000);
            return;
        }

        // Fire guided missile
        const forward = Utils.angleToVector(player.rotation);
        const position = [
            player.position[0] + forward[0] * 2.5,
            player.position[1] + 1.5,
            player.position[2] + forward[2] * 2.5
        ];

        const speed = 25;
        this.projectileManager.createProjectile({
            id: player.id + '_guided_' + Date.now(),
            ownerId: player.id + '_guided',
            position: position,
            velocity: [forward[0] * speed, 0, forward[2] * speed],
            speed: speed,
            type: 'guided',
            target: nearestEnemy,
            turnRate: 3.0,
            color: [0.5, 1.0, 0.5], // Green for guided
            lifetime: 8
        });

        this.audio.playShot();
        this.ui.showStatus('MISSILE LAUNCHED!', 1000);
    }

    enemyShoot(enemy, player) {
        const direction = enemy.getShootDirection(player);
        const speed = 35;

        const position = [
            enemy.position[0] + direction[0] * 2.5,
            enemy.position[1] + 1.2,
            enemy.position[2] + direction[2] * 2.5
        ];

        this.projectileManager.createProjectile({
            ownerId: enemy.id,
            position: position,
            velocity: [
                direction[0] * speed,
                direction[1] * speed,
                direction[2] * speed
            ],
            color: [1, 0.3, 0.3],
            type: this.config.useBallistics ? 'ballistic' : 'normal'
        });

        this.audio.playShot();
    }

    showMenu() {
        this.state = GameState.MENU;
        this.ui.showGameMessage('BATTLEZONE', 'Press ENTER to Start', true);
    }

    startGame() {
        this.audio.init();
        this.audio.resume();

        // Get difficulty settings
        const settings = this.difficultySettings[this.difficulty] || this.difficultySettings.medium;

        this.state = GameState.PLAYING;
        this.score = 0;
        this.lives = settings.startingLives;
        this.level = 1;

        // Reset player
        // Reset player
        const spawnPos = this.terrain.getRandomSpawnPosition(10, [], 20);
        this.player.respawn(spawnPos);
        this.player.rotation = 0;

        // Create/remove Player 2 based on toggle
        if (this.config.enableSecondPlayer) {
            if (!this.player2) {
                this.player2 = new Player2({
                    position: [5, 0, 0]
                });
            }
            this.player2.respawn([5, 0, 0]);
            this.player2.rotation = 0;
        } else {
            this.player2 = null;
        }

        // Reset managers with difficulty settings
        this.enemyManager.setDifficulty(settings);
        this.enemyManager.reset(this.terrain, this.player, this.level, 3);
        this.projectileManager.clear();
        this.particleSystem.clear();
        this.powerupManager.clear();

        // Update UI
        this.ui.hideGameMessage();
        this.ui.updateScore(this.score);
        this.ui.updateLives(this.lives);
        this.ui.updateLevel(this.level);
        this.ui.updateViewMode(this.player.thirdPerson);

        const modeText = this.config.enableSecondPlayer ? '2 PLAYER ' : '';
        this.ui.showStatus(`${modeText}${this.difficulty.toUpperCase()} MODE - GAME START!`, 2000);
    }

    pause() {
        this.state = GameState.PAUSED;
        this.ui.showGameMessage('PAUSED', 'Press P to Resume', false);
    }

    resume() {
        this.state = GameState.PLAYING;
        this.ui.hideGameMessage();
    }

    nextLevel() {
        this.level++;
        this.state = GameState.PLAYING;

        // Increase difficulty
        this.enemyManager.maxEnemies = Math.min(8, 3 + this.level);
        this.enemyManager.reset(this.terrain, this.player, this.level, 3 + this.level);

        // Clear projectiles
        this.projectileManager.clear();

        // Spawn UFO at higher levels
        if (this.level >= 3 && Math.random() > 0.5) {
            this.enemyManager.spawnUFO(this.terrain);
        }

        this.ui.hideGameMessage();
        this.ui.updateLevel(this.level);
        this.ui.showStatus(`LEVEL ${this.level}`, 2000);

        this.audio.playLevelUp();
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        this.ui.showGameMessage('GAME OVER', `Final Score: ${this.score}\nPress ENTER to Restart`, false);
        this.audio.playGameOver();
    }

    toggleAlternateMode() {
        this.alternateMode = !this.alternateMode;
        this.ui.setAlternateMode(this.alternateMode);
        this.ui.showStatus(this.alternateMode ? 'DESERT STORM MODE' : 'CLASSIC MODE', 2000);

        // Apply visual changes
        if (this.alternateMode) {
            // Change colors for desert theme
            this.terrain.obstacles.forEach(o => {
                o.color = [0.7, 0.6, 0.4]; // Sandy color
            });
            this.terrain.mountains.forEach(m => {
                m.color = [0.6, 0.5, 0.35];
            });
        } else {
            // Restore original colors
            this.terrain.obstacles.forEach(o => {
                o.color = [0.4, 0.35, 0.3];
            });
            this.terrain.mountains.forEach(m => {
                m.color = [0.3, 0.35, 0.25];
            });
        }
    }

    update(time) {
        // Calculate delta time
        this.deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state !== GameState.PLAYING) return;

        // Update radar beep
        this.radarBeepTimer += this.deltaTime;
        if (this.radarBeepTimer >= this.radarBeepInterval) {
            this.audio.playRadarBeep();
            this.radarBeepTimer = 0;
        }

        // Update player
        if (this.player.alive) {
            this.player.update(
                this.deltaTime,
                this.physics,
                this.terrain,
                this.terrain.obstacles,
                this.enemyManager.getAllEntities()
            );

            this.audio.updateEngine(this.player.currentSpeed);
        }

        // Update player 2
        if (this.player2 && this.player2.alive) {
            this.player2.update(
                this.deltaTime,
                this.physics,
                this.terrain,
                this.terrain.obstacles,
                this.enemyManager.getAllEntities()
            );
        }

        // Update enemies (freeze if power-up active)
        if (!this.powerupManager.isFreezeActive()) {
            this.enemyManager.update(
                this.deltaTime,
                this.player,
                this.terrain,
                this.terrain.obstacles,
                this.physics,
                this.level
            );

            // Handle enemy shooting
            const shooters = this.enemyManager.getEnemiesNeedingToShoot();
            for (const enemy of shooters) {
                this.enemyShoot(enemy, this.player);
            }

            // Spawn UFO based on level and difficulty
            const ufoSpawnLevel = this.enemyManager.difficultySettings?.ufoSpawnLevel || 1;
            if (this.level >= ufoSpawnLevel && (!this.enemyManager.ufo || !this.enemyManager.ufo.alive)) {
                // Random chance to spawn UFO each frame (~1 every 2 seconds at 60fps)
                if (Math.random() < 0.01) {
                    this.enemyManager.spawnUFO(this.terrain);
                    this.ui.showStatus('WARNING: UFO DETECTED!', 3000);
                }
            }
        }

        // Update projectiles
        const allEntities = [
            this.player,
            ...(this.player2 ? [this.player2] : []),
            ...this.enemyManager.getAllEntities()
        ];

        const hits = this.projectileManager.update(
            this.deltaTime,
            this.physics,
            this.terrain,
            this.terrain.obstacles,
            allEntities
        );

        // Process hits
        for (const hit of hits) {
            if (hit.type === 'entity') {
                const target = hit.target;

                if (target.id === 'player' || target.id === 'player2') {
                    // Player hit
                    if (target.takeDamage()) {
                        this.particleSystem.createExplosion(target.position, 1.5);
                        this.audio.playExplosion();

                        this.lives--;
                        this.ui.updateLives(this.lives);

                        if (this.lives <= 0) {
                            this.gameOver();
                        } else {
                            // Respawn player
                            setTimeout(() => {
                                setTimeout(() => {
                                    const spawnPos = this.terrain.getRandomSpawnPosition(10, [], 20);
                                    target.respawn(spawnPos);
                                    this.ui.showStatus('TANK DESTROYED! RESPAWNING...', 2000);
                                }, 1000);
                            }, 1000);
                        }
                    }
                } else {
                    // Enemy hit
                    if (target.takeDamage()) {
                        this.particleSystem.createExplosion(target.position, 1.5);
                        this.audio.playExplosion();

                        // Add score
                        const points = target.points || 100;
                        this.score += points;
                        this.ui.updateScore(this.score);
                        this.ui.showStatus(`+${points}`, 1000);
                    }
                }
            } else if (hit.type === 'obstacle') {
                this.particleSystem.createHitSpark(hit.projectile.position);
                this.audio.playHit();
            }
        }

        // Clean up dead enemies
        this.enemyManager.removeDeadEnemies();

        // Check level complete
        if (this.enemyManager.getAliveCount() === 0) {
            this.state = GameState.LEVEL_COMPLETE;
            this.ui.showGameMessage('LEVEL COMPLETE!', 'Press ENTER for Next Level', false);
            this.audio.playLevelUp();
        }

        // Update power-ups
        const collected = this.powerupManager.update(this.deltaTime, this.player, this.terrain);
        for (const powerup of collected) {
            this.audio.playPowerUp();
            this.ui.showStatus(`${powerup.type.toUpperCase()} POWER-UP!`, 2000);
        }
        this.powerupManager.applyEffects(this.player, this.enemyManager.enemies);
        this.ui.updatePowerupIndicators(this.powerupManager);

        // Update particles
        this.particleSystem.update(this.deltaTime);

        // Update radar
        this.ui.drawRadar(
            this.player,
            this.enemyManager.enemies,
            this.terrain.obstacles,
            this.terrain,
            this.enemyManager.ufo
        );
    }

    render() {
        const gl = this.renderer.gl;

        // Get clear color based on mode
        const clearColor = this.alternateMode ?
            [0.15, 0.12, 0.08, 1.0] : // Desert tan
            [0.1, 0.2, 0.4, 1.0];     // Night sky blue

        this.renderer.clear(clearColor);
        this.renderer.resize();

        // Set up view and projection matrices
        const viewMatrix = this.player.getViewMatrix();
        const projectionMatrix = mat4.create();
        const aspect = this.renderer.canvas.width / this.renderer.canvas.height;
        mat4.perspective(projectionMatrix, Utils.degToRad(60), aspect, 0.1, 500);

        // Draw skybox
        this.renderer.drawSkybox(viewMatrix, projectionMatrix);

        // Common uniforms
        const fogColor = this.alternateMode ? [0.4, 0.35, 0.25] : [0.1, 0.15, 0.1];
        const lightDir = [0.5, 0.8, 0.3];
        const ambientColor = this.alternateMode ? [0.4, 0.35, 0.3] : [0.2, 0.25, 0.2];

        // Use basic shader program
        this.renderer.useProgram(this.renderer.programs.basic);
        this.renderer.setUniforms({
            uViewMatrix: viewMatrix,
            uProjectionMatrix: projectionMatrix,
            uLightDirection: lightDir,
            uAmbientColor: ambientColor,
            uFog: true,
            uFogColor: fogColor,
            uFogNear: 50,
            uFogFar: 150,
            uUseVertexColor: false,
            uAlpha: 1.0
        });

        // Render ground
        this.renderGround(viewMatrix, projectionMatrix, fogColor, lightDir);

        // Render mountains
        for (const mountain of this.terrain.mountains) {
            const modelMatrix = Utils.createTransformMatrix(
                mountain.position,
                mountain.rotation,
                mountain.scale
            );

            this.renderer.drawGeometry(
                this.renderer.geometries.mountain,
                modelMatrix,
                { uColor: mountain.color }
            );
        }

        // Render obstacles
        const xrayActive = this.powerupManager.isXRayActive();

        for (const obstacle of this.terrain.obstacles) {
            const modelMatrix = mat4.create();

            // Translate to obstacle position
            mat4.translate(modelMatrix, modelMatrix, obstacle.position);
            // Rotate
            mat4.rotateY(modelMatrix, modelMatrix, obstacle.rotation);

            if (obstacle.type === 'pyramid') {
                // Pyramid geometry already starts at y=0, just scale
                // Scale X and Z by size[0], Y by size[1]
                mat4.scale(modelMatrix, modelMatrix, [obstacle.size[0], obstacle.size[1] / 1.5, obstacle.size[2]]);

                this.renderer.drawGeometry(
                    this.renderer.geometries.pyramid,
                    modelMatrix,
                    {
                        uColor: obstacle.color,
                        uAlpha: xrayActive ? 0.3 : 1.0
                    }
                );
            } else {
                // Cube is centered at origin (-0.5 to 0.5)
                // Scale first, then translate up to sit on ground
                mat4.scale(modelMatrix, modelMatrix, obstacle.size);
                mat4.translate(modelMatrix, modelMatrix, [0, 0.5, 0]);

                this.renderer.drawGeometry(
                    this.renderer.geometries.cube,
                    modelMatrix,
                    {
                        uColor: obstacle.color,
                        uAlpha: xrayActive ? 0.3 : 1.0
                    }
                );
            }
        }

        // Render enemies
        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.alive) continue;

            const modelMatrix = enemy.getModelMatrix();
            this.renderer.drawGeometry(
                this.renderer.geometries.tank,
                modelMatrix,
                { uColor: enemy.color }
            );
        }

        // Render UFO (flying saucer shape)
        if (this.enemyManager.ufo && this.enemyManager.ufo.alive) {
            const ufo = this.enemyManager.ufo;
            this.renderer.drawGeometry(
                this.renderer.geometries.ufo, // Flying saucer geometry
                ufo.getModelMatrix(),
                { uColor: ufo.color }
            );
        }

        // Render player (only in third person)
        if (this.player.thirdPerson && this.player.alive && this.player.isVisible()) {
            this.renderer.drawGeometry(
                this.renderer.geometries.tank,
                this.player.getModelMatrix(),
                { uColor: this.player.color }
            );
        }

        // Render player 2
        if (this.player2 && this.player2.alive && this.player2.isVisible()) {
            this.renderer.drawGeometry(
                this.renderer.geometries.tank,
                this.player2.getModelMatrix(),
                { uColor: this.player2.color }
            );
        }

        // Render projectiles
        for (const projectile of this.projectileManager.projectiles) {
            if (!projectile.alive) continue;

            this.renderer.drawGeometry(
                this.renderer.geometries.projectile,
                projectile.getModelMatrix(),
                { uColor: projectile.color }
            );
        }

        // Render power-ups (textured spheres with images)
        for (const powerup of this.powerupManager.powerups) {
            if (powerup.collected) continue;

            // Get texture name based on power-up type
            let textureName = 'shield';
            if (powerup.type === PowerUpType.FREEZE) textureName = 'freeze';
            else if (powerup.type === PowerUpType.XRAY) textureName = 'xray';
            else if (powerup.type === PowerUpType.SPEED) textureName = 'speed';

            this.renderer.drawTexturedGeometry(
                this.renderer.geometries.sphere,
                powerup.getModelMatrix(),
                textureName,
                {
                    uColor: powerup.color,
                    uLightDirection: lightDir,
                    uViewMatrix: viewMatrix,
                    uProjectionMatrix: projectionMatrix,
                    uTime: performance.now() / 1000,
                    uGlow: 0.3
                }
            );
        }

        // Render particles (simplified - just points)
        this.renderParticles(viewMatrix, projectionMatrix);
    }

    renderGround(viewMatrix, projectionMatrix, fogColor, lightDir) {
        // Switch to terrain shader
        this.renderer.useProgram(this.renderer.programs.terrain);

        const groundColor = this.alternateMode ?
            [0.5, 0.45, 0.35] : // Desert sand
            [0.15, 0.2, 0.1];   // Dark green

        const groundColorHigh = this.alternateMode ?
            [0.6, 0.5, 0.3] :
            [0.2, 0.3, 0.15];

        this.renderer.setUniforms({
            uViewMatrix: viewMatrix,
            uProjectionMatrix: projectionMatrix,
            uColorLow: groundColor,
            uColorHigh: groundColorHigh,
            uFog: true,
            uFogColor: fogColor,
            uFogNear: 50,
            uFogFar: 150,
            uLightDirection: lightDir
        });

        const groundMatrix = mat4.create();
        this.renderer.drawGeometry(this.renderer.geometries.ground, groundMatrix, {});

        // Switch back to basic shader
        this.renderer.useProgram(this.renderer.programs.basic);
    }

    renderParticles(viewMatrix, projectionMatrix) {
        if (this.particleSystem.particles.length === 0) return;

        const gl = this.renderer.gl;

        // Use line shader for simple particle rendering
        this.renderer.useProgram(this.renderer.programs.line);
        this.renderer.setUniforms({
            uViewMatrix: viewMatrix,
            uProjectionMatrix: projectionMatrix
        });

        // Draw particles as points
        for (const particle of this.particleSystem.particles) {
            const alpha = 1 - (particle.age / particle.lifetime);
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, particle.position);
            mat4.scale(modelMatrix, modelMatrix, [particle.size, particle.size, particle.size]);

            this.renderer.setUniforms({
                uModelMatrix: modelMatrix,
                uColor: particle.color,
                uAlpha: alpha
            });

            // Draw as small cube
            const gl = this.renderer.gl;
            const geometry = this.renderer.geometries.cube;

            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
            gl.enableVertexAttribArray(this.renderer.programs.line.attributes.aPosition);
            gl.vertexAttribPointer(this.renderer.programs.line.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
            gl.drawElements(gl.TRIANGLES, geometry.vertexCount, gl.UNSIGNED_SHORT, 0);
        }
    }
}

// Make available globally
window.GameState = GameState;
window.Game = Game;
