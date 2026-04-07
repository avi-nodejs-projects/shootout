const MonsterAI = (() => {
    function update(m, player, dt) {
        if (!m.alive) return 0;
        m.hurtTimer = Math.max(0, m.hurtTimer - dt);
        m.stateTimer += dt;

        const dx = player.x - m.x, dy = player.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const canSee = dist < m.sightRange && GameMap.hasLineOfSight(m.x, m.y, player.x, player.y);

        if (m.boss) return updateBoss(m, player, dt, dist, canSee);

        switch (m.state) {
            case 'IDLE': return updateIdle(m, player, dt, dist, canSee);
            case 'ALERT': return updateAlert(m, player, dt, dist, canSee);
            case 'ATTACK': return updateAttack(m, player, dt, dist, canSee);
        }
        return 0;
    }

    function updateIdle(m, player, dt, dist, canSee) {
        // Random wander
        if (Math.random() < 0.02) {
            m.targetX = m.x + (Math.random() - 0.5) * 4;
            m.targetY = m.y + (Math.random() - 0.5) * 4;
        }
        moveToward(m, m.targetX, m.targetY, m.speed * 0.2, dt);
        if (canSee) { m.state = 'ALERT'; m.stateTimer = 0; m.alertX = player.x; m.alertY = player.y; }
        return 0;
    }

    function updateAlert(m, player, dt, dist, canSee) {
        m.angle = Math.atan2(m.alertY - m.y, m.alertX - m.x);
        moveToward(m, m.alertX, m.alertY, m.speed * 0.5, dt);
        if (canSee) { m.state = 'ATTACK'; m.stateTimer = 0; }
        else if (m.stateTimer > 8) { m.state = 'IDLE'; m.stateTimer = 0; }
        return 0;
    }

    function updateAttack(m, player, dt, dist, canSee) {
        if (!canSee && m.stateTimer > 3) { m.state = 'ALERT'; m.stateTimer = 0; m.alertX = player.x; m.alertY = player.y; return 0; }

        m.angle = Math.atan2(player.y - m.y, player.x - m.x);
        let dmg = 0;

        if (m.ranged) {
            if (dist < 3) moveAway(m, player.x, player.y, m.speed, dt);
            else if (dist > m.attackRange * 0.7) moveToward(m, player.x, player.y, m.speed * 0.5, dt);
            if (canSee && dist < m.attackRange && m.stateTimer - m.lastAttackTime > m.attackCooldown) {
                m.lastAttackTime = m.stateTimer; dmg = m.damage;
            }
        } else {
            // Shadow type: zigzag approach
            if (m.type === 'SHADOW') {
                const zigzag = Math.sin(m.stateTimer * 4) * 2;
                const perpX = Math.cos(m.angle + Math.PI / 2) * zigzag * dt;
                const perpY = Math.sin(m.angle + Math.PI / 2) * zigzag * dt;
                const nx = m.x + perpX, ny = m.y + perpY;
                if (!GameMap.isWall(nx, m.y)) m.x = nx;
                if (!GameMap.isWall(m.x, ny)) m.y = ny;
            }
            moveToward(m, player.x, player.y, m.speed, dt);
            if (dist < m.attackRange && m.stateTimer - m.lastAttackTime > m.attackCooldown) {
                m.lastAttackTime = m.stateTimer; dmg = m.damage;
            }
        }
        return dmg;
    }

    function updateBoss(m, player, dt, dist, canSee) {
        m.angle = Math.atan2(player.y - m.y, player.x - m.x);
        let dmg = 0;
        const speed = m.speed * (m.phase === 3 ? 1.5 : (m.phase === 2 ? 1.2 : 1));
        const cooldown = m.attackCooldown / m.phase;

        if (m.ranged) {
            // Maintain distance, shoot
            if (dist < 4) moveAway(m, player.x, player.y, speed, dt);
            else if (dist > 8) moveToward(m, player.x, player.y, speed, dt);
            else {
                // Circle strafe
                const perpAngle = m.angle + Math.PI / 2;
                const sx = m.x + Math.cos(perpAngle) * speed * dt;
                const sy = m.y + Math.sin(perpAngle) * speed * dt;
                if (!GameMap.isWall(sx, m.y)) m.x = sx;
                if (!GameMap.isWall(m.x, sy)) m.y = sy;
            }
        } else {
            // Charge at player
            if (dist > m.attackRange) moveToward(m, player.x, player.y, speed, dt);
        }

        if (canSee && dist < m.attackRange * 1.2 && m.stateTimer - m.lastAttackTime > cooldown) {
            m.lastAttackTime = m.stateTimer;
            dmg = m.damage * (m.phase === 3 ? 1.3 : 1);
        }

        return dmg;
    }

    function moveToward(m, tx, ty, speed, dt) {
        const dx = tx - m.x, dy = ty - m.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.1) return;
        const nx = m.x + (dx / d) * speed * dt;
        const ny = m.y + (dy / d) * speed * dt;
        if (!GameMap.isWall(nx, m.y)) m.x = nx;
        if (!GameMap.isWall(m.x, ny)) m.y = ny;
    }

    function moveAway(m, tx, ty, speed, dt) {
        const dx = m.x - tx, dy = m.y - ty;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.01) return;
        const nx = m.x + (dx / d) * speed * dt;
        const ny = m.y + (dy / d) * speed * dt;
        if (!GameMap.isWall(nx, m.y)) m.x = nx;
        if (!GameMap.isWall(m.x, ny)) m.y = ny;
    }

    function alertNearby(x, y, radius) {
        for (const m of Monsters.getAlive()) {
            if (m.state === 'IDLE' && (m.x - x) ** 2 + (m.y - y) ** 2 < radius * radius) {
                m.state = 'ALERT'; m.stateTimer = 0; m.alertX = x; m.alertY = y;
            }
        }
    }

    return { update, alertNearby };
})();
