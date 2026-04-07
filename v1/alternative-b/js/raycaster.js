// Neon raycasting renderer
const Raycaster = (() => {
    let canvas, ctx;
    let depthBuffer = [];

    function init(canvasEl) {
        canvas = canvasEl;
        canvas.width = CONFIG.SCREEN_W;
        canvas.height = CONFIG.SCREEN_H;
        ctx = canvas.getContext('2d');
        depthBuffer = new Array(CONFIG.SCREEN_W);
    }

    function render(player) {
        const p = player;
        const t = performance.now() / 1000;

        // Ceiling
        ctx.fillStyle = CONFIG.COLORS.CEILING;
        ctx.fillRect(0, 0, CONFIG.SCREEN_W, CONFIG.SCREEN_H / 2);

        // Floor with grid
        renderFloor(p, t);

        // Walls
        for (let col = 0; col < CONFIG.SCREEN_W; col++) {
            const rayAngle = p.angle - CONFIG.FOV / 2 + (col / CONFIG.SCREEN_W) * CONFIG.FOV;
            const result = castRayDDA(p.x, p.y, rayAngle);
            const corrDist = result.dist * Math.cos(rayAngle - p.angle);
            depthBuffer[col] = corrDist;

            const wallH = Math.min(CONFIG.SCREEN_H * 2, CONFIG.SCREEN_H / corrDist);
            const wallTop = (CONFIG.SCREEN_H - wallH) / 2;
            const shade = Math.max(0, 1 - corrDist / CONFIG.MAX_DEPTH);

            // Neon wall color by side
            let baseColor;
            if (result.tile === CONFIG.TILE.OBSTACLE) {
                baseColor = hexToRgb('#ff6600');
            } else if (result.side === 0) {
                baseColor = hexToRgb(CONFIG.COLORS.WALL_NS);
            } else {
                baseColor = hexToRgb(CONFIG.COLORS.WALL_EW);
            }

            const r = Math.floor(baseColor.r * shade);
            const g = Math.floor(baseColor.g * shade);
            const b = Math.floor(baseColor.b * shade);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(col, wallTop, 1, wallH);

            // Neon edge glow at wall edges
            if (corrDist < 12) {
                const glowAlpha = shade * 0.4;
                ctx.fillStyle = result.side === 0
                    ? `rgba(255,0,255,${glowAlpha})`
                    : `rgba(0,255,255,${glowAlpha})`;
                ctx.fillRect(col, wallTop, 1, 2);
                ctx.fillRect(col, wallTop + wallH - 2, 1, 2);
            }
        }

        // Sprites
        renderSprites(p);

        // Muzzle flash
        if (p.muzzleFlash > 0) {
            const w = Weapons.current();
            const flashColor = w ? w.color : '#ffff00';
            const alpha = p.muzzleFlash * 8;
            ctx.fillStyle = flashColor.replace(')', `,${Math.min(1, alpha)})`).replace('rgb', 'rgba').replace('#', '');
            // Quick hex to rgba
            const fc = hexToRgb(flashColor);
            ctx.fillStyle = `rgba(${fc.r},${fc.g},${fc.b},${Math.min(1, alpha)})`;
            ctx.beginPath();
            ctx.arc(CONFIG.SCREEN_W / 2, CONFIG.SCREEN_H - 50, 20 + alpha * 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Weapon
        renderWeapon(p, t);
    }

    function renderFloor(p, t) {
        // Simple gradient floor with grid line effect
        const halfH = CONFIG.SCREEN_H / 2;
        for (let row = 0; row < halfH; row += 4) {
            const rowDist = halfH / (row + 1);
            const shade = Math.max(0, 1 - rowDist / CONFIG.MAX_DEPTH);
            const gridPulse = (Math.sin(t * 2 + row * 0.1) * 0.5 + 0.5) * 0.3;

            const bg = hexToRgb(CONFIG.COLORS.FLOOR);
            const r = Math.floor(bg.r * shade * (1 + gridPulse));
            const g = Math.floor(bg.g * shade * (1 + gridPulse));
            const b = Math.floor(bg.b * shade * (1 + gridPulse));
            ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
            ctx.fillRect(0, halfH + row, CONFIG.SCREEN_W, 4);
        }
    }

    function castRayDDA(ox, oy, angle) {
        const dirX = Math.cos(angle), dirY = Math.sin(angle);
        let mapX = Math.floor(ox), mapY = Math.floor(oy);
        const ddx = Math.abs(1 / dirX), ddy = Math.abs(1 / dirY);
        let stepX, stepY, sdx, sdy;

        if (dirX < 0) { stepX = -1; sdx = (ox - mapX) * ddx; }
        else { stepX = 1; sdx = (mapX + 1 - ox) * ddx; }
        if (dirY < 0) { stepY = -1; sdy = (oy - mapY) * ddy; }
        else { stepY = 1; sdy = (mapY + 1 - oy) * ddy; }

        let side = 0;
        for (let i = 0; i < 100; i++) {
            if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; }
            else { sdy += ddy; mapY += stepY; side = 1; }

            const tile = getTile(mapX, mapY);
            if (tile === CONFIG.TILE.WALL || tile === CONFIG.TILE.OBSTACLE) {
                const dist = side === 0 ? sdx - ddx : sdy - ddy;
                return { dist: Math.max(0.1, dist), side, tile };
            }
        }
        return { dist: CONFIG.MAX_DEPTH, side: 0, tile: 0 };
    }

    function getTile(x, y) {
        const grid = GameMap.getGrid();
        const w = GameMap.getWidth(), h = GameMap.getHeight();
        if (x < 0 || x >= w || y < 0 || y >= h) return CONFIG.TILE.WALL;
        return grid[y][x];
    }

    function renderSprites(p) {
        const sorted = Sprites.getSorted(p.x, p.y);
        for (const { sprite: sp, dist } of sorted) {
            if (dist < 0.3 || dist > CONFIG.MAX_DEPTH) continue;

            let sa = Math.atan2(sp.y - p.y, sp.x - p.x) - p.angle;
            while (sa > Math.PI) sa -= Math.PI * 2;
            while (sa < -Math.PI) sa += Math.PI * 2;
            if (Math.abs(sa) > CONFIG.FOV / 2 + 0.2) continue;

            const sx = CONFIG.SCREEN_W / 2 + (sa / CONFIG.FOV) * CONFIG.SCREEN_W;
            const sh = CONFIG.SCREEN_H / dist;
            const sw = sh * 0.6;
            const st = (CONFIG.SCREEN_H - sh) / 2;
            const shade = Math.max(0.2, 1 - dist / CONFIG.MAX_DEPTH);

            const sc = Math.max(0, Math.floor(sx - sw / 2));
            const ec = Math.min(CONFIG.SCREEN_W, Math.floor(sx + sw / 2));
            let visible = false;
            for (let c = sc; c < ec; c++) { if (dist < depthBuffer[c]) { visible = true; break; } }
            if (!visible) continue;

            if (sp.alive !== undefined) {
                // Monster — neon glow style
                const rgb = hexToRgb(sp.color);
                const r = Math.floor(rgb.r * shade);
                const g = Math.floor(rgb.g * shade);
                const b = Math.floor(rgb.b * shade);
                const color = sp.hurtTimer > 0 ? '#ffffff' : `rgb(${r},${g},${b})`;

                // Glow aura
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${shade * 0.15})`;
                for (let c = sc - 3; c < ec + 3; c++) {
                    if (c >= 0 && c < CONFIG.SCREEN_W && dist < depthBuffer[c]) {
                        ctx.fillRect(c, st + sh * 0.15, 1, sh * 0.7);
                    }
                }

                // Body
                for (let c = sc; c < ec; c++) {
                    if (dist < depthBuffer[c]) {
                        ctx.fillStyle = color;
                        ctx.fillRect(c, st + sh * 0.2, 1, sh * 0.6);
                    }
                }

                // Eyes (glowing red)
                const eyeY = st + sh * 0.3;
                const eyeSize = Math.max(1, sh * 0.06);
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 4;
                ctx.fillRect(Math.floor(sx - sw * 0.12), eyeY, eyeSize, eyeSize);
                ctx.fillRect(Math.floor(sx + sw * 0.08), eyeY, eyeSize, eyeSize);
                ctx.shadowBlur = 0;

                // HP bar
                if (sp.hp < sp.maxHp) {
                    const bw = sw * 0.8, bh = 3;
                    const bx = sx - bw / 2, by = st + sh * 0.1;
                    const hpPct = sp.hp / sp.maxHp;
                    ctx.fillStyle = '#110000';
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : (hpPct > 0.25 ? '#ffff00' : '#ff0044');
                    ctx.fillRect(bx, by, bw * hpPct, bh);
                }
            } else {
                // Pickup — floating neon item
                const bob = Math.sin(performance.now() / 250 + (sp.bobPhase || 0)) * sh * 0.04;
                const rgb = hexToRgb(sp.color);
                const r = Math.floor(rgb.r * shade);
                const g = Math.floor(rgb.g * shade);
                const b = Math.floor(rgb.b * shade);
                const pickupH = sh * 0.2;

                // Glow
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${shade * 0.2})`;
                for (let c = sc; c < ec; c++) {
                    if (dist < depthBuffer[c]) {
                        ctx.fillRect(c, st + sh * 0.4 - pickupH + bob, 1, pickupH * 2);
                    }
                }

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                for (let c = sc; c < ec; c++) {
                    if (dist < depthBuffer[c]) {
                        ctx.fillRect(c, st + sh * 0.45 - pickupH / 2 + bob, 1, pickupH);
                    }
                }
            }
        }
    }

    function renderWeapon(p, t) {
        const w = Weapons.current();
        if (!w) return;
        const bob = Math.sin(t * 5) * 2;
        const bx = CONFIG.SCREEN_W / 2;
        const by = CONFIG.SCREEN_H - 55 + bob;
        const wColor = w.color || '#00ffff';
        const rgb = hexToRgb(wColor);

        // Gun body (neon outline style)
        ctx.strokeStyle = wColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = wColor;
        ctx.shadowBlur = 6;
        // Barrel
        ctx.strokeRect(bx - 3, by - 30, 6, 28);
        // Body
        ctx.strokeRect(bx - 12, by - 2, 24, 12);
        // Handle
        ctx.strokeRect(bx - 6, by + 8, 12, 18);
        ctx.shadowBlur = 0;

        if (w.reloading) {
            ctx.fillStyle = '#ff004488';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('RELOADING', bx, by - 40);
        }
    }

    function hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return { r: 255, g: 255, b: 255 };
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return { r, g, b };
    }

    return { init, render };
})();
