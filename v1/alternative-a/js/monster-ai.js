// Monster AI state machine
const MonsterAI = (() => {
    function update(monster, player, dt) {
        if (!monster.alive) return;

        monster.hurtTimer = Math.max(0, monster.hurtTimer - dt);
        monster.stateTimer += dt;

        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const canSee = dist < monster.sightRange && GameMap.hasLineOfSight(monster.x, monster.y, player.x, player.y);

        switch (monster.state) {
            case 'IDLE':
                updateIdle(monster, player, dt, dist, canSee);
                break;
            case 'ALERT':
                updateAlert(monster, player, dt, dist, canSee);
                break;
            case 'CHASE':
                updateChase(monster, player, dt, dist, canSee);
                break;
            case 'ATTACK':
                updateAttack(monster, player, dt, dist, canSee);
                break;
            case 'SEARCH':
                updateSearch(monster, player, dt, dist, canSee);
                break;
            case 'FLEE':
                updateFlee(monster, player, dt, dist);
                break;
        }
    }

    function updateIdle(monster, player, dt, dist, canSee) {
        // Patrol between points
        if (monster.patrolPoints.length > 0) {
            const target = monster.patrolPoints[monster.patrolIndex];
            moveToward(monster, target.x, target.y, monster.speed * 0.3, dt);

            const tdx = target.x - monster.x;
            const tdy = target.y - monster.y;
            if (tdx * tdx + tdy * tdy < 0.5) {
                monster.patrolIndex += monster.patrolDir;
                if (monster.patrolIndex >= monster.patrolPoints.length || monster.patrolIndex < 0) {
                    monster.patrolDir *= -1;
                    monster.patrolIndex += monster.patrolDir * 2;
                    monster.patrolIndex = Math.max(0, Math.min(monster.patrolPoints.length - 1, monster.patrolIndex));
                }
            }
        }

        // Transition to ALERT
        if (canSee) {
            monster.state = 'ALERT';
            monster.stateTimer = 0;
            monster.alertX = player.x;
            monster.alertY = player.y;
        }
    }

    function updateAlert(monster, player, dt, dist, canSee) {
        // Turn toward last known position
        const ax = monster.alertX - monster.x;
        const ay = monster.alertY - monster.y;
        monster.angle = Math.atan2(ay, ax);

        // Move cautiously toward alert position
        moveToward(monster, monster.alertX, monster.alertY, monster.speed * 0.5, dt);

        if (canSee) {
            monster.state = 'CHASE';
            monster.stateTimer = 0;
        } else if (monster.stateTimer > 5) {
            monster.state = 'IDLE';
            monster.stateTimer = 0;
        }
    }

    function updateChase(monster, player, dt, dist, canSee) {
        if (canSee) {
            monster.alertX = player.x;
            monster.alertY = player.y;
            monster.angle = Math.atan2(player.y - monster.y, player.x - monster.x);
        }

        moveToward(monster, monster.alertX, monster.alertY, monster.speed, dt);

        // Check for flee
        if (monster.hp < monster.maxHp * 0.3) {
            monster.state = 'FLEE';
            monster.stateTimer = 0;
            return;
        }

        // Attack when in range
        if (dist < monster.attackRange && canSee) {
            monster.state = 'ATTACK';
            monster.stateTimer = 0;
        }

        // Lost player
        if (!canSee && monster.stateTimer > 5) {
            monster.state = 'SEARCH';
            monster.stateTimer = 0;
        }
    }

    function updateAttack(monster, player, dt, dist, canSee) {
        if (!canSee || dist > monster.attackRange * 1.5) {
            monster.state = 'CHASE';
            monster.stateTimer = 0;
            return;
        }

        monster.angle = Math.atan2(player.y - monster.y, player.x - monster.x);

        // Attack on cooldown
        if (monster.stateTimer - monster.lastAttackTime >= monster.attackCooldown) {
            monster.lastAttackTime = monster.stateTimer;
            return monster.damage; // Signal damage to player
        }

        // Keep close but not too close for ranged
        if (monster.attackRange > 2 && dist < 3) {
            moveAway(monster, player.x, player.y, monster.speed * 0.5, dt);
        } else if (dist > monster.attackRange * 0.8) {
            moveToward(monster, player.x, player.y, monster.speed * 0.5, dt);
        }

        return 0;
    }

    function updateSearch(monster, player, dt, dist, canSee) {
        // Wander around last known position
        if (monster.stateTimer < 0.1) {
            monster.targetX = monster.alertX + (Math.random() - 0.5) * 4;
            monster.targetY = monster.alertY + (Math.random() - 0.5) * 4;
        }

        moveToward(monster, monster.targetX, monster.targetY, monster.speed * 0.4, dt);

        if (canSee) {
            monster.state = 'CHASE';
            monster.stateTimer = 0;
        } else if (monster.stateTimer > 10) {
            monster.state = 'IDLE';
            monster.stateTimer = 0;
        }
    }

    function updateFlee(monster, player, dt, dist) {
        moveAway(monster, player.x, player.y, monster.speed * 1.2, dt);

        if (dist > 10 || monster.stateTimer > 8) {
            monster.state = 'IDLE';
            monster.stateTimer = 0;
        }
    }

    function moveToward(monster, tx, ty, speed, dt) {
        const dx = tx - monster.x;
        const dy = ty - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.1) return;

        const moveX = (dx / dist) * speed * dt;
        const moveY = (dy / dist) * speed * dt;

        const newX = monster.x + moveX;
        const newY = monster.y + moveY;

        if (!GameMap.isWall(newX, monster.y)) monster.x = newX;
        if (!GameMap.isWall(monster.x, newY)) monster.y = newY;
    }

    function moveAway(monster, tx, ty, speed, dt) {
        const dx = monster.x - tx;
        const dy = monster.y - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return;

        const moveX = (dx / dist) * speed * dt;
        const moveY = (dy / dist) * speed * dt;

        const newX = monster.x + moveX;
        const newY = monster.y + moveY;

        if (!GameMap.isWall(newX, monster.y)) monster.x = newX;
        if (!GameMap.isWall(monster.x, newY)) monster.y = newY;
    }

    // Called when player fires a shot — alert nearby monsters
    function alertNearby(x, y, radius) {
        for (const m of Monsters.getAlive()) {
            const dx = m.x - x;
            const dy = m.y - y;
            if (dx * dx + dy * dy < radius * radius && m.state === 'IDLE') {
                m.state = 'ALERT';
                m.stateTimer = 0;
                m.alertX = x;
                m.alertY = y;
            }
        }
    }

    return { update, alertNearby };
})();
