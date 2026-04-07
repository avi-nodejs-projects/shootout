const HUD = (() => {
    let minimapCanvas, minimapCtx;
    let currentMessage = '';
    let messageTimer = 0;

    function init() {
        minimapCanvas = document.getElementById('minimap-canvas');
        minimapCanvas.width = CONFIG.MINIMAP_SIZE;
        minimapCanvas.height = CONFIG.MINIMAP_SIZE;
        minimapCtx = minimapCanvas.getContext('2d');
    }

    function reset() {
        currentMessage = '';
        messageTimer = 0;
        document.getElementById('message-text').textContent = '';
    }

    function update() {
        const p = Player.getState();
        const w = Weapons.current();
        const rooms = GameMap.getRooms();

        // Health
        const hpBar = document.getElementById('health-bar');
        const hpPct = p.health / p.maxHealth;
        hpBar.style.width = (hpPct * 100) + '%';
        hpBar.className = 'bar-inner health' + (hpPct < 0.25 ? ' critical' : (hpPct < 0.5 ? ' warning' : ''));
        document.getElementById('health-text').textContent = Math.ceil(p.health);

        // Shield
        const shBar = document.getElementById('shield-bar');
        shBar.style.width = (p.shield / p.maxShield * 100) + '%';
        document.getElementById('shield-text').textContent = Math.ceil(p.shield);

        // Weapon
        if (w) {
            document.getElementById('weapon-name').textContent = w.name.toUpperCase();
            document.getElementById('ammo-clip').textContent = w.clip;
            document.getElementById('ammo-reserve').textContent = w.infiniteAmmo ? '∞' : w.reserve;
            const wn = document.getElementById('weapon-name');
            if (w.clip <= Math.ceil(w.clipSize * 0.2) && !w.infiniteAmmo) {
                wn.style.animation = 'pulse-bar 0.5s infinite';
            } else {
                wn.style.animation = '';
            }
        }

        // Stats
        document.getElementById('kill-count').textContent = Monsters.getKillCount();
        document.getElementById('room-count').textContent = `${Memory.getExploredCount()}/${rooms.length}`;

        // Message fade
        if (messageTimer > 0) {
            messageTimer -= 0.016;
            const el = document.getElementById('message-text');
            if (messageTimer < 0.5) el.style.opacity = messageTimer / 0.5;
            else el.style.opacity = 1;
            if (messageTimer <= 0) { el.textContent = ''; el.style.opacity = 1; }
        }

        renderMinimap(p);
    }

    function renderMinimap(p) {
        const size = CONFIG.MINIMAP_SIZE;
        const grid = GameMap.getGrid();
        const w = GameMap.getWidth(), h = GameMap.getHeight();
        const rooms = GameMap.getRooms();
        const scale = size / w;

        minimapCtx.fillStyle = '#0a0a1a';
        minimapCtx.fillRect(0, 0, size, size);

        const visited = Memory.getVisitedSet();
        const active = Memory.getActiveRooms();
        const curRoom = GameMap.getRoomAt(p.x, p.y);

        // Draw rooms
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (!visited.has(i) && i !== curRoom) continue;

            let alpha, fillColor;
            if (i === curRoom) {
                fillColor = `rgba(255,0,255,0.25)`;
                alpha = 1;
            } else if (active.includes(i)) {
                fillColor = `rgba(0,255,255,0.1)`;
                alpha = 0.6;
            } else {
                fillColor = `rgba(100,100,140,0.05)`;
                alpha = 0.2;
            }

            // Room fill
            minimapCtx.fillStyle = fillColor;
            minimapCtx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);

            // Room outline
            minimapCtx.strokeStyle = i === curRoom ? '#ff00ff' : (active.includes(i) ? '#00ffff44' : '#33335544');
            minimapCtx.lineWidth = i === curRoom ? 1.5 : 0.5;
            minimapCtx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        }

        // Draw corridors in explored area (approximate - draw floor tiles near visited rooms)
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (grid[y][x] !== CONFIG.TILE.FLOOR) continue;
                const dx = x - Math.floor(p.x), dy = y - Math.floor(p.y);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 6) {
                    minimapCtx.fillStyle = 'rgba(40,30,60,0.5)';
                    minimapCtx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
                }
            }
        }

        // Monsters nearby
        for (const m of Monsters.getAlive()) {
            const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
            if (d < 8) {
                const mr = hexToRgb(m.color);
                minimapCtx.fillStyle = `rgba(${mr.r},${mr.g},${mr.b},0.8)`;
                minimapCtx.fillRect(m.x * scale - 1, m.y * scale - 1, 3, 3);
            }
        }

        // Player
        minimapCtx.fillStyle = '#00ff88';
        minimapCtx.shadowColor = '#00ff88';
        minimapCtx.shadowBlur = 4;
        minimapCtx.fillRect(p.x * scale - 2, p.y * scale - 2, 4, 4);
        minimapCtx.shadowBlur = 0;

        // Direction
        minimapCtx.strokeStyle = '#00ff88';
        minimapCtx.lineWidth = 1;
        minimapCtx.beginPath();
        minimapCtx.moveTo(p.x * scale, p.y * scale);
        minimapCtx.lineTo(p.x * scale + Math.cos(p.angle) * 10, p.y * scale + Math.sin(p.angle) * 10);
        minimapCtx.stroke();
    }

    function hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return { r: 255, g: 255, b: 255 };
        return { r: parseInt(hex.slice(1, 3), 16) || 0, g: parseInt(hex.slice(3, 5), 16) || 0, b: parseInt(hex.slice(5, 7), 16) || 0 };
    }

    function showMessage(text) {
        if (currentMessage === text && messageTimer > 1) return;
        currentMessage = text;
        messageTimer = 3;
        const el = document.getElementById('message-text');
        el.textContent = text;
        el.style.opacity = 1;
    }

    return { init, reset, update, showMessage };
})();
