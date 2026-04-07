// Player autopilot AI
const PlayerAI = (() => {
    let enabled = true;
    let decisionTimer = 0;
    let currentAction = 'EXPLORE';
    let targetAngle = 0;
    let moveForward = 0;
    let moveStrafe = 0;
    let turnDir = 0;
    let wantShoot = false;
    let wantReload = false;
    let explorationBreakTimer = 0;
    let lastTurnChoice = 0; // Track wall-following direction

    function reset() {
        enabled = true;
        decisionTimer = 0;
        currentAction = 'EXPLORE';
        moveForward = 0;
        moveStrafe = 0;
        turnDir = 0;
        wantShoot = false;
        wantReload = false;
        explorationBreakTimer = 0;
    }

    function setEnabled(v) { enabled = v; }
    function isEnabled() { return enabled; }

    function update(dt) {
        if (!enabled) return;

        const p = Player.getState();
        if (!p.alive) return;

        decisionTimer += dt;
        explorationBreakTimer += dt;

        if (decisionTimer >= CONFIG.AI_DECISION_INTERVAL) {
            decisionTimer = 0;
            decide(p);
        }

        executeAction(p, dt);
    }

    function decide(p) {
        const now = performance.now() / 1000;
        wantShoot = false;
        wantReload = false;

        // 1. CRITICAL: Low health — seek health pickup
        if (p.health < 20) {
            const healthPickup = findNearestPickup('health');
            if (healthPickup) {
                currentAction = 'SEEK_HEALTH';
                targetAngle = Math.atan2(healthPickup.y - p.y, healthPickup.x - p.x);
                return;
            }
        }

        // 2. COMBAT: Monster in sight
        const nearestMonster = findNearestVisibleMonster(p);
        if (nearestMonster) {
            currentAction = 'COMBAT';
            targetAngle = Math.atan2(nearestMonster.y - p.y, nearestMonster.x - p.x);

            const weapon = Weapons.current();
            if (weapon && weapon.clip > 0) {
                wantShoot = true;
            } else {
                wantReload = true;
            }
            return;
        }

        // 3. RELOAD: Clip empty and not in danger
        const weapon = Weapons.current();
        if (weapon && weapon.clip === 0 && (weapon.reserve > 0 || weapon.infiniteAmmo)) {
            currentAction = 'RELOAD';
            wantReload = true;
            return;
        }

        // 4. EXPLORE: Wall following with random breaks
        currentAction = 'EXPLORE';
        exploreDecision(p);
    }

    function exploreDecision(p) {
        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);

        // Check ahead, left, right
        const lookDist = 1.5;
        const aheadClear = !GameMap.isWall(p.x + cos * lookDist, p.y + sin * lookDist);
        const rightAngle = p.angle + Math.PI / 2;
        const leftAngle = p.angle - Math.PI / 2;
        const rightClear = !GameMap.isWall(p.x + Math.cos(rightAngle) * lookDist, p.y + Math.sin(rightAngle) * lookDist);
        const leftClear = !GameMap.isWall(p.x + Math.cos(leftAngle) * lookDist, p.y + Math.sin(leftAngle) * lookDist);

        // Random exploration break every 10-15 seconds
        if (explorationBreakTimer > 10 + Math.random() * 5) {
            explorationBreakTimer = 0;
            if (rightClear && Math.random() < 0.5) {
                targetAngle = rightAngle;
            } else if (leftClear) {
                targetAngle = leftAngle;
            }
            moveForward = 1;
            turnDir = 0;
            return;
        }

        // Right-hand wall following
        if (rightClear && !Memory.wasVisited(p.x + Math.cos(rightAngle) * 2, p.y + Math.sin(rightAngle) * 2)) {
            // Prefer unvisited right
            targetAngle = rightAngle;
            moveForward = 1;
        } else if (aheadClear) {
            // Go straight
            targetAngle = p.angle;
            moveForward = 1;
        } else if (leftClear) {
            targetAngle = leftAngle;
            moveForward = 1;
        } else {
            // Dead end - turn around
            targetAngle = p.angle + Math.PI;
            moveForward = 0;
        }

        // At intersections, 30% chance to break pattern
        const paths = [aheadClear, rightClear, leftClear].filter(Boolean).length;
        if (paths >= 2 && Math.random() < 0.3) {
            const options = [];
            if (aheadClear) options.push(p.angle);
            if (rightClear) options.push(rightAngle);
            if (leftClear) options.push(leftAngle);
            targetAngle = options[Math.floor(Math.random() * options.length)];
        }
    }

    function executeAction(p, dt) {
        const now = performance.now() / 1000;

        // Turn toward target
        let angleDiff = targetAngle - p.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > 0.05) {
            Player.turn(Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) * 3), dt);
        }

        // Move
        if (currentAction === 'COMBAT') {
            const nearestMonster = findNearestVisibleMonster(p);
            if (nearestMonster) {
                const dist = Math.sqrt((nearestMonster.x - p.x) ** 2 + (nearestMonster.y - p.y) ** 2);
                if (dist < 2) {
                    Player.move(-0.5, 0, dt); // Back away
                } else if (dist > 5) {
                    Player.move(0.5, 0, dt); // Close in
                }
                // Strafe during combat
                Player.move(0, Math.sin(now * 2) * 0.3, dt);
            }
        } else if (currentAction === 'EXPLORE' || currentAction === 'SEEK_HEALTH') {
            if (Math.abs(angleDiff) < 0.3) {
                Player.move(1, 0, dt);
            }
        }

        // Shoot
        if (wantShoot) {
            Player.shoot(now);
        }

        // Reload
        if (wantReload) {
            Weapons.startReload(now);
            Audio.playReload();
        }
    }

    function findNearestVisibleMonster(p) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const m of Monsters.getAlive()) {
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist && dist < 10) {
                if (GameMap.hasLineOfSight(p.x, p.y, m.x, m.y)) {
                    nearest = m;
                    nearestDist = dist;
                }
            }
        }
        return nearest;
    }

    function findNearestPickup(type) {
        let nearest = null;
        let nearestDist = Infinity;
        const p = Player.getState();

        for (const pickup of Pickups.getAll()) {
            if (pickup.type !== type) continue;
            const dx = pickup.x - p.x;
            const dy = pickup.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearest = pickup;
                nearestDist = dist;
            }
        }
        return nearest;
    }

    return { reset, setEnabled, isEnabled, update };
})();
