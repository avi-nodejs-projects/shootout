const Player = (() => {
    let s = {};

    function reset(x, y) {
        s = {
            x: x + 0.5, y: y + 0.5, angle: 0,
            health: CONFIG.PLAYER.MAX_HEALTH, maxHealth: CONFIG.PLAYER.MAX_HEALTH,
            shield: 0, maxShield: CONFIG.PLAYER.MAX_SHIELD,
            stamina: CONFIG.PLAYER.MAX_STAMINA,
            alive: true, speed: CONFIG.PLAYER.SPEED,
            turnSpeed: CONFIG.PLAYER.TURN_SPEED,
            radius: CONFIG.PLAYER.RADIUS,
            sprinting: false,
            inCover: false,
            lastDamageTime: 0,
            footstepTimer: 0,
            muzzleFlash: 0,
        };
        Weapons.reset();
    }

    function move(forward, strafe, dt) {
        if (!s.alive) return;
        const spd = (s.sprinting && s.stamina > 0 ? CONFIG.PLAYER.SPRINT_SPEED : s.speed) * dt;
        if (s.inCover) return; // Can't move while in cover

        const cos = Math.cos(s.angle), sin = Math.sin(s.angle);
        const dx = cos * forward * spd + Math.cos(s.angle + Math.PI / 2) * strafe * spd;
        const dy = sin * forward * spd + Math.sin(s.angle + Math.PI / 2) * strafe * spd;

        // Proper radius-based collision with wall sliding
        const r = s.radius;
        const nx = s.x + dx;
        if (!GameMap.isSolid(nx - r, s.y - r) && !GameMap.isSolid(nx + r, s.y - r) &&
            !GameMap.isSolid(nx - r, s.y + r) && !GameMap.isSolid(nx + r, s.y + r)) {
            s.x = nx;
        }
        const ny = s.y + dy;
        if (!GameMap.isSolid(s.x - r, ny - r) && !GameMap.isSolid(s.x + r, ny - r) &&
            !GameMap.isSolid(s.x - r, ny + r) && !GameMap.isSolid(s.x + r, ny + r)) {
            s.y = ny;
        }

        if (Math.abs(forward) > 0 || Math.abs(strafe) > 0) {
            s.footstepTimer += dt;
            if (s.footstepTimer > 0.35) { s.footstepTimer = 0; Audio.playFootstep(); }
            if (s.sprinting) s.stamina = Math.max(0, s.stamina - CONFIG.PLAYER.STAMINA_DRAIN * dt);
        }
    }

    function turn(amount, dt) {
        if (!s.alive) return;
        s.angle += amount * s.turnSpeed * dt;
    }

    function shoot(now) {
        if (!s.alive) return null;
        const w = Weapons.fire(now);
        if (!w) return null;
        Audio.playShoot(w.name);
        MonsterAI.alertNearby(s.x, s.y, 8);
        s.muzzleFlash = 0.1;
        Particles.muzzleFlash(s.x, s.y, s.angle, w.color);

        const hits = [];
        const pCount = w.pellets || 1;
        for (let p = 0; p < pCount; p++) {
            let spreadOff = 0;
            if (w.pellets > 1) {
                spreadOff = (p - (w.pellets - 1) / 2) * (w.spreadAngle / w.pellets);
            } else {
                spreadOff = (Math.random() - 0.5) * w.spread;
            }
            if (s.inCover) spreadOff *= 1.5; // Accuracy penalty in cover
            const hit = checkHit(s.angle + spreadOff, w.range, w.damage);
            if (hit) hits.push(hit);
        }
        return hits;
    }

    function checkHit(angle, range, damage) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        // Check monsters
        for (const m of Monsters.getAlive()) {
            const dx = m.x - s.x, dy = m.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range) continue;
            const dot = dx * cos + dy * sin;
            if (dot < 0) continue;
            const perp = Math.abs(dx * sin - dy * cos);
            if (perp < m.radius + 0.2 && GameMap.hasLineOfSight(s.x, s.y, m.x, m.y)) {
                const died = Monsters.takeDamage(m, damage);
                Particles.spawn(m.x, m.y, 5, m.color, 2, 0.3);
                if (died) { Audio.playMonsterDeath(); Particles.spawn(m.x, m.y, 15, m.color, 3, 0.5); }
                else Audio.playMonsterHurt();
                return { monster: m, died, dist };
            }
        }

        // Check obstacles
        const step = 0.3;
        for (let d = 0; d < range; d += step) {
            const cx = s.x + cos * d, cy = s.y + sin * d;
            if (GameMap.isWall(cx, cy)) break;
            const obs = Obstacles.getAt(cx, cy);
            if (obs && obs.blocksShots) {
                const result = Obstacles.takeDamage(obs, damage);
                if (result && result.explosion) {
                    Particles.spawn(result.x, result.y, 20, '#ff6600', 4, 0.5);
                    // Explosion damage to nearby monsters and player
                    for (const m of Monsters.getAlive()) {
                        const ed = Math.sqrt((m.x - result.x) ** 2 + (m.y - result.y) ** 2);
                        if (ed < result.radius) Monsters.takeDamage(m, result.damage * (1 - ed / result.radius));
                    }
                    const pd = Math.sqrt((s.x - result.x) ** 2 + (s.y - result.y) ** 2);
                    if (pd < result.radius) takeDamage(result.damage * (1 - pd / result.radius));
                }
                return null;
            }
        }
        return null;
    }

    function takeDamage(amount) {
        if (!s.alive) return;
        let dmg = amount;
        if (s.inCover) dmg *= 0.5;

        // Shield absorbs first
        if (s.shield > 0) {
            const absorbed = Math.min(s.shield, dmg);
            s.shield -= absorbed;
            dmg -= absorbed;
        }
        s.health -= dmg;
        s.lastDamageTime = performance.now() / 1000;
        Audio.playPlayerHurt();

        const flash = document.getElementById('damage-flash');
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 150);

        if (s.health <= 0) { s.health = 0; s.alive = false; }
    }

    function heal(amount) { s.health = Math.min(s.maxHealth, s.health + amount); }
    function addShield(amount) { s.shield = Math.min(s.maxShield, s.shield + amount); }

    function update(dt) {
        const now = performance.now() / 1000;
        s.muzzleFlash = Math.max(0, s.muzzleFlash - dt);
        Weapons.updateReload(now);

        // Stamina regen
        if (!s.sprinting) s.stamina = Math.min(CONFIG.PLAYER.MAX_STAMINA, s.stamina + CONFIG.PLAYER.STAMINA_REGEN * dt);

        // Shield regen
        if (now - s.lastDamageTime > CONFIG.PLAYER.SHIELD_REGEN_DELAY) {
            s.shield = Math.min(s.maxShield, s.shield + CONFIG.PLAYER.SHIELD_REGEN * dt);
        }

        // Memory tracking
        const roomId = GameMap.getRoomAt(s.x, s.y);
        if (roomId >= 0) {
            const result = Memory.enterRoom(roomId);
            if (result === 'new') HUD.showMessage('New area discovered');
            else if (result === 'familiar') HUD.showMessage('This seems familiar...');
            else if (result === 'remembered') HUD.showMessage('You remember this place');
        }
    }

    function getState() { return s; }
    return { reset, move, turn, shoot, takeDamage, heal, addShield, update, getState };
})();
