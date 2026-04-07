const Monsters = (() => {
    let monsters = [], killCount = 0, bossAlive = false;

    function reset() { monsters = []; killCount = 0; bossAlive = false; }

    function spawn(x, y, type) {
        const d = CONFIG.MONSTERS[type];
        const m = {
            x: x + 0.5, y: y + 0.5, type,
            hp: d.hp, maxHp: d.hp, speed: d.speed, damage: d.damage,
            color: d.color, radius: 0.4, sightRange: d.sightRange,
            attackRange: d.attackRange, ranged: d.ranged,
            boss: d.boss || false,
            state: 'IDLE', stateTimer: 0, lastAttackTime: 0,
            attackCooldown: d.boss ? 2.0 : 1.0,
            targetX: x + 0.5, targetY: y + 0.5,
            angle: Math.random() * Math.PI * 2,
            alertX: 0, alertY: 0, alive: true, hurtTimer: 0,
            phase: 1, // Boss phase
        };
        monsters.push(m);
        Sprites.add(m);
        if (m.boss) bossAlive = true;
        return m;
    }

    function takeDamage(m, amount) {
        if (!m.alive) return false;
        m.hp -= amount;
        m.hurtTimer = 0.15;
        if (m.hp <= 0) {
            m.alive = false; m.hp = 0; killCount++;
            Sprites.remove(m);
            const idx = monsters.indexOf(m);
            if (idx >= 0) monsters.splice(idx, 1);
            if (m.boss) { bossAlive = false; Memory.setBossDefeated(true); }
            return true;
        }
        // Update boss phase
        if (m.boss) {
            if (m.hp < m.maxHp * 0.3) m.phase = 3;
            else if (m.hp < m.maxHp * 0.6) m.phase = 2;
        }
        return false;
    }

    function spawnForFloor(floorIdx, floorScale) {
        const rooms = GameMap.getRooms();
        const bossRoomIdx = GameMap.getBossRoomIdx();
        const floorCfg = CONFIG.FLOORS[Math.min(floorIdx, CONFIG.FLOORS.length - 1)];
        const scale = 1 + (floorScale || 0) * 0.25;

        for (let i = 1; i < rooms.length; i++) {
            const r = rooms[i];
            if (i === bossRoomIdx) {
                // Boss
                const boss = spawn(r.cx, r.cy, floorCfg.bossType);
                boss.hp = Math.floor(boss.hp * scale);
                boss.maxHp = boss.hp;
                boss.damage = Math.floor(boss.damage * scale);
                continue;
            }

            if (r.type === 'safe') continue;

            const count = 1 + Math.floor(Math.random() * (2 + floorIdx));
            for (let j = 0; j < count; j++) {
                const mx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
                const my = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
                const types = floorCfg.monsterTypes;
                const type = types[Math.floor(Math.random() * types.length)];
                const m = spawn(mx, my, type);
                m.hp = Math.floor(m.hp * scale);
                m.maxHp = m.hp;
                m.damage = Math.floor(m.damage * scale);
            }
        }
    }

    function getAlive() { return monsters.filter(m => m.alive); }
    function getKillCount() { return killCount; }
    function isBossAlive() { return bossAlive; }
    return { reset, spawn, takeDamage, spawnForFloor, getAlive, getKillCount, isBossAlive };
})();
