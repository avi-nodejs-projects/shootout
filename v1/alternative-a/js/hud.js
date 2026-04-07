// HUD rendering (minimap, health, ammo, messages)
const HUD = (() => {
    let minimapCanvas, minimapCtx;
    let messages = [];
    let roomsExplored = new Set();

    function init() {
        minimapCanvas = document.getElementById('minimap-canvas');
        minimapCanvas.width = CONFIG.MINIMAP_SIZE;
        minimapCanvas.height = CONFIG.MINIMAP_SIZE;
        minimapCtx = minimapCanvas.getContext('2d');
    }

    function reset() {
        messages = [];
        roomsExplored = new Set();
        document.getElementById('messages').innerHTML = '';
    }

    function update() {
        const p = Player.getState();
        const weapon = Weapons.current();

        // Health bar
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        const hpPct = p.health / p.maxHealth;
        healthBar.style.width = (hpPct * 100) + '%';
        healthBar.className = 'bar' + (hpPct < 0.25 ? ' critical' : (hpPct < 0.5 ? ' warning' : ''));
        healthText.textContent = Math.ceil(p.health);

        // Weapon
        if (weapon) {
            document.getElementById('weapon-name').textContent = weapon.name;
            document.getElementById('ammo-clip').textContent = weapon.clip;
            document.getElementById('ammo-reserve').textContent = weapon.infiniteAmmo ? '∞' : weapon.reserve;
        }

        // Score
        document.getElementById('kill-count').textContent = Monsters.getKillCount();

        // Track rooms
        const roomIdx = GameMap.getRoomAt(p.x, p.y);
        if (roomIdx >= 0) roomsExplored.add(roomIdx);
        document.getElementById('room-count').textContent = roomsExplored.size;

        // Render minimap
        renderMinimap(p);

        // Fade messages
        const now = Date.now();
        messages = messages.filter(m => now - m.time < 3000);
        const msgEl = document.getElementById('messages');
        msgEl.innerHTML = messages.map(m => {
            const age = now - m.time;
            const opacity = age > 2000 ? 1 - (age - 2000) / 1000 : 1;
            return `<div class="message" style="opacity:${opacity}">${m.text}</div>`;
        }).join('');
    }

    function renderMinimap(p) {
        const size = CONFIG.MINIMAP_SIZE;
        const grid = GameMap.getGrid();
        const mapW = GameMap.getWidth();
        const mapH = GameMap.getHeight();
        const scale = size / mapW;

        minimapCtx.fillStyle = '#000';
        minimapCtx.fillRect(0, 0, size, size);

        // Draw explored walls/floors only near player (fog of war)
        const trail = Memory.getTrail();
        const visited = new Set(trail.map(t => `${t.x},${t.y}`));

        // Draw visible area around player and memory trail
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const dx = x - Math.floor(p.x);
                const dy = y - Math.floor(p.y);
                const dist = Math.sqrt(dx * dx + dy * dy);

                let alpha = 0;
                if (dist < 5) {
                    alpha = 1;
                } else if (visited.has(`${x},${y}`)) {
                    const trailEntry = trail.find(t => t.x === x && t.y === y);
                    alpha = trailEntry ? 0.3 + 0.5 * (1 - trailEntry.age) : 0.2;
                }

                if (alpha > 0) {
                    if (grid[y][x] === CONFIG.TILE.WALL) {
                        minimapCtx.fillStyle = `rgba(100, 100, 140, ${alpha})`;
                    } else {
                        minimapCtx.fillStyle = `rgba(40, 40, 50, ${alpha})`;
                    }
                    minimapCtx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
                }
            }
        }

        // Draw memory trail
        for (const t of trail) {
            const brightness = Math.floor(100 + 155 * (1 - t.age));
            minimapCtx.fillStyle = `rgba(0, ${brightness}, 0, 0.6)`;
            minimapCtx.fillRect(t.x * scale + scale * 0.2, t.y * scale + scale * 0.2, scale * 0.6, scale * 0.6);
        }

        // Draw monsters (visible ones)
        for (const m of Monsters.getAlive()) {
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < 8) {
                minimapCtx.fillStyle = '#f00';
                minimapCtx.fillRect(m.x * scale - 1, m.y * scale - 1, 3, 3);
            }
        }

        // Draw player
        minimapCtx.fillStyle = '#0f0';
        minimapCtx.fillRect(p.x * scale - 2, p.y * scale - 2, 4, 4);

        // Player direction
        minimapCtx.strokeStyle = '#0f0';
        minimapCtx.beginPath();
        minimapCtx.moveTo(p.x * scale, p.y * scale);
        minimapCtx.lineTo(p.x * scale + Math.cos(p.angle) * 8, p.y * scale + Math.sin(p.angle) * 8);
        minimapCtx.stroke();
    }

    function showMessage(text) {
        // Don't show duplicate messages within 2 seconds
        const now = Date.now();
        if (messages.some(m => m.text === text && now - m.time < 2000)) return;
        messages.push({ text, time: now });
        if (messages.length > 4) messages.shift();
    }

    return { init, reset, update, showMessage };
})();
