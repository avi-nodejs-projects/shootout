// Methodical explorer AI with key/boss-seeking logic
const PlayerAI = (() => {
    let enabled = true;
    let decisionTimer = 0;
    let currentAction = 'EXPLORE';
    let pathTarget = null;
    let exploredRooms = new Set();
    let lastActionSwitch = 0;

    // Stuck detection
    let lastPosX = 0, lastPosY = 0;
    let stuckTimer = 0;
    let unstuckDir = 1;

    function reset() {
        enabled = true;
        decisionTimer = 0;
        currentAction = 'EXPLORE';
        pathTarget = null;
        exploredRooms = new Set();
        lastActionSwitch = 0;
        stuckTimer = 0;
        lastPosX = 0;
        lastPosY = 0;
    }

    function setEnabled(v) { enabled = v; }
    function isEnabled() { return enabled; }

    function update(dt) {
        if (!enabled) return;
        const p = Player.getState();
        if (!p.alive) return;

        const moved = Math.sqrt((p.x - lastPosX) ** 2 + (p.y - lastPosY) ** 2);
        if (moved < 0.01) stuckTimer += dt;
        else stuckTimer = 0;
        lastPosX = p.x;
        lastPosY = p.y;

        decisionTimer += dt;
        if (decisionTimer >= CONFIG.AI_DECISION_INTERVAL) {
            decisionTimer = 0;
            decide(p);
        }
        execute(p, dt);
    }

    function decide(p) {
        const now = performance.now() / 1000;
        const roomId = GameMap.getRoomAt(p.x, p.y);
        if (roomId >= 0) exploredRooms.add(roomId);

        // 1. FLEE — very low HP
        if (p.health < 15) {
            const hp = findNearestPickup('health');
            if (hp) { currentAction = 'SEEK'; pathTarget = { x: hp.x, y: hp.y }; return; }
        }

        // 2. HEAL — moderate HP
        if (p.health < 50) {
            const hp = findNearestPickup('health');
            if (hp) {
                const d = Math.sqrt((hp.x - p.x) ** 2 + (hp.y - p.y) ** 2);
                if (d < 15) { currentAction = 'SEEK'; pathTarget = { x: hp.x, y: hp.y }; return; }
            }
        }

        // 3. COMBAT
        const enemy = findNearestVisibleMonster(p);
        if (enemy) {
            currentAction = enemy.boss ? 'BOSS_FIGHT' : 'COMBAT';
            pathTarget = { x: enemy.x, y: enemy.y };
            return;
        }

        // 4. RELOAD
        const w = Weapons.current();
        if (w && w.clip === 0 && !w.reloading && (w.reserve > 0 || w.infiniteAmmo)) {
            Weapons.startReload(now);
            Audio.playReload();
        }

        // 5. SEEK KEY
        if (!Memory.hasKey()) {
            const keyPickup = findNearestPickup('key');
            if (keyPickup) { currentAction = 'SEEK'; pathTarget = { x: keyPickup.x, y: keyPickup.y }; return; }
        }

        // 6. SEEK BOSS
        if (Memory.hasKey() && Monsters.isBossAlive()) {
            const bossRoom = GameMap.getRooms()[GameMap.getBossRoomIdx()];
            if (bossRoom) { currentAction = 'SEEK'; pathTarget = { x: bossRoom.cx + 0.5, y: bossRoom.cy + 0.5 }; return; }
        }

        // 7. SEEK ELEVATOR
        if (Memory.isBossDefeated()) {
            const elev = GameMap.getElevatorPos();
            if (elev) { currentAction = 'SEEK'; pathTarget = { x: elev.x + 0.5, y: elev.y + 0.5 }; return; }
        }

        // 8. AMMO CHECK
        if (w && !w.infiniteAmmo && w.reserve < w.clipSize) {
            const ammo = findNearestPickup('ammo');
            if (ammo) { currentAction = 'SEEK'; pathTarget = { x: ammo.x, y: ammo.y }; return; }
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
        } else if (!pathTarget || now - lastActionSwitch > 5) {
            lastActionSwitch = now;
            const r = rooms[Math.floor(Math.random() * rooms.length)];
            pathTarget = { x: r.cx + 0.5, y: r.cy + 0.5 };
        }
    }

    function execute(p, dt) {
        const now = performance.now() / 1000;

        // Combat
        if (currentAction === 'COMBAT' || currentAction === 'BOSS_FIGHT') {
            const enemy = findNearestVisibleMonster(p);
            if (enemy) {
                const enemyAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
                turnToward(p, enemyAngle, dt);
                const aligned = Math.abs(angleDiff(enemyAngle, p.angle)) < 0.2;
                const dist = Math.sqrt((enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2);

                if (currentAction === 'BOSS_FIGHT') {
                    if (dist < 4) Player.move(-1, 0, dt);
                    else if (dist > 8) Player.move(0.5, 0, dt);
                    Player.move(0, Math.sin(now * 1.5) * 0.6, dt);
                    if (p.health < 30) Player.move(-1, 0, dt);
                } else {
                    if (dist < 2.5) Player.move(-0.6, 0, dt);
                    else if (dist > 6) Player.move(0.5, 0, dt);
                    Player.move(0, Math.sin(now * 2) * 0.3, dt);
                }
                if (aligned) Player.shoot(now);
                return;
            }
        }

        // Navigation
        if (pathTarget) {
            const dx = pathTarget.x - p.x;
            const dy = pathTarget.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.8) {
                pathTarget = null;
                return;
            }

            const toTarget = Math.atan2(dy, dx);

            // Stuck detection
            if (stuckTimer > 0.3) {
                unstickManeuver(p, toTarget, dt);
                if (stuckTimer > 1.5) {
                    stuckTimer = 0;
                    unstuckDir = -unstuckDir;
                    pathTarget = null;
                    decisionTimer = CONFIG.AI_DECISION_INTERVAL;
                }
                return;
            }

            turnToward(p, toTarget, dt);
            const diff = Math.abs(angleDiff(toTarget, p.angle));

            // Wall check
            const lookX = p.x + Math.cos(p.angle) * 0.7;
            const lookY = p.y + Math.sin(p.angle) * 0.7;
            const wallAhead = GameMap.isWall(lookX, lookY);

            if (wallAhead) {
                const leftA = p.angle - Math.PI / 2;
                const rightA = p.angle + Math.PI / 2;
                const leftClear = !GameMap.isWall(p.x + Math.cos(leftA) * 0.8, p.y + Math.sin(leftA) * 0.8);
                const rightClear = !GameMap.isWall(p.x + Math.cos(rightA) * 0.8, p.y + Math.sin(rightA) * 0.8);

                if (rightClear && !leftClear) Player.turn(1.5, dt);
                else if (leftClear && !rightClear) Player.turn(-1.5, dt);
                else if (rightClear) Player.turn(unstuckDir, dt);
                else Player.turn(-unstuckDir, dt);
                Player.move(0.3, 0, dt);
            } else if (diff < 0.6) {
                Player.move(1, 0, dt);
            } else {
                Player.move(0.2, 0, dt);
            }
        }
    }

    function unstickManeuver(p, toTarget, dt) {
        Player.turn(unstuckDir * 2, dt);
        Player.move(0.5, 0, dt);
        Player.move(0, 0.8 * unstuckDir, dt);
        Player.move(-0.3, 0, dt);
    }

    function turnToward(p, targetAngle, dt) {
        let diff = angleDiff(targetAngle, p.angle);
        if (Math.abs(diff) > 0.05) {
            Player.turn(Math.sign(diff) * Math.min(1, Math.abs(diff) * 4), dt);
        }
    }

    function angleDiff(a, b) {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return d;
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
