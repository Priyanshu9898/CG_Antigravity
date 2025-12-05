// Battlezone - Utility Functions

const Utils = {
    // Convert degrees to radians
    degToRad: function (degrees) {
        return degrees * Math.PI / 180;
    },

    // Convert radians to degrees
    radToDeg: function (radians) {
        return radians * 180 / Math.PI;
    },

    // Random number between min and max
    random: function (min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random integer between min and max (inclusive)
    randomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Clamp value between min and max
    clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    // Linear interpolation
    lerp: function (a, b, t) {
        return a + (b - a) * t;
    },

    // Distance between two 2D points
    distance2D: function (x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    },

    // Distance between two 3D points
    distance3D: function (p1, p2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    // Normalize angle to -PI to PI
    normalizeAngle: function (angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },

    // Create a unit vector from angle (in XZ plane)
    angleToVector: function (angle) {
        return [Math.sin(angle), 0, Math.cos(angle)];
    },

    // Get angle from vector (in XZ plane)
    vectorToAngle: function (vec) {
        return Math.atan2(vec[0], vec[2]);
    },

    // Check if point is within bounds
    isInBounds: function (x, z, bounds) {
        return x >= bounds.minX && x <= bounds.maxX &&
            z >= bounds.minZ && z <= bounds.maxZ;
    },

    // Generate random position within bounds
    randomPosition: function (bounds, margin = 0) {
        return [
            Utils.random(bounds.minX + margin, bounds.maxX - margin),
            0,
            Utils.random(bounds.minZ + margin, bounds.maxZ - margin)
        ];
    },

    // Generate position at edge of bounds
    randomEdgePosition: function (bounds, margin = 5) {
        const side = Utils.randomInt(0, 3);
        let x, z;

        switch (side) {
            case 0: // Top
                x = Utils.random(bounds.minX + margin, bounds.maxX - margin);
                z = bounds.maxZ - margin;
                break;
            case 1: // Right
                x = bounds.maxX - margin;
                z = Utils.random(bounds.minZ + margin, bounds.maxZ - margin);
                break;
            case 2: // Bottom
                x = Utils.random(bounds.minX + margin, bounds.maxX - margin);
                z = bounds.minZ + margin;
                break;
            case 3: // Left
                x = bounds.minX + margin;
                z = Utils.random(bounds.minZ + margin, bounds.maxZ - margin);
                break;
        }

        return [x, 0, z];
    },

    // Simple 2D noise function for terrain
    noise2D: function (x, z, seed = 0) {
        const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    },

    // Smoothstep function
    smoothstep: function (edge0, edge1, x) {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    // Ease in out
    easeInOut: function (t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },

    // Color utilities
    hexToRgb: function (hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    },

    // Create transformation matrix
    createTransformMatrix: function (position, rotation, scale) {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, position);
        mat4.rotateY(matrix, matrix, rotation);
        if (scale) {
            if (typeof scale === 'number') {
                mat4.scale(matrix, matrix, [scale, scale, scale]);
            } else {
                mat4.scale(matrix, matrix, scale);
            }
        }
        return matrix;
    }
};

// Make available globally
window.Utils = Utils;
