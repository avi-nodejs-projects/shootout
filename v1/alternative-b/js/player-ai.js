// Tactical A* player AI with cover system
const PlayerAI = (() => {
    let enabled = true;
    let decisionTimer = 0;
    let currentAction = 'EXPLORE';
    let pathTarget = null;
    let exploredRooms = new Set();
    let lastExploreSwitch = 0;

    // Stuck detection
    let lastPosX = 0, lastPosY = 0;
    let stuckTimer = 0;
    let unstuckDir = 1; // alternates direction when stuck

    function reset() {
        enabled = true;
        decisionTimer = 0;
        currentAction = 'EXPLORE';
        pathTarget = null;
        exploredRooms = new Set();
        lastExploreSwitch = 0;
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

        // Track movement for stuck detection
        const movedDist = Math.sqrt((p.x - lastPosX) ** 2 + (p.y - lastPosY) ** 2);
        if (movedDist < 0.01) stuckTimer += dt;
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
        const weapon = Weapons.current();

        const roomId = GameMap.getRoomAt(p.x, p.y);
        if (roomId >= 0) exploredRooms.add(roomId);

        // 1. CRITICAL HEALTH
        if (p.health < 25) {
            const hp = findNearestPickup('health');
            if (hp) { currentAction = 'SEEK'; pathTarget = { x: hp.x, y: hp.y }; return; }
        }

        // 2. LOW AMMO — reload if safe
        if (weapon && weapon.clip < weapon.clipSize * 0.25 && !weapon.reloading) {
            const enemy = findNearestVisibleMonster(p);
            if (!enemy || Math.sqrt((enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2) > 5) {
                Weapons.startReload(now);
                Audio.playReload();
            }
        }

        // 3. COMBAT
        const enemy = findNearestVisibleMonster(p);
        if (enemy) {
            currentAction = 'COMBAT';
            pathTarget = { x: enemy.x, y: enemy.y };
            return;
        }

        // 4. EXPLORE — find nearest unexplored room
        currentAction = 'EXPLORE';
        const rooms = GameMap.getRooms();
        let bestRoom = null, bestDist = Infinity;
        for (let i = 0; i < rooms.length; i++) {
            if (exploredRooms.has(i)) continue;
            const r = rooms[i];
            const d = Math.sqrt((r.cx - p.x) ** 2 + (r.cy - p.y) ** 2);
            if (d < bestDist) { bestDist = d; bestRoom = r; }
        }
        if (bestRoom) {
            pathTarget = { x: bestRoom.cx + 0.5, y: bestRoom.cy + 0.5 };
        } else {
            // All rooms explored — wander
            if (!pathTarget || now - lastExploreSwitch > 5) {
                lastExploreSwitch = now;
                const r = rooms[Math.floor(Math.random() * rooms.length)];
                pathTarget = { x: r.cx + 0.5, y: r.cy + 0.5 };
            }
        }
    }

    function execute(p, dt) {
        const now = performance.now() / 1000;

        // COMBAT: shoot visible enemies
        if (currentAction === 'COMBAT') {
            const enemy = findNearestVisibleMonster(p);
            if (enemy) {
                // Face enemy
                const enemyAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
                turnToward(p, enemyAngle, dt);
                const aligned = Math.abs(angleDiff(enemyAngle, p.angle)) < 0.2;

                const dist = Math.sqrt((enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2);
                if (dist < 2.5) Player.move(-0.6, 0, dt);
                else if (dist > 6) Player.move(0.5, 0, dt);
                Player.move(0, Math.sin(now * 2.5) * 0.3, dt);
                if (aligned) Player.shoot(now);
                return;
            }
        }

        // Navigation for EXPLORE / SEEK
        if (pathTarget) {
            const dx = pathTarget.x - p.x;
            const dy = pathTarget.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.8) {
                pathTarget = null;
                return;
            }

            // Recalculate target angle every frame
            const toTarget = Math.atan2(dy, dx);

            // If stuck for more than 0.3s, actively try to unstick
            if (stuckTimer > 0.3) {
                unstickManeuver(p, toTarget, dt);
                if (stuckTimer > 1.5) {
                    // Give up on this target, pick random nearby direction
                    stuckTimer = 0;
                    unstuckDir = -unstuckDir;
                    // Force new target at next decision
                    pathTarget = null;
                    decisionTimer = CONFIG.AI_DECISION_INTERVAL;
                }
                return;
            }

            // Normal navigation: turn toward target, move when roughly aligned
            turnToward(p, toTarget, dt);
            const diff = Math.abs(angleDiff(toTarget, p.angle));

            // Check if there's a wall directly in front
            const lookX = p.x + Math.cos(p.angle) * 0.7;
            const lookY = p.y + Math.sin(p.angle) * 0.7;
            const wallAhead = GameMap.isSolid(lookX, lookY);

            if (wallAhead) {
                // Pick clearer side and turn that way
                const leftA = p.angle - Math.PI / 2;
                const rightA = p.angle + Math.PI / 2;
                const leftClear = !GameMap.isSolid(p.x + Math.cos(leftA) * 0.8, p.y + Math.sin(leftA) * 0.8);
                const rightClear = !GameMap.isSolid(p.x + Math.cos(rightA) * 0.8, p.y + Math.sin(rightA) * 0.8);

                if (rightClear && !leftClear) Player.turn(1.5, dt);
                else if (leftClear && !rightClear) Player.turn(-1.5, dt);
                else if (rightClear) Player.turn(unstuckDir, dt);
                else Player.turn(-unstuckDir, dt);
                // Try to keep moving forward anyway (allows sliding)
                Player.move(0.3, 0, dt);
            } else if (diff < 0.6) {
                // Aligned enough, move forward
                Player.move(1, 0, dt);
            } else {
                // Still turning, creep forward slowly
                Player.move(0.2, 0, dt);
            }
        }
    }

    function unstickManeuver(p, toTarget, dt) {
        // Actively try to get unstuck: aggressive turn + try strafing in all directions
        Player.turn(unstuckDir * 2, dt);

        // Try forward
        Player.move(0.5, 0, dt);
        // Try strafe both ways
        Player.move(0, 0.8 * unstuckDir, dt);
        // Try backward
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
        let nearest = null, nd = Infinity;
        for (const m of Monsters.getAlive()) {
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < nd && d < 12 && GameMap.hasLineOfSight(p.x, p.y, m.x, m.y)) {
                nearest = m; nd = d;
            }
        }
        return nearest;
    }

    function findNearestPickup(type) {
        let nearest = null, nd = Infinity;
        const p = Player.getState();
        for (const pk of Pickups.getAll()) {
            if (pk.type !== type) continue;
            const d = Math.sqrt((pk.x - p.x) ** 2 + (pk.y - p.y) ** 2);
            if (d < nd) { nearest = pk; nd = d; }
        }
        return nearest;
    }

    return { reset, setEnabled, isEnabled, update };
})();
