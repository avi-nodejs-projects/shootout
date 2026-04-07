// Cover obstacles (crates, pillars, barrels)
const Obstacles = (() => {
    let obstacles = [];

    const TYPES = {
        CRATE:   { name: 'Crate',   hp: 30, destructible: true,  blocksShots: true,  color: '#885522', explodes: false },
        PILLAR:  { name: 'Pillar',  hp: 999, destructible: false, blocksShots: true,  color: '#666688', explodes: false },
        BARREL:  { name: 'Barrel',  hp: 20, destructible: true,  blocksShots: false, color: '#ff4400', explodes: true, explosionDmg: 30, explosionRadius: 2 },
    };

    function reset() {
        obstacles = [];
    }

    function placeInRooms() {
        const rooms = GameMap.getRooms();
        const types = Object.keys(TYPES);

        for (let i = 1; i < rooms.length; i++) {
            const room = rooms[i];
            if (room.w < 5 || room.h < 5) continue;

            const count = 1 + Math.floor(Math.random() * 3);
            for (let j = 0; j < count; j++) {
                const ox = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const oy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

                // Don't place on existing obstacles or in room center
                if (GameMap.getGrid()[oy][ox] !== CONFIG.TILE.FLOOR) continue;
                if (ox === room.cx && oy === room.cy) continue;

                const type = types[Math.floor(Math.random() * types.length)];
                const def = TYPES[type];
                const obstacle = {
                    x: ox, y: oy,
                    type, ...def,
                    currentHp: def.hp,
                    destroyed: false,
                };
                obstacles.push(obstacle);
                GameMap.setTile(ox, oy, CONFIG.TILE.OBSTACLE);
            }
        }
    }

    function getAt(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        return obstacles.find(o => o.x === gx && o.y === gy && !o.destroyed);
    }

    function takeDamage(obstacle, dmg) {
        if (!obstacle.destructible || obstacle.destroyed) return false;
        obstacle.currentHp -= dmg;
        if (obstacle.currentHp <= 0) {
            obstacle.destroyed = true;
            GameMap.setTile(obstacle.x, obstacle.y, CONFIG.TILE.FLOOR);
            if (obstacle.explodes) {
                return { explosion: true, x: obstacle.x + 0.5, y: obstacle.y + 0.5, damage: obstacle.explosionDmg, radius: obstacle.explosionRadius };
            }
            return { destroyed: true };
        }
        return false;
    }

    function isNearCover(x, y, threatX, threatY) {
        const gx = Math.floor(x), gy = Math.floor(y);
        // Check adjacent tiles for cover between us and threat
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const cx = gx + dx, cy = gy + dy;
                const obs = obstacles.find(o => o.x === cx && o.y === cy && !o.destroyed && o.blocksShots);
                if (obs) {
                    // Check if obstacle is between us and threat
                    const toThreat = Math.atan2(threatY - y, threatX - x);
                    const toCover = Math.atan2(cy + 0.5 - y, cx + 0.5 - x);
                    const angleDiff = Math.abs(toThreat - toCover);
                    if (angleDiff < Math.PI / 3) return { x: cx, y: cy, obstacle: obs };
                }
            }
        }
        return null;
    }

    function getAll() { return obstacles.filter(o => !o.destroyed); }

    return { reset, placeInRooms, getAt, takeDamage, isNearCover, getAll };
})();
