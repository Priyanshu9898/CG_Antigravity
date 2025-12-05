// Battlezone - Main Entry Point

(function () {
    'use strict';

    // Global game instance
    let game = null;

    // Initialize when DOM is ready
    function init() {
        console.log('Battlezone - Initializing...');

        // Get canvas
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Canvas not found!');
            return;
        }

        // Set canvas size
        resizeCanvas(canvas);

        // Create game instance
        game = new Game({
            use3DGameplay: false,  // DISABLED: Tanks stay on ground (y=0)
            useBallistics: false,  // Use straight-line projectiles per requirements
            enableSecondPlayer: false  // Set to true for second player
        });

        // Initialize game
        try {
            game.init(canvas);
            console.log('Game initialized successfully');
        } catch (e) {
            console.error('Failed to initialize game:', e);
            return;
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            resizeCanvas(canvas);
            if (game && game.renderer) {
                game.renderer.resize();
            }
        });

        // Start game loop
        requestAnimationFrame(gameLoop);
    }

    function resizeCanvas(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function gameLoop(time) {
        if (game) {
            game.update(time);
            game.render();
        }

        requestAnimationFrame(gameLoop);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose game globally for debugging
    window.battlezone = {
        getGame: () => game,
        toggleDebug: () => {
            if (game) {
                game.debug = !game.debug;
                console.log('Debug mode:', game.debug);
            }
        },
        setLevel: (level) => {
            if (game) {
                game.level = level;
                game.ui.updateLevel(level);
                game.enemyManager.reset(game.terrain, game.player, level, 3 + level);
                console.log('Level set to:', level);
            }
        },
        addScore: (points) => {
            if (game) {
                game.score += points;
                game.ui.updateScore(game.score);
            }
        },
        toggleBallistics: () => {
            if (game) {
                game.config.useBallistics = !game.config.useBallistics;
                console.log('Ballistics:', game.config.useBallistics);
            }
        },
        toggle3D: () => {
            if (game) {
                game.config.use3DGameplay = !game.config.use3DGameplay;
                game.terrain = new Terrain({
                    size: 200,
                    use3DGameplay: game.config.use3DGameplay,
                    maxElevation: 5
                });
                console.log('3D Gameplay:', game.config.use3DGameplay);
            }
        },
        spawnUFO: () => {
            if (game) {
                game.enemyManager.spawnUFO(game.terrain);
                console.log('UFO spawned');
            }
        },
        spawnPowerUp: (type) => {
            if (game) {
                const t = type || 'shield';
                game.powerupManager.spawn(game.terrain, [game.player.position]);
                console.log('Power-up spawned');
            }
        }
    };
})();
