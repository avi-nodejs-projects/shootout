// Methodical explorer AI with key/boss-seeking logic
const PlayerAI = (() => {
    let enabled = true, decisionTimer = 0, currentAction = 'EXPLORE';
    let targetAngle = 0, pathTarget = null, exploredRooms = new Set();
    let lastActionSwitch = 0;

    function reset() {
        enabled = true; decisionTimer = 0; currentAction = 'EXPLORE';
        pathTarget = null; exploredRooms = new Set(); lastActionSwitch = 0;
    }

    function setEnabled(v) { enabled = v; }
    function isEnabled() { return enabled; }

    function update(dt) {
        if (!enabled) return;
        const p = Player.getState();
        if (!p.alive) return;
        decisionTimer += dt;
        if (decisionTimer >= CONFIG.AI_DECISION_INTERVAL) { decisionTimer = 0; decide(p); }
        execute(p, dt);
    }

    function decide(p) {
        const now = performance.now() / 1000;
        const roomId = GameMap.getRoomAt(p.x, p.y);
        if (roomId >= 0) exploredRooms.add(roomId);

        // 1. FLEE — very low HP, seek safe room
        if (p.health < 15) {
            const hp = findNearestPickup('health');
            if (hp) {
                setTarget('SEEK_HEALTH', hp.x, hp.y);
                return;
            }
        }

        // 2. HEAL — moderate HP, safe room nearby
        if (p.health < 50) {
            const hp = findNearestPickup('health');
            if (hp) {
                const hDist = Math.sqrt((hp.x - p.x) ** 2 + (hp.y - p.y) ** 2);
                if (hDist < 15) { setTarget('SEEK_HEALTH', hp.x, hp.y); return; }
            }
        }

        // 3. COMBAT
        const enemy = findNearestVisibleMonster(p);
        if (enemy) {
            targetAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            currentAction = enemy.boss ? 'BOSS_FIGHT' : 'COMBAT';
            return;
        }

        // 4. RELOAD
        const w = Weapons.current();
        if (w && w.clip === 0 && !w.reloading && (w.reserve > 0 || w.infiniteAmmo)) {
            currentAction = 'RELOAD';
            Weapons.startReload(now);
            Audio.playReload();
            return;
        }

        // 5. SEEK KEY (if not found)
        if (!Memory.hasKey()) {
            const keyPickup = findNearestPickup('key');
            if (keyPickup) { setTarget('SEEK_KEY', keyPickup.x, keyPickup.y); return; }
            // Explore to find key
        }

        // 6. SEEK BOSS (key found, boss alive)
        if (Memory.hasKey() && Monsters.isBossAlive()) {
            const bossRoom = GameMap.getRooms()[GameMap.getBossRoomIdx()];
            if (bossRoom) { setTarget('SEEK_BOSS', bossRoom.cx + 0.5, bossRoom.cy + 0.5); return; }
        }

        // 7. SEEK ELEVATOR (boss dead)
        if (Memory.isBossDefeated()) {
            const elev = GameMap.getElevatorPos();
            if (elev) { setTarget('SEEK_ELEVATOR', elev.x + 0.5, elev.y + 0.5); return; }
        }

        // 8. AMMO CHECK
        if (w && !w.infiniteAmmo && w.reserve < w.clipSize) {
            const ammo = findNearestPickup('ammo');
            if (ammo) { setTarget('SEEK_AMMO', ammo.x, ammo.y); return; }
        }

        // 9. EXPLORE
        currentAction = 'EXPLORE';
        const rooms = GameMap.getRooms();
        let best = null, bestDist = Infinity;
        for (let i = 0; i < rooms.length; i++) {
            if (exploredRooms.has(i)) continue;
            const r = rooms[i];
            const d = Math.sqrt((r.cx - p.x) ** 2 + (r.cy - p.y) ** 2);
            if (d < bestDist) { bestDist = d; best = r; }
        }
        if (best) {
            pathTarget = { x: best.cx + 0.5, y: best.cy + 0.5 };
            targetAngle = Math.atan2(best.cy - p.y, best.cx - p.x);
        } else if (now - lastActionSwitch > 4) {
            lastActionSwitch = now;
            const r = rooms[Math.floor(Math.random() * rooms.length)];
            pathTarget = { x: r.cx + 0.5, y: r.cy + 0.5 };
            targetAngle = Math.atan2(r.cy - p.y, r.cx - p.x);
        }
    }

    function setTarget(action, x, y) {
        currentAction = action;
        pathTarget = { x, y };
        targetAngle = Math.atan2(y - Player.getState().y, x - Player.getState().x);
    }

    function execute(p, dt) {
        const now = performance.now() / 1000;

        // Turn
        let diff = targetAngle - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 0.05) Player.turn(Math.sign(diff) * Math.min(1, Math.abs(diff) * 3), dt);

        switch (currentAction) {
            case 'COMBAT': {
                const e = findNearestVisibleMonster(p);
                if (e) {
                    const d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
                    if (d < 2) Player.move(-0.5, 0, dt);
                    else if (d > 6) Player.move(0.5, 0, dt);
                    Player.move(0, Math.sin(now * 2) * 0.3, dt);
                    Player.shoot(now);
                }
                break;
            }
            case 'BOSS_FIGHT': {
                const e = findNearestVisibleMonster(p);
                if (e) {
                    const d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
                    // Kite: keep 5-7 tile distance
                    if (d < 4) Player.move(-1, 0, dt);
                    else if (d > 8) Player.move(0.5, 0, dt);
                    // Circle strafe
                    Player.move(0, Math.sin(now * 1.5) * 0.6, dt);
                    Player.shoot(now);
                    // Retreat to heal if low
                    if (p.health < 30) {
                        Player.move(-1, 0, dt);
                    }
                }
                break;
            }
            case 'SEEK_HEALTH': case 'SEEK_KEY': case 'SEEK_AMMO':
            case 'SEEK_BOSS': case 'SEEK_ELEVATOR': case 'EXPLORE':
                navigateToTarget(p, dt);
                break;
            case 'RELOAD':
                break;
        }
    }

    function navigateToTarget(p, dt) {
        if (!pathTarget) return;
        const dx = pathTarget.x - p.x, dy = pathTarget.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.8) {
            let diff = targetAngle - p.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            if (Math.abs(diff) < 0.4) {
                const ahead = !GameMap.isWall(p.x + Math.cos(p.angle) * 1.2, p.y + Math.sin(p.angle) * 1.2);
                if (ahead) Player.move(1, 0, dt);
                else {
                    const rAngle = p.angle + Math.PI / 2;
                    if (!GameMap.isWall(p.x + Math.cos(rAngle), p.y + Math.sin(rAngle))) {
                        Player.turn(0.5, dt); Player.move(0.5, 0.5, dt);
                    } else {
                        Player.turn(-0.5, dt); Player.move(0.5, -0.5, dt);
                    }
                }
            }
        } else pathTarget = null;
    }

    function findNearestVisibleMonster(p) {
        let best = null, bd = Infinity;
        for (const m of Monsters.getAlive()) {
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < bd && d < 12 && GameMap.hasLineOfSight(p.x, p.y, m.x, m.y)) { best = m; bd = d; }
        }
        return best;
    }

    function findNearestPickup(type) {
        let best = null, bd = Infinity;
        const p = Player.getState();
        for (const pk of Pickups.getAll()) {
            if (pk.type !== type) continue;
            const d = Math.sqrt((pk.x - p.x) ** 2 + (pk.y - p.y) ** 2);
            if (d < bd) { best = pk; bd = d; }
        }
        return best;
    }

    return { reset, setEnabled, isEnabled, update };
})();
