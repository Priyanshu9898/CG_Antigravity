// Battlezone - Collision Detection System

const Collision = {
    // AABB collision check
    aabbVsAabb: function (a, b) {
        return (
            a.minX <= b.maxX && a.maxX >= b.minX &&
            a.minY <= b.maxY && a.maxY >= b.minY &&
            a.minZ <= b.maxZ && a.maxZ >= b.minZ
        );
    },

    // Circle vs Circle (2D, on ground plane)
    circleVsCircle: function (x1, z1, r1, x2, z2, r2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const distSq = dx * dx + dz * dz;
        const radiusSum = r1 + r2;
        return distSq <= radiusSum * radiusSum;
    },

    // Point vs Circle (2D)
    pointVsCircle: function (px, pz, cx, cz, radius) {
        const dx = px - cx;
        const dz = pz - cz;
        return dx * dx + dz * dz <= radius * radius;
    },

    // Point vs AABB
    pointVsAabb: function (px, py, pz, box) {
        return (
            px >= box.minX && px <= box.maxX &&
            py >= box.minY && py <= box.maxY &&
            pz >= box.minZ && pz <= box.maxZ
        );
    },

    // Ray vs AABB
    rayVsAabb: function (origin, direction, box) {
        let tmin = -Infinity;
        let tmax = Infinity;

        for (let i = 0; i < 3; i++) {
            const axis = ['minX', 'minY', 'minZ'][i];
            const axisMax = ['maxX', 'maxY', 'maxZ'][i];

            if (Math.abs(direction[i]) < 0.0001) {
                // Ray is parallel to slab
                if (origin[i] < box[axis] || origin[i] > box[axisMax]) {
                    return null;
                }
            } else {
                const t1 = (box[axis] - origin[i]) / direction[i];
                const t2 = (box[axisMax] - origin[i]) / direction[i];

                const tNear = Math.min(t1, t2);
                const tFar = Math.max(t1, t2);

                tmin = Math.max(tmin, tNear);
                tmax = Math.min(tmax, tFar);

                if (tmin > tmax || tmax < 0) {
                    return null;
                }
            }
        }

        const t = tmin >= 0 ? tmin : tmax;
        if (t < 0) return null;

        return {
            t: t,
            point: [
                origin[0] + direction[0] * t,
                origin[1] + direction[1] * t,
                origin[2] + direction[2] * t
            ]
        };
    },

    // Ray vs Sphere
    rayVsSphere: function (origin, direction, center, radius) {
        const oc = [
            origin[0] - center[0],
            origin[1] - center[1],
            origin[2] - center[2]
        ];

        const a = direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2];
        const b = 2 * (oc[0] * direction[0] + oc[1] * direction[1] + oc[2] * direction[2]);
        const c = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - radius * radius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0) return null;

        return {
            t: t,
            point: [
                origin[0] + direction[0] * t,
                origin[1] + direction[1] * t,
                origin[2] + direction[2] * t
            ]
        };
    },

    // Line segment vs Circle (2D)
    lineVsCircle: function (x1, z1, x2, z2, cx, cz, radius) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const fx = x1 - cx;
        const fz = z1 - cz;

        const a = dx * dx + dz * dz;
        const b = 2 * (fx * dx + fz * dz);
        const c = fx * fx + fz * fz - radius * radius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        if (t1 >= 0 && t1 <= 1) {
            return { t: t1, point: [x1 + dx * t1, 0, z1 + dz * t1] };
        }
        if (t2 >= 0 && t2 <= 1) {
            return { t: t2, point: [x1 + dx * t2, 0, z1 + dz * t2] };
        }

        return null;
    },

    // Get AABB from position and size
    getAABB: function (position, size) {
        const halfSize = typeof size === 'number' ?
            [size / 2, size / 2, size / 2] :
            [size[0] / 2, size[1] / 2, size[2] / 2];

        return {
            minX: position[0] - halfSize[0],
            maxX: position[0] + halfSize[0],
            minY: position[1] - halfSize[1],
            maxY: position[1] + halfSize[1],
            minZ: position[2] - halfSize[2],
            maxZ: position[2] + halfSize[2]
        };
    },

    // Get AABB from entity with collision radius
    getEntityAABB: function (entity) {
        const r = entity.collisionRadius || 1;
        const h = entity.height || 2;
        return {
            minX: entity.position[0] - r,
            maxX: entity.position[0] + r,
            minY: entity.position[1],
            maxY: entity.position[1] + h,
            minZ: entity.position[2] - r,
            maxZ: entity.position[2] + r
        };
    },

    // Resolve collision between two circles (push apart)
    resolveCircleCollision: function (entity1, entity2) {
        const dx = entity2.position[0] - entity1.position[0];
        const dz = entity2.position[2] - entity1.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.001) {
            // Entities at same position, push in random direction
            return {
                x: Math.random() - 0.5,
                z: Math.random() - 0.5
            };
        }

        const r1 = entity1.collisionRadius || 1;
        const r2 = entity2.collisionRadius || 1;
        const overlap = (r1 + r2) - dist;

        if (overlap > 0) {
            const nx = dx / dist;
            const nz = dz / dist;

            return {
                x: -nx * overlap * 0.5,
                z: -nz * overlap * 0.5
            };
        }

        return null;
    },

    // Check if position would collide with obstacles
    checkObstacleCollision: function (position, radius, obstacles) {
        for (const obstacle of obstacles) {
            // Get obstacle size
            const sizeX = obstacle.size[0];
            const sizeY = obstacle.size[1];
            const sizeZ = obstacle.size[2];

            let box;

            if (obstacle.type === 'pyramid') {
                // Pyramid geometry base goes from -1 to +1 (2 units total)
                // When scaled by sizeX, it extends from -sizeX to +sizeX
                box = {
                    minX: obstacle.position[0] - sizeX,
                    maxX: obstacle.position[0] + sizeX,
                    minY: 0,
                    maxY: sizeY,
                    minZ: obstacle.position[2] - sizeZ,
                    maxZ: obstacle.position[2] + sizeZ
                };
            } else {
                // Cube geometry goes from -0.5 to +0.5 (1 unit total)
                // When scaled by sizeX, it extends from -sizeX/2 to +sizeX/2
                box = {
                    minX: obstacle.position[0] - sizeX / 2,
                    maxX: obstacle.position[0] + sizeX / 2,
                    minY: 0,
                    maxY: sizeY,
                    minZ: obstacle.position[2] - sizeZ / 2,
                    maxZ: obstacle.position[2] + sizeZ / 2
                };
            }

            // Expand box by entity radius for collision
            box.minX -= radius;
            box.maxX += radius;
            box.minZ -= radius;
            box.maxZ += radius;

            if (position[0] >= box.minX && position[0] <= box.maxX &&
                position[2] >= box.minZ && position[2] <= box.maxZ) {
                return obstacle;
            }
        }
        return null;
    },

    // Check projectile collision with entities
    checkProjectileCollision: function (projectile, entities, excludeId = null) {
        const pos = projectile.position;

        for (const entity of entities) {
            if (entity.id === excludeId) continue;
            if (entity.invulnerable) continue;

            const r = entity.collisionRadius || 1.5;

            if (this.pointVsCircle(pos[0], pos[2], entity.position[0], entity.position[2], r)) {
                // Also check Y range
                const h = entity.height || 2;
                if (pos[1] >= entity.position[1] && pos[1] <= entity.position[1] + h) {
                    return entity;
                }
            }
        }

        return null;
    },

    // Spatial hash for efficient broad-phase collision
    createSpatialHash: function (cellSize) {
        return {
            cellSize: cellSize,
            cells: new Map(),

            clear: function () {
                this.cells.clear();
            },

            getKey: function (x, z) {
                const cx = Math.floor(x / this.cellSize);
                const cz = Math.floor(z / this.cellSize);
                return `${cx},${cz}`;
            },

            insert: function (entity) {
                const key = this.getKey(entity.position[0], entity.position[2]);
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key).push(entity);
            },

            getNearby: function (x, z, radius) {
                const nearby = [];
                const cellRadius = Math.ceil(radius / this.cellSize);

                const cx = Math.floor(x / this.cellSize);
                const cz = Math.floor(z / this.cellSize);

                for (let dx = -cellRadius; dx <= cellRadius; dx++) {
                    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                        const key = `${cx + dx},${cz + dz}`;
                        const cell = this.cells.get(key);
                        if (cell) {
                            nearby.push(...cell);
                        }
                    }
                }

                return nearby;
            }
        };
    }
};

// Make available globally
window.Collision = Collision;
