// Main game loop with multi-floor management
const Game = (() => {
    let running = false, lastTime = 0, gameOver = false;
    let currentFloor = 0, score = 0, floorStartTime = 0;
    let totalKillsAllFloors = 0;

    function init() {
        Raycaster.init(document.getElementById('game-canvas'));
        HUD.init();
        Input.init();
        Audio.init();
        document.getElementById('start-btn').addEventListener('click', start);
    }

    function start() {
        document.getElementById('overlay').classList.add('hidden');
        currentFloor = 0;
        score = 0;
        totalKillsAllFloors = 0;
        startFloor(0);
        Audio.startMusic();
        gameOver = false;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function startFloor(floorIdx) {
        const cfg = CONFIG.FLOORS[Math.min(floorIdx, CONFIG.FLOORS.length - 1)];
        const floorScale = Math.max(0, floorIdx - CONFIG.FLOORS.length + 1); // Extra scaling for repeating floors

        Sprites.reset();
        Memory.reset();
        HUD.reset();
        HUD.setFloor(floorIdx);

        Audio.setBPM(cfg.bpm);

        // Generate map
        GameMap.generate(cfg);
        Raycaster.setFloorConfig(cfg);

        // Spawn player in first room
        const rooms = GameMap.getRooms();
        Player.reset(rooms[0].cx, rooms[0].cy);

        // Spawn monsters and pickups
        Monsters.reset();
        Pickups.reset();
        Monsters.spawnForFloor(floorIdx, floorScale);
        Pickups.placeForFloor(floorIdx);

        PlayerAI.reset();
        floorStartTime = performance.now() / 1000;

        HUD.showMessage(`Floor ${floorIdx + 1}: ${cfg.name}`);

        // Add weapon from previous floor's reward
        if (floorIdx > 0) {
            const prevCfg = CONFIG.FLOORS[Math.min(floorIdx - 1, CONFIG.FLOORS.length - 1)];
            if (prevCfg.weaponReward) Weapons.addWeapon(prevCfg.weaponReward);
        }
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
        const cfg = CONFIG.FLOORS[Math.min(currentFloor, CONFIG.FLOORS.length - 1)];

        if (PlayerAI.isEnabled()) PlayerAI.update(dt);
        else Input.handleManualInput(dt);

        Player.update(dt);

        // Monsters
        let nearestDist = Infinity;
        for (const m of Monsters.getAlive()) {
            const dmg = MonsterAI.update(m, p, dt);
            if (dmg > 0) {
                Player.takeDamage(dmg);
                if (m.boss) Audio.playBossRoar();
            }
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < nearestDist) nearestDist = d;
        }
        Audio.setCombatIntensity(nearestDist < 10 ? (1 - nearestDist / 10) : 0);

        // Pickups
        const collected = Pickups.checkCollection(p.x, p.y);
        for (const pk of collected) {
            Audio.playPickup();
            const floorMult = currentFloor + 1;
            if (pk.type === 'health') { Player.heal(25); HUD.showMessage('Health +25'); }
            else if (pk.type === 'ammo') { Weapons.addAmmo(pk.subtype, 10); HUD.showMessage(`${pk.subtype} ammo +10`); }
            else if (pk.type === 'weapon') {
                if (Weapons.addWeapon(pk.subtype)) HUD.showMessage(`${CONFIG.WEAPONS[pk.subtype].name} acquired!`);
            } else if (pk.type === 'key') {
                Memory.setKeyFound(true);
                Audio.playKeyPickup();
                HUD.showMessage('KEY ACQUIRED — the boss room awaits');
            }
        }

        // Check elevator
        if (Memory.isBossDefeated() && GameMap.isElevator(p.x, p.y)) {
            // Descend to next floor
            const timeOnFloor = now - floorStartTime;
            const timeBonus = Math.max(0, 300 - Math.floor(timeOnFloor)) * (currentFloor + 1);
            const floorScore = Memory.getExploredCount() * 25 * (currentFloor + 1) + Monsters.getKillCount() * 10 * (currentFloor + 1) + 500 * (currentFloor + 1) + timeBonus;
            score += floorScore;
            totalKillsAllFloors += Monsters.getKillCount();

            currentFloor++;
            Audio.playElevator();
            HUD.showMessage(`Descending to Floor ${currentFloor + 1}...`);

            setTimeout(() => {
                startFloor(currentFloor);
            }, 1500);
            return;
        }

        // Score tracking for kills
        score = totalKillsAllFloors * 10 * (currentFloor + 1) + Monsters.getKillCount() * 10 * (currentFloor + 1) +
                Memory.getExploredCount() * 25 * (currentFloor + 1);

        // Game over
        if (!p.alive) {
            gameOver = true;
            Audio.stopMusic();
            setTimeout(() => {
                const ov = document.getElementById('overlay');
                ov.classList.remove('hidden');
                document.getElementById('overlay-title').textContent = 'YOU HAVE FALLEN';
                document.getElementById('overlay-subtitle').textContent =
                    `Floor ${currentFloor + 1} | Score: ${score}`;
                document.getElementById('start-btn').textContent = 'DESCEND AGAIN';
            }, 1500);
        }
    }

    function render() {
        Raycaster.render(Player.getState());
        HUD.update(score);
    }

    window.addEventListener('load', init);
    return { init, start };
})();
