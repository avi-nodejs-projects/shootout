const Monsters = (() => {
    let monsters = [];
    let killCount = 0;

    function reset() { monsters = []; killCount = 0; }

    function spawn(x, y, type) {
        const d = CONFIG.MONSTERS[type];
        const m = {
            x: x + 0.5, y: y + 0.5, type,
            hp: d.hp, maxHp: d.hp, speed: d.speed, damage: d.damage,
            color: d.color, radius: d.radius, sightRange: d.sightRange,
            attackRange: d.attackRange, ranged: d.ranged,
            state: 'IDLE', stateTimer: 0, lastAttackTime: 0, attackCooldown: 1.0,
            targetX: x + 0.5, targetY: y + 0.5,
            angle: Math.random() * Math.PI * 2,
            alertX: 0, alertY: 0, alive: true, hurtTimer: 0,
            roomId: GameMap.getRoomAt(x, y),
        };
        monsters.push(m);
        Sprites.add(m);
        return m;
    }

    function takeDamage(m, amount) {
        if (!m.alive) return false;
        m.hp -= amount;
        m.hurtTimer = 0.15;
        if (m.hp <= 0) {
            m.alive = false;
            m.hp = 0;
            killCount++;
            Sprites.remove(m);
            const idx = monsters.indexOf(m);
            if (idx >= 0) monsters.splice(idx, 1);
            return true;
        }
        return false;
    }

    function spawnInRooms() {
        const rooms = GameMap.getRooms();
        const types = Object.keys(CONFIG.MONSTERS);
        for (let i = 1; i < rooms.length; i++) {
            const r = rooms[i];
            const danger = i / rooms.length;
            const count = 1 + Math.floor(danger * 3);
            for (let j = 0; j < count; j++) {
                const mx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
                const my = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
                if (GameMap.getGrid()[my][mx] === CONFIG.TILE.FLOOR) {
                    // Weighted type selection by danger
                    let type;
                    if (danger < 0.3) type = Math.random() < 0.7 ? 'DRONE' : 'SWARM';
                    else if (danger < 0.6) type = types[Math.floor(Math.random() * 3)]; // DRONE, SENTINEL, LURKER
                    else type = types[Math.floor(Math.random() * types.length)];
                    spawn(mx, my, type);
                }
            }
        }
    }

    function getAlive() { return monsters.filter(m => m.alive); }
    function getKillCount() { return killCount; }
    return { reset, spawn, takeDamage, spawnInRooms, getAlive, getKillCount };
})();
