// Main game loop
const Game = (() => {
    let running = false;
    let lastTime = 0;
    let gameOver = false;

    function init() {
        Raycaster.init(document.getElementById('game-canvas'));
        HUD.init();
        Input.init();
        Audio.init();

        document.getElementById('start-btn').addEventListener('click', start);
    }

    function start() {
        document.getElementById('overlay').classList.add('hidden');

        // Reset everything
        Sprites.reset();
        Memory.reset();
        HUD.reset();

        // Generate map
        GameMap.generate();

        // Find player spawn (first room)
        const rooms = GameMap.getRooms();
        const spawnRoom = rooms[0];
        Player.reset(spawnRoom.cx, spawnRoom.cy);

        // Spawn monsters and pickups
        Monsters.reset();
        Pickups.reset();
        Monsters.spawnInRooms();
        Pickups.placeInRooms();

        // Start AI
        PlayerAI.reset();

        // Start music
        Audio.startMusic();

        HUD.showMessage('Entering the dungeon...');

        gameOver = false;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function loop(timestamp) {
        if (!running) return;

        const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
        lastTime = timestamp;

        update(dt);
        render();

        requestAnimationFrame(loop);
    }

    function update(dt) {
        if (gameOver) return;

        const now = performance.now() / 1000;
        const p = Player.getState();

        // AI or manual control
        if (PlayerAI.isEnabled()) {
            PlayerAI.update(dt);
        } else {
            Input.handleManualInput(dt);
        }

        // Update player
        Player.update(dt);

        // Update monsters
        const aliveMonsters = Monsters.getAlive();
        let nearestMonsterDist = Infinity;

        for (const monster of aliveMonsters) {
            const damage = MonsterAI.update(monster, p, dt);
            if (damage && damage > 0) {
                Player.takeDamage(damage);
            }

            const dx = monster.x - p.x;
            const dy = monster.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestMonsterDist) nearestMonsterDist = dist;
        }

        // Combat intensity for music
        const intensity = nearestMonsterDist < 10 ? (1 - nearestMonsterDist / 10) : 0;
        Audio.setCombatIntensity(intensity);

        // Check pickups
        const collected = Pickups.checkCollection(p.x, p.y);
        for (const pickup of collected) {
            Audio.playPickup();
            if (pickup.type === 'health') {
                Player.heal(25);
                HUD.showMessage('Health restored +25');
            } else if (pickup.type === 'ammo') {
                const added = Weapons.addAmmo(pickup.subtype, 12);
                if (added) HUD.showMessage(`${pickup.subtype} ammo +12`);
            } else if (pickup.type === 'weapon') {
                const added = Weapons.addWeapon(pickup.subtype);
                if (added) HUD.showMessage(`Picked up ${CONFIG.WEAPONS[pickup.subtype].name}!`);
            }
        }

        // Game over check
        if (!p.alive) {
            gameOver = true;
            Audio.stopMusic();
            setTimeout(() => {
                const overlay = document.getElementById('overlay');
                overlay.classList.remove('hidden');
                document.getElementById('overlay-title').textContent = 'GAME OVER';
                document.getElementById('overlay-subtitle').textContent =
                    `Kills: ${Monsters.getKillCount()} | Score: ${Monsters.getKillCount() * 100}`;
                document.getElementById('start-btn').textContent = 'RESTART';
            }, 1500);
        }
    }

    function render() {
        const p = Player.getState();
        Raycaster.render(p);
        HUD.update();
    }

    // Start on load
    window.addEventListener('load', init);

    return { init, start };
})();
