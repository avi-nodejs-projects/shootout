// 3-state monster AI with type-specific behaviors
const MonsterAI = (() => {
    function update(m, player, dt) {
        if (!m.alive) return 0;
        m.hurtTimer = Math.max(0, m.hurtTimer - dt);
        m.stateTimer += dt;

        const dx = player.x - m.x, dy = player.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const canSee = dist < m.sightRange && GameMap.hasLineOfSight(m.x, m.y, player.x, player.y);

        switch (m.state) {
            case 'IDLE': return updateIdle(m, player, dt, dist, canSee);
            case 'ALERT': return updateAlert(m, player, dt, dist, canSee);
            case 'ATTACK': return updateAttack(m, player, dt, dist, canSee);
        }
        return 0;
    }

    function updateIdle(m, player, dt, dist, canSee) {
        // Wander within room
        if (m.stateTimer > 2 + Math.random() * 3) {
            m.stateTimer = 0;
            const room = GameMap.getRooms()[m.roomId];
            if (room) {
                m.targetX = room.x + 1 + Math.random() * (room.w - 2);
                m.targetY = room.y + 1 + Math.random() * (room.h - 2);
            }
        }
        moveToward(m, m.targetX, m.targetY, m.speed * 0.2, dt);

        if (canSee) {
            m.state = 'ALERT';
            m.stateTimer = 0;
            m.alertX = player.x;
            m.alertY = player.y;
            Audio.playMonsterAlert();
        }
        return 0;
    }

    function updateAlert(m, player, dt, dist, canSee) {
        m.angle = Math.atan2(m.alertY - m.y, m.alertX - m.x);
        moveToward(m, m.alertX, m.alertY, m.speed * 0.5, dt);

        if (canSee) {
            m.state = 'ATTACK';
            m.stateTimer = 0;
        } else if (m.stateTimer > 8) {
            m.state = 'IDLE';
            m.stateTimer = 0;
        }
        return 0;
    }

    function updateAttack(m, player, dt, dist, canSee) {
        if (!canSee && m.stateTimer > 3) {
            m.state = 'ALERT';
            m.stateTimer = 0;
            m.alertX = player.x;
            m.alertY = player.y;
            return 0;
        }

        // Flee if low HP (sentinel and lurker only)
        if (m.hp < m.maxHp * 0.2 && (m.type === 'SENTINEL' || m.type === 'LURKER')) {
            moveAway(m, player.x, player.y, m.speed * 1.2, dt);
            if (dist > 10) { m.state = 'IDLE'; m.stateTimer = 0; }
            return 0;
        }

        m.angle = Math.atan2(player.y - m.y, player.x - m.x);

        // Type-specific attack behavior
        let damage = 0;
        switch (m.type) {
            case 'DRONE':
            case 'SWARM':
                // Rush straight at player
                moveToward(m, player.x, player.y, m.speed, dt);
                if (dist < m.attackRange && m.stateTimer - m.lastAttackTime > m.attackCooldown) {
                    m.lastAttackTime = m.stateTimer;
                    damage = m.damage;
                }
                break;

            case 'SENTINEL':
                // Maintain distance, shoot
                if (dist < 4) moveAway(m, player.x, player.y, m.speed, dt);
                else if (dist > 7) moveToward(m, player.x, player.y, m.speed * 0.5, dt);
                if (canSee && dist < m.attackRange && m.stateTimer - m.lastAttackTime > 1.5) {
                    m.lastAttackTime = m.stateTimer;
                    damage = m.damage;
                }
                break;

            case 'LURKER':
                // Flank — try to circle around
                const perpAngle = m.angle + Math.PI / 2;
                const flankX = player.x + Math.cos(perpAngle) * 3;
                const flankY = player.y + Math.sin(perpAngle) * 3;
                if (dist > 2) moveToward(m, flankX, flankY, m.speed, dt);
                else moveToward(m, player.x, player.y, m.speed, dt);
                if (dist < m.attackRange && m.stateTimer - m.lastAttackTime > 0.8) {
                    m.lastAttackTime = m.stateTimer;
                    damage = m.damage;
                }
                break;

            case 'HEAVY':
                // Slow advance, area attack
                moveToward(m, player.x, player.y, m.speed, dt);
                if (dist < m.attackRange && m.stateTimer - m.lastAttackTime > 3) {
                    m.lastAttackTime = m.stateTimer;
                    damage = m.damage;
                }
                break;
        }

        return damage;
    }

    function moveToward(m, tx, ty, speed, dt) {
        const dx = tx - m.x, dy = ty - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.1) return;
        const mx = (dx / dist) * speed * dt;
        const my = (dy / dist) * speed * dt;
        const nx = m.x + mx, ny = m.y + my;
        if (!GameMap.isSolid(nx, m.y)) m.x = nx;
        if (!GameMap.isSolid(m.x, ny)) m.y = ny;
    }

    function moveAway(m, tx, ty, speed, dt) {
        const dx = m.x - tx, dy = m.y - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return;
        const mx = (dx / dist) * speed * dt;
        const my = (dy / dist) * speed * dt;
        const nx = m.x + mx, ny = m.y + my;
        if (!GameMap.isSolid(nx, m.y)) m.x = nx;
        if (!GameMap.isSolid(m.x, ny)) m.y = ny;
    }

    function alertNearby(x, y, radius) {
        for (const m of Monsters.getAlive()) {
            const d2 = (m.x - x) ** 2 + (m.y - y) ** 2;
            if (d2 < radius * radius && m.state === 'IDLE') {
                m.state = 'ALERT';
                m.stateTimer = 0;
                m.alertX = x;
                m.alertY = y;
            }
        }
    }

    return { update, alertNearby };
})();
