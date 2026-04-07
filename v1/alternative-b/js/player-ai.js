// Tactical A* player AI with cover system
const PlayerAI = (() => {
    let enabled = true;
    let decisionTimer = 0;
    let currentAction = 'EXPLORE';
    let targetAngle = 0;
    let pathTarget = null;
    let exploredRooms = new Set();
    let lastExploreSwitch = 0;

    function reset() {
        enabled = true;
        decisionTimer = 0;
        currentAction = 'EXPLORE';
        pathTarget = null;
        exploredRooms = new Set();
        lastExploreSwitch = 0;
    }

    function setEnabled(v) { enabled = v; }
    function isEnabled() { return enabled; }

    function update(dt) {
        if (!enabled) return;
        const p = Player.getState();
        if (!p.alive) return;

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

        // Track current room
        const roomId = GameMap.getRoomAt(p.x, p.y);
        if (roomId >= 0) exploredRooms.add(roomId);

        // 1. CRITICAL HEALTH
        if (p.health < 25) {
            const hp = findNearestPickup('health');
            if (hp) {
                currentAction = 'SEEK_HEALTH';
                pathTarget = { x: hp.x, y: hp.y };
                targetAngle = Math.atan2(hp.y - p.y, hp.x - p.x);
                return;
            }
            // Try to find cover
            const cover = findCoverFrom(p, nearestMonsterPos(p));
            if (cover) {
                currentAction = 'TAKE_COVER';
                pathTarget = { x: cover.x + 0.5, y: cover.y + 0.5 };
                return;
            }
        }

        // 2. LOW AMMO
        if (weapon && weapon.clip < weapon.clipSize * 0.25 && !weapon.reloading) {
            const noMonsterNear = !findNearestVisibleMonster(p) || nearestMonsterDist(p) > 4;
            if (noMonsterNear) {
                currentAction = 'RELOAD';
                Weapons.startReload(now);
                Audio.playReload();
                return;
            }
        }

        // 3. COMBAT
        const enemy = findNearestVisibleMonster(p);
        if (enemy) {
            const dist = Math.sqrt((enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2);
            targetAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);

            // Check if we can use cover
            if (dist < 6) {
                const cover = Obstacles.isNearCover(p.x, p.y, enemy.x, enemy.y);
                if (cover && p.health < 60) {
                    currentAction = 'COVER_SHOOT';
                    return;
                }
            }

            currentAction = 'COMBAT';
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
            targetAngle = Math.atan2(bestRoom.cy - p.y, bestRoom.cx - p.x);
        } else {
            // All rooms explored — wander
            if (now - lastExploreSwitch > 3) {
                lastExploreSwitch = now;
                const r = rooms[Math.floor(Math.random() * rooms.length)];
                pathTarget = { x: r.cx + 0.5, y: r.cy + 0.5 };
                targetAngle = Math.atan2(r.cy - p.y, r.cx - p.x);
            }
        }
    }

    function execute(p, dt) {
        const now = performance.now() / 1000;

        // Turn toward target angle
        let diff = targetAngle - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 0.05) {
            Player.turn(Math.sign(diff) * Math.min(1, Math.abs(diff) * 3), dt);
        }

        switch (currentAction) {
            case 'COMBAT': {
                const enemy = findNearestVisibleMonster(p);
                if (enemy) {
                    const dist = Math.sqrt((enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2);
                    if (dist < 2) Player.move(-0.5, 0, dt);
                    else if (dist > 6) Player.move(0.5, 0, dt);
                    Player.move(0, Math.sin(now * 2.5) * 0.4, dt); // Strafe
                    Player.shoot(now);
                }
                break;
            }
            case 'COVER_SHOOT': {
                // Peek and shoot rhythm
                const phase = Math.sin(now * 1.5);
                if (phase > 0) {
                    Player.shoot(now);
                }
                break;
            }
            case 'SEEK_HEALTH':
            case 'EXPLORE': {
                if (pathTarget) {
                    const dx = pathTarget.x - p.x, dy = pathTarget.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.8 && Math.abs(diff) < 0.4) {
                        // Simple steering: move toward target, avoid walls
                        const ahead = !GameMap.isWall(p.x + Math.cos(p.angle) * 1.2, p.y + Math.sin(p.angle) * 1.2);
                        if (ahead) {
                            Player.move(1, 0, dt);
                        } else {
                            // Wall ahead — try strafing
                            const rightAngle = p.angle + Math.PI / 2;
                            const rightClear = !GameMap.isWall(p.x + Math.cos(rightAngle) * 1, p.y + Math.sin(rightAngle) * 1);
                            if (rightClear) {
                                Player.turn(0.5, dt);
                                Player.move(0.5, 0.5, dt);
                            } else {
                                Player.turn(-0.5, dt);
                                Player.move(0.5, -0.5, dt);
                            }
                        }
                    } else if (dist <= 0.8) {
                        pathTarget = null;
                    }
                }
                break;
            }
            case 'TAKE_COVER': {
                if (pathTarget) {
                    const dist = Math.sqrt((pathTarget.x - p.x) ** 2 + (pathTarget.y - p.y) ** 2);
                    if (dist > 0.5) {
                        targetAngle = Math.atan2(pathTarget.y - p.y, pathTarget.x - p.x);
                        Player.move(1, 0, dt);
                    }
                }
                break;
            }
            case 'RELOAD':
                // Stand still while reloading
                break;
        }
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

    function nearestMonsterDist(p) {
        let nd = Infinity;
        for (const m of Monsters.getAlive()) {
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < nd) nd = d;
        }
        return nd;
    }

    function nearestMonsterPos(p) {
        const m = findNearestVisibleMonster(p);
        return m ? { x: m.x, y: m.y } : { x: p.x + Math.cos(p.angle) * 5, y: p.y + Math.sin(p.angle) * 5 };
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

    function findCoverFrom(p, threat) {
        // Search nearby tiles for obstacles that block the threat
        const gx = Math.floor(p.x), gy = Math.floor(p.y);
        for (let r = 1; r < 5; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const cover = Obstacles.isNearCover(gx + dx + 0.5, gy + dy + 0.5, threat.x, threat.y);
                    if (cover) return cover;
                }
            }
        }
        return null;
    }

    return { reset, setEnabled, isEnabled, update };
})();
