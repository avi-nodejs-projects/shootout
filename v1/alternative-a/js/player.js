// Player state and actions
const Player = (() => {
    let state = {};

    function reset(x, y) {
        state = {
            x: x + 0.5,
            y: y + 0.5,
            angle: 0,
            health: CONFIG.PLAYER.MAX_HEALTH,
            maxHealth: CONFIG.PLAYER.MAX_HEALTH,
            alive: true,
            speed: CONFIG.PLAYER.SPEED,
            turnSpeed: CONFIG.PLAYER.TURN_SPEED,
            radius: CONFIG.PLAYER.RADIUS,
            hiding: false,
            footstepTimer: 0,
            muzzleFlash: 0,
        };
        Weapons.reset();
    }

    function move(forward, strafe, dt) {
        if (!state.alive) return;

        const cos = Math.cos(state.angle);
        const sin = Math.sin(state.angle);
        const speed = state.speed * dt;

        let dx = cos * forward * speed + Math.cos(state.angle + Math.PI / 2) * strafe * speed;
        let dy = sin * forward * speed + Math.sin(state.angle + Math.PI / 2) * strafe * speed;

        // Collision detection with sliding
        const newX = state.x + dx;
        const newY = state.y + dy;

        if (!GameMap.isWall(newX + state.radius * Math.sign(dx), state.y) &&
            !GameMap.isWall(newX - state.radius * Math.sign(dx), state.y)) {
            state.x = newX;
        }
        if (!GameMap.isWall(state.x, newY + state.radius * Math.sign(dy)) &&
            !GameMap.isWall(state.x, newY - state.radius * Math.sign(dy))) {
            state.y = newY;
        }

        // Footsteps
        if (Math.abs(forward) > 0 || Math.abs(strafe) > 0) {
            state.footstepTimer += dt;
            if (state.footstepTimer > 0.4) {
                state.footstepTimer = 0;
                Audio.playFootstep();
            }
        }
    }

    function turn(amount, dt) {
        if (!state.alive) return;
        state.angle += amount * state.turnSpeed * dt;
    }

    function shoot(now) {
        if (!state.alive) return null;
        const weapon = Weapons.fire(now);
        if (weapon) {
            Audio.playShoot(weapon.name);
            MonsterAI.alertNearby(state.x, state.y, 8);
            state.muzzleFlash = 0.1;

            // Check hits
            const hits = [];
            if (weapon.pellets > 1) {
                // Shotgun spread
                for (let p = 0; p < weapon.pellets; p++) {
                    const spreadOff = (p - (weapon.pellets - 1) / 2) * (weapon.spreadAngle / weapon.pellets);
                    const hit = checkHit(state.angle + spreadOff, weapon.range, weapon.damage);
                    if (hit) hits.push(hit);
                }
            } else {
                const spreadOff = (Math.random() - 0.5) * weapon.spread;
                const hit = checkHit(state.angle + spreadOff, weapon.range, weapon.damage);
                if (hit) hits.push(hit);
            }
            return hits;
        }
        return null;
    }

    function checkHit(angle, range, damage) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (const m of Monsters.getAlive()) {
            const dx = m.x - state.x;
            const dy = m.y - state.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range) continue;

            // Project monster onto ray
            const dot = dx * cos + dy * sin;
            if (dot < 0) continue;

            const perpDist = Math.abs(dx * sin - dy * cos);
            if (perpDist < m.radius + 0.2) {
                // Check no wall between
                if (GameMap.hasLineOfSight(state.x, state.y, m.x, m.y)) {
                    const died = Monsters.takeDamage(m, damage);
                    if (died) {
                        Audio.playMonsterDeath();
                    } else {
                        Audio.playMonsterHurt();
                    }
                    return { monster: m, died, dist };
                }
            }
        }
        return null;
    }

    function takeDamage(amount) {
        if (!state.alive) return;
        state.health -= amount;
        Audio.playPlayerHurt();

        // Flash damage
        const flash = document.getElementById('damage-flash');
        flash.classList.remove('hidden');
        flash.classList.add('active');
        setTimeout(() => {
            flash.classList.remove('active');
            flash.classList.add('hidden');
        }, 200);

        if (state.health <= 0) {
            state.health = 0;
            state.alive = false;
        }
    }

    function heal(amount) {
        state.health = Math.min(state.maxHealth, state.health + amount);
    }

    function update(dt) {
        state.muzzleFlash = Math.max(0, state.muzzleFlash - dt);
        Weapons.updateReload(performance.now() / 1000);

        // Memory tracking
        const result = Memory.visit(state.x, state.y);
        if (result === 'remembered') {
            HUD.showMessage("You've been here before...");
        }
    }

    function getState() { return state; }

    return { reset, move, turn, shoot, takeDamage, heal, update, getState };
})();
