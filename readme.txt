BATTLEZONE - WebGL Game
========================

A 3D tank battle game inspired by the classic Battlezone arcade game.
Built with pure WebGL, gl-matrix, HTML5, CSS, and JavaScript.

CONTROLS
--------
Arrow Keys      - Move tank (Up/Down = Forward/Backward, Left/Right = Rotate)
Space           - Fire cannon (straight shot)
E               - Fire guided missile (homes on nearest enemy)
Tab             - Toggle between 1st person and 3rd person view
P               - Pause game
M               - Toggle sound on/off
Shift+1 (!)     - Toggle alternate "Desert Storm" mode

3D Gameplay Controls (terrain elevation enabled):
W/S             - Aim turret up/down (rotates cannon vertically)

FEATURES
--------
Part 1: Project Structure
- Modular JavaScript architecture
- WebGL rendering with custom shaders
- HTML/CSS UI with radar and HUD

Part 2: Display Elements
- 3D battlefield with mountains and obstacles
- Enemy tanks with detailed models
- Radar mini-map with player-centric view
- Crosshair overlay

Part 3: Player Tank Animation
- Smooth movement with acceleration/deceleration
- Rotation controls
- Collision detection with obstacles and enemies
- First-person and third-person camera views

Part 4: Enemy Tank AI
- Weighted random movement (tends toward player)
- Collision avoidance
- Multiple simultaneous enemies
- Difficulty scaling with levels

Part 5: Combat System
- Player shooting with projectile physics
- Enemy shooting (accurately aimed at player)
- Tank destruction with explosion effects
- Player respawn with invulnerability period
- Enemy respawn at map edges

Part 6: Alternate Mode
- Press "!" to toggle "Desert Storm" theme
- Changes color palette to desert/sand tones
- Different atmospheric fog

BONUS FEATURES
--------------
- Score tracking and display
- Third-person view toggle (Tab key)
- Explosion particle effects
- Sound effects (radar beep, shots, explosions)
- Multiple levels with increasing difficulty
- Power-up system (Shield, Freeze, X-Ray)
- Guided missiles (E key - homes on enemies)
- Tank acceleration/deceleration physics
- UFO enemy type (spawns at higher levels)

BROWSER SUPPORT
---------------
- Chrome (recommended)
- Firefox
- Edge
- Any browser with WebGL support

HOW TO RUN
----------
1. Open index.html in a web browser
2. Click anywhere to enable audio
3. Press ENTER to start the game
4. Destroy enemy tanks to score points
5. Survive and progress through levels!

CREDITS
-------
Developed for CSC 461/561 Computer Graphics
Inspired by Atari's Battlezone (1980)

KNOWN ISSUES
------------
- Performance may vary on older hardware
- Some particle effects may not render on all systems
