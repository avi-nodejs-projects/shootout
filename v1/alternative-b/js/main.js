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

        Sprites.reset();
        Memory.reset();
        Particles.reset();
        HUD.reset();

        GameMap.generate();
        Obstacles.reset();
        Obstacles.placeInRooms();

        const rooms = GameMap.getRooms();
        const spawn = rooms[0];
        Player.reset(spawn.cx, spawn.cy);

        Monsters.reset();
        Pickups.reset();
        Monsters.spawnInRooms();
        Pickups.placeInRooms();

        PlayerAI.reset();
        Audio.startMusic();
        HUD.showMessage('Entering the Neon Maze...');

        gameOver = false;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function loop(ts) {
        if (!running) return;
        const dt = Math.min(0.05, (ts - lastTime) / 1000);
        lastTime = ts;
        update(dt);
        render();
        requestAnimationFrame(loop);
    }

    function update(dt) {
        if (gameOver) return;
        const now = performance.now() / 1000;
        const p = Player.getState();

        if (PlayerAI.isEnabled()) PlayerAI.update(dt);
        else Input.handleManualInput(dt);

        Player.update(dt);
        Particles.update(dt);

        let nearestDist = Infinity;
        for (const m of Monsters.getAlive()) {
            const dmg = MonsterAI.update(m, p, dt);
            if (dmg > 0) Player.takeDamage(dmg);
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < nearestDist) nearestDist = d;
        }
        Audio.setCombatIntensity(nearestDist < 10 ? (1 - nearestDist / 10) : 0);

        const collected = Pickups.checkCollection(p.x, p.y);
        for (const pk of collected) {
            Audio.playPickup();
            const roomId = GameMap.getRoomAt(p.x, p.y);
            if (pk.type === 'health') { Player.heal(30); HUD.showMessage('Health +30'); Memory.addItem(roomId, 'health'); }
            else if (pk.type === 'shield') { Player.addShield(20); HUD.showMessage('Shield +20'); Memory.addItem(roomId, 'shield'); }
            else if (pk.type === 'ammo') { Weapons.addAmmo(pk.subtype, 15); HUD.showMessage(`${pk.subtype} ammo +15`); Memory.addItem(roomId, 'ammo'); }
            else if (pk.type === 'weapon') { const added = Weapons.addWeapon(pk.subtype); if (added) HUD.showMessage(`${CONFIG.WEAPONS[pk.subtype].name} acquired!`); Memory.addItem(roomId, pk.subtype); }
        }

        if (!p.alive) {
            gameOver = true;
            Audio.stopMusic();
            setTimeout(() => {
                const ov = document.getElementById('overlay');
                ov.classList.remove('hidden');
                document.getElementById('overlay-title').textContent = 'GAME OVER';
                document.getElementById('overlay-subtitle').textContent =
                    `Kills: ${Monsters.getKillCount()} | Rooms: ${Memory.getExploredCount()}/${GameMap.getRooms().length}`;
                document.getElementById('start-btn').textContent = 'RE-ENTER';
            }, 1500);
        }
    }

    function render() {
        Raycaster.render(Player.getState());
        HUD.update();
    }

    window.addEventListener('load', init);
    return { init, start };
})();
