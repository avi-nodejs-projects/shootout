const Player = (() => {
    let s = {};

    function reset(x, y) {
        s = {
            x: x + 0.5, y: y + 0.5, angle: 0,
            health: CONFIG.PLAYER.MAX_HEALTH, maxHealth: CONFIG.PLAYER.MAX_HEALTH,
            alive: true, speed: CONFIG.PLAYER.SPEED, turnSpeed: CONFIG.PLAYER.TURN_SPEED,
            radius: CONFIG.PLAYER.RADIUS,
            footstepTimer: 0, muzzleFlash: 0,
        };
        Weapons.reset();
    }

    function move(forward, strafe, dt) {
        if (!s.alive) return;
        const spd = s.speed * dt;
        const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
        const dx = cos * forward * spd + Math.cos(s.angle + Math.PI / 2) * strafe * spd;
        const dy = sin * forward * spd + Math.sin(s.angle + Math.PI / 2) * strafe * spd;
        const nx = s.x + dx, ny = s.y + dy;
        if (!GameMap.isWall(nx + s.radius * Math.sign(dx), s.y) && !GameMap.isWall(nx - s.radius * Math.sign(dx), s.y)) s.x = nx;
        if (!GameMap.isWall(s.x, ny + s.radius * Math.sign(dy)) && !GameMap.isWall(s.x, ny - s.radius * Math.sign(dy))) s.y = ny;

        if (Math.abs(forward) > 0 || Math.abs(strafe) > 0) {
            s.footstepTimer += dt;
            if (s.footstepTimer > 0.4) { s.footstepTimer = 0; Audio.playFootstep(); }
        }
    }

    function turn(amt, dt) { if (s.alive) s.angle += amt * s.turnSpeed * dt; }

    function shoot(now) {
        if (!s.alive) return null;
        const w = Weapons.fire(now);
        if (!w) return null;
        Audio.playShoot(w.name);
        MonsterAI.alertNearby(s.x, s.y, 8);
        s.muzzleFlash = 0.1;

        const hits = [];
        const pCount = w.pellets || 1;
        for (let p = 0; p < pCount; p++) {
            let off = 0;
            if (w.pellets > 1) off = (p - (w.pellets - 1) / 2) * (w.spreadAngle / w.pellets);
            else off = (Math.random() - 0.5) * (w.spread || 0);
            const hit = checkHit(s.angle + off, w.range, w.damage, w.aoe);
            if (hit) hits.push(hit);
        }
        return hits;
    }

    function checkHit(angle, range, damage, aoe) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        for (const m of Monsters.getAlive()) {
            const dx = m.x - s.x, dy = m.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range) continue;
            const dot = dx * cos + dy * sin;
            if (dot < 0) continue;
            const perp = Math.abs(dx * sin - dy * cos);
            if (perp < m.radius + 0.2 && GameMap.hasLineOfSight(s.x, s.y, m.x, m.y)) {
                const died = Monsters.takeDamage(m, damage);
                if (died) Audio.playMonsterDeath();
                else Audio.playMonsterHurt();

                // AOE damage
                if (aoe > 0) {
                    for (const m2 of Monsters.getAlive()) {
                        if (m2 === m) continue;
                        const ad = Math.sqrt((m2.x - m.x) ** 2 + (m2.y - m.y) ** 2);
                        if (ad < aoe) Monsters.takeDamage(m2, damage * 0.5 * (1 - ad / aoe));
                    }
                    // Self damage
                    const selfDist = Math.sqrt((s.x - m.x) ** 2 + (s.y - m.y) ** 2);
                    if (selfDist < aoe) takeDamage(damage * 0.3 * (1 - selfDist / aoe));
                }
                return { monster: m, died, dist };
            }
        }
        return null;
    }

    function takeDamage(amount) {
        if (!s.alive) return;
        s.health -= amount;
        Audio.playPlayerHurt();
        const flash = document.getElementById('damage-flash');
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 150);
        if (s.health <= 0) { s.health = 0; s.alive = false; }
    }

    function heal(amount) { s.health = Math.min(s.maxHealth, s.health + amount); }

    function update(dt) {
        s.muzzleFlash = Math.max(0, s.muzzleFlash - dt);
        Weapons.updateReload(performance.now() / 1000);

        const roomId = GameMap.getRoomAt(s.x, s.y);
        if (roomId >= 0) {
            const result = Memory.enterRoom(roomId);
            if (result === 'new') {
                const room = GameMap.getRooms()[roomId];
                const typeMsg = { safe: 'Safe room — rest here', boss: 'The guardian awaits...', key: 'Something glints in the darkness', monster: 'Danger ahead', ammo: 'Supplies nearby' };
                HUD.showMessage(typeMsg[room.type] || 'Exploring...');
            }
            else if (result === 'familiar') HUD.showMessage('Was I here before?');
            else if (result === 'remembered') HUD.showMessage('Your marks are still on the walls');
        }
    }

    function getState() { return s; }
    return { reset, move, turn, shoot, takeDamage, heal, update, getState };
})();
