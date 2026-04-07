const HUD = (() => {
    let currentMessage = '', messageTimer = 0;
    let atmosphereTimer = 0;
    let currentFloor = 0;

    function init() {}
    function reset() { currentMessage = ''; messageTimer = 0; atmosphereTimer = 0; }

    function setFloor(floorIdx) {
        currentFloor = floorIdx;
        const cfg = CONFIG.FLOORS[Math.min(floorIdx, CONFIG.FLOORS.length - 1)];
        document.getElementById('floor-display').textContent = `FLOOR ${floorIdx + 1}: ${cfg.name}`;
        document.getElementById('floor-num').textContent = floorIdx + 1;
    }

    function update(score) {
        const p = Player.getState();
        const w = Weapons.current();
        const rooms = GameMap.getRooms();

        // Health
        const hpBar = document.getElementById('health-bar');
        const pct = p.health / p.maxHealth;
        hpBar.style.width = (pct * 100) + '%';
        hpBar.className = 'bar-inner hp' + (pct < 0.25 ? ' critical' : (pct < 0.5 ? ' warning' : ''));
        document.getElementById('health-text').textContent = Math.ceil(p.health);

        // Vignette intensity based on health
        const vig = document.getElementById('vignette');
        vig.style.background = `radial-gradient(ellipse at center, transparent ${30 + pct * 30}%, rgba(0,0,0,${0.4 + (1 - pct) * 0.4}) 100%)`;

        // Weapon
        if (w) {
            document.getElementById('weapon-name').textContent = w.name.toUpperCase();
            document.getElementById('ammo-clip').textContent = w.clip;
            document.getElementById('ammo-reserve').textContent = w.infiniteAmmo ? '∞' : w.reserve;
        }

        // Journal
        document.getElementById('key-status').textContent = Memory.hasKey() ? 'FOUND' : '--';
        document.getElementById('key-status').className = Memory.hasKey() ? 'found' : '';
        document.getElementById('boss-status').textContent = Memory.isBossDefeated() ? 'DEFEATED' : (Monsters.isBossAlive() ? 'ALIVE' : '?');
        document.getElementById('rooms-explored').textContent = Memory.getExploredCount();
        document.getElementById('rooms-total').textContent = rooms.length;

        // Score
        document.getElementById('score-val').textContent = score;

        // Message fade
        if (messageTimer > 0) {
            messageTimer -= 0.016;
            const el = document.getElementById('message-text');
            el.style.opacity = messageTimer < 0.5 ? messageTimer / 0.5 : 1;
            if (messageTimer <= 0) { el.textContent = ''; el.style.opacity = 1; }
        }

        // Atmosphere messages
        atmosphereTimer -= 0.016;
        if (atmosphereTimer <= 0) {
            atmosphereTimer = 8 + Math.random() * 12;
            const cfg = CONFIG.FLOORS[Math.min(currentFloor, CONFIG.FLOORS.length - 1)];
            const msg = cfg.atmosphere[Math.floor(Math.random() * cfg.atmosphere.length)];
            const el = document.getElementById('atmosphere-text');
            el.textContent = msg;
            el.style.opacity = 0.5;
            setTimeout(() => { el.style.opacity = 0; }, 4000);
        }
    }

    function showMessage(text) {
        if (currentMessage === text && messageTimer > 1) return;
        currentMessage = text;
        messageTimer = 3;
        const el = document.getElementById('message-text');
        el.textContent = text;
        el.style.opacity = 1;
    }

    return { init, reset, setFloor, update, showMessage };
})();
