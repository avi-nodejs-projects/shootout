// Monster entities
const Monsters = (() => {
    let monsters = [];
    let killCount = 0;

    function reset() {
        monsters = [];
        killCount = 0;
    }

    function spawn(x, y, type) {
        const def = CONFIG.MONSTERS[type];
        const monster = {
            x: x + 0.5,
            y: y + 0.5,
            type,
            hp: def.hp,
            maxHp: def.hp,
            speed: def.speed,
            damage: def.damage,
            color: def.color,
            radius: def.radius,
            sightRange: def.sightRange,
            attackRange: def.attackRange,
            state: 'IDLE',
            stateTimer: 0,
            lastAttackTime: 0,
            attackCooldown: 1.0,
            targetX: x + 0.5,
            targetY: y + 0.5,
            angle: Math.random() * Math.PI * 2,
            patrolPoints: [],
            patrolIndex: 0,
            patrolDir: 1,
            alertX: 0,
            alertY: 0,
            alive: true,
            hurtTimer: 0,
        };
        monsters.push(monster);
        Sprites.add(monster);
        return monster;
    }

    function takeDamage(monster, amount) {
        if (!monster.alive) return;
        monster.hp -= amount;
        monster.hurtTimer = 0.15;
        if (monster.hp <= 0) {
            monster.alive = false;
            monster.hp = 0;
            killCount++;
            Sprites.remove(monster);
            const idx = monsters.indexOf(monster);
            if (idx >= 0) monsters.splice(idx, 1);
            return true; // died
        }
        return false;
    }

    function getAlive() {
        return monsters.filter(m => m.alive);
    }

    function getKillCount() {
        return killCount;
    }

    function spawnInRooms() {
        const rooms = GameMap.getRooms();
        const types = Object.keys(CONFIG.MONSTERS);
        // Skip first room (player spawn)
        for (let i = 1; i < rooms.length; i++) {
            const room = rooms[i];
            const count = 1 + Math.floor(Math.random() * 3);
            for (let j = 0; j < count; j++) {
                const mx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const my = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                const type = types[Math.floor(Math.random() * types.length)];
                const monster = spawn(mx, my, type);

                // Set patrol points within room
                for (let p = 0; p < 3; p++) {
                    monster.patrolPoints.push({
                        x: room.x + 1 + Math.random() * (room.w - 2),
                        y: room.y + 1 + Math.random() * (room.h - 2)
                    });
                }
            }
        }
    }

    return { reset, spawn, takeDamage, getAlive, getKillCount, spawnInRooms };
})();
