// Atmospheric raycaster with fog, colored lighting, flickering
const Raycaster = (() => {
    let canvas, ctx, depthBuffer = [];
    let floorConfig = null;
    let flickerPhase = 0;

    function init(canvasEl) {
        canvas = canvasEl;
        canvas.width = CONFIG.SCREEN_W;
        canvas.height = CONFIG.SCREEN_H;
        ctx = canvas.getContext('2d');
        depthBuffer = new Array(CONFIG.SCREEN_W);
    }

    function setFloorConfig(cfg) { floorConfig = cfg; }

    function render(player) {
        if (!floorConfig) return;
        const p = player;
        const t = performance.now() / 1000;
        flickerPhase = t;

        // Ceiling
        const fogC = hexToRgb(floorConfig.fogColor);
        ctx.fillStyle = floorConfig.fogColor;
        ctx.fillRect(0, 0, CONFIG.SCREEN_W, CONFIG.SCREEN_H / 2);

        // Floor gradient
        const halfH = CONFIG.SCREEN_H / 2;
        for (let row = 0; row < halfH; row += 3) {
            const rd = halfH / (row + 1);
            const shade = Math.max(0, 1 - rd / CONFIG.MAX_DEPTH) * 0.5;
            ctx.fillStyle = `rgba(${fogC.r + 20},${fogC.g + 15},${fogC.b + 10},${shade})`;
            ctx.fillRect(0, halfH + row, CONFIG.SCREEN_W, 3);
        }

        // Walls
        const wallRgb = hexToRgb(floorConfig.wallColor);
        const lightRgb = hexToRgb(floorConfig.lightColor);

        for (let col = 0; col < CONFIG.SCREEN_W; col++) {
            const rayAngle = p.angle - CONFIG.FOV / 2 + (col / CONFIG.SCREEN_W) * CONFIG.FOV;
            const result = castDDA(p.x, p.y, rayAngle);
            const corrDist = result.dist * Math.cos(rayAngle - p.angle);
            depthBuffer[col] = corrDist;

            const wallH = Math.min(CONFIG.SCREEN_H * 2, CONFIG.SCREEN_H / corrDist);
            const wallTop = (CONFIG.SCREEN_H - wallH) / 2;

            // Distance fog + flickering light
            let shade = Math.max(0, 1 - corrDist / CONFIG.MAX_DEPTH);
            const flicker = 0.85 + Math.sin(flickerPhase * 3 + col * 0.1) * 0.15;
            shade *= flicker;

            // Side shading
            const sideMultiplier = result.side === 0 ? 0.8 : 1.0;
            shade *= sideMultiplier;

            // Light tinting from nearby room type
            let r = Math.floor(wallRgb.r * shade);
            let g = Math.floor(wallRgb.g * shade);
            let b = Math.floor(wallRgb.b * shade);

            // Add light color tint for close walls
            if (corrDist < 5) {
                const lightBlend = (1 - corrDist / 5) * 0.3;
                r = Math.floor(r * (1 - lightBlend) + lightRgb.r * lightBlend);
                g = Math.floor(g * (1 - lightBlend) + lightRgb.g * lightBlend);
                b = Math.floor(b * (1 - lightBlend) + lightRgb.b * lightBlend);
            }

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(col, wallTop, 1, wallH);

            // Elevator tile special rendering
            if (result.tile === CONFIG.TILE.ELEVATOR) {
                const accentRgb = hexToRgb(floorConfig.accentColor);
                const pulse = Math.sin(t * 3) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${shade * pulse * 0.4})`;
                ctx.fillRect(col, wallTop, 1, wallH);
            }
        }

        renderSprites(p);

        // Muzzle flash
        if (p.muzzleFlash > 0) {
            const alpha = p.muzzleFlash * 8;
            ctx.fillStyle = `rgba(255,200,100,${Math.min(0.8, alpha)})`;
            ctx.beginPath();
            ctx.arc(CONFIG.SCREEN_W / 2, CONFIG.SCREEN_H - 50, 15 + alpha * 10, 0, Math.PI * 2);
            ctx.fill();
        }

        renderWeapon(p, t);

        // Screen shake on damage
        if (p.muzzleFlash > 0.05) {
            const shakeX = (Math.random() - 0.5) * 4;
            const shakeY = (Math.random() - 0.5) * 4;
            ctx.translate(shakeX, shakeY);
        }
    }

    function castDDA(ox, oy, angle) {
        const dirX = Math.cos(angle), dirY = Math.sin(angle);
        let mapX = Math.floor(ox), mapY = Math.floor(oy);
        const ddx = Math.abs(1 / dirX), ddy = Math.abs(1 / dirY);
        let stepX, stepY, sdx, sdy;
        if (dirX < 0) { stepX = -1; sdx = (ox - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - ox) * ddx; }
        if (dirY < 0) { stepY = -1; sdy = (oy - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - oy) * ddy; }

        let side = 0;
        for (let i = 0; i < 100; i++) {
            if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
            const t = getTile(mapX, mapY);
            if (t === CONFIG.TILE.WALL || t === CONFIG.TILE.DOOR_LOCKED) {
                const d = side === 0 ? sdx - ddx : sdy - ddy;
                return { dist: Math.max(0.1, d), side, tile: t };
            }
            if (t === CONFIG.TILE.ELEVATOR) {
                const d = side === 0 ? sdx - ddx : sdy - ddy;
                return { dist: Math.max(0.1, d), side, tile: t };
            }
        }
        return { dist: CONFIG.MAX_DEPTH, side: 0, tile: 0 };
    }

    function getTile(x, y) {
        const grid = GameMap.getGrid(), w = GameMap.getWidth(), h = GameMap.getHeight();
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
            const sw = sh * (sp.boss ? 0.9 : 0.6);
            const st = (CONFIG.SCREEN_H - sh) / 2;
            const shade = Math.max(0.15, 1 - dist / CONFIG.MAX_DEPTH);
            const sc = Math.max(0, Math.floor(sx - sw / 2));
            const ec = Math.min(CONFIG.SCREEN_W, Math.floor(sx + sw / 2));

            let visible = false;
            for (let c = sc; c < ec; c++) if (dist < depthBuffer[c]) { visible = true; break; }
            if (!visible) continue;

            if (sp.alive !== undefined) {
                const rgb = hexToRgb(sp.color);
                const r = Math.floor(rgb.r * shade), g = Math.floor(rgb.g * shade), b = Math.floor(rgb.b * shade);
                const color = sp.hurtTimer > 0 ? '#ffffff' : `rgb(${r},${g},${b})`;

                for (let c = sc; c < ec; c++) {
                    if (dist < depthBuffer[c]) {
                        ctx.fillStyle = color;
                        ctx.fillRect(c, st + sh * 0.2, 1, sh * 0.6);
                    }
                }

                // Boss — larger, glowing
                if (sp.boss) {
                    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${shade * 0.2})`;
                    for (let c = sc - 4; c < ec + 4; c++) {
                        if (c >= 0 && c < CONFIG.SCREEN_W && dist < depthBuffer[c]) {
                            ctx.fillRect(c, st + sh * 0.1, 1, sh * 0.8);
                        }
                    }
                }

                // Eyes
                ctx.fillStyle = '#ff0000';
                const eyeSize = Math.max(1, sh * 0.05);
                ctx.fillRect(Math.floor(sx - sw * 0.1), st + sh * 0.3, eyeSize, eyeSize);
                ctx.fillRect(Math.floor(sx + sw * 0.06), st + sh * 0.3, eyeSize, eyeSize);

                // HP bar
                if (sp.hp < sp.maxHp) {
                    const bw = sw * 0.8, bh = sp.boss ? 4 : 2;
                    const bx = sx - bw / 2, by = st + sh * 0.1;
                    const pct = sp.hp / sp.maxHp;
                    ctx.fillStyle = '#110000';
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = pct > 0.5 ? '#44cc44' : (pct > 0.25 ? '#cccc00' : '#cc2200');
                    ctx.fillRect(bx, by, bw * pct, bh);
                }
            } else {
                // Pickup
                const bob = Math.sin(performance.now() / 250 + (sp.bobPhase || 0)) * sh * 0.04;
                const rgb = hexToRgb(sp.color);
                const r = Math.floor(rgb.r * shade), g = Math.floor(rgb.g * shade), b = Math.floor(rgb.b * shade);
                const pkH = sh * 0.2;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                for (let c = sc; c < ec; c++) {
                    if (dist < depthBuffer[c]) ctx.fillRect(c, st + sh * 0.45 - pkH / 2 + bob, 1, pkH);
                }
                // Key glow
                if (sp.type === 'key') {
                    ctx.fillStyle = `rgba(255,204,68,${shade * 0.3 * (Math.sin(performance.now() / 200) * 0.5 + 0.5)})`;
                    for (let c = sc - 2; c < ec + 2; c++) {
                        if (c >= 0 && c < CONFIG.SCREEN_W && dist < depthBuffer[c]) {
                            ctx.fillRect(c, st + sh * 0.3 + bob, 1, sh * 0.4);
                        }
                    }
                }
            }
        }
    }

    function renderWeapon(p, t) {
        const w = Weapons.current();
        if (!w) return;
        const bob = Math.sin(t * 5) * 2;
        const bx = CONFIG.SCREEN_W / 2, by = CONFIG.SCREEN_H - 55 + bob;
        ctx.fillStyle = '#444';
        ctx.fillRect(bx - 3, by - 28, 6, 26);
        ctx.fillRect(bx - 10, by - 2, 20, 12);
        ctx.fillRect(bx - 5, by + 8, 10, 18);
        if (w.reloading) { ctx.fillStyle = '#ff440088'; ctx.font = '12px Courier New'; ctx.textAlign = 'center'; ctx.fillText('RELOADING', bx, by - 35); }
    }

    function hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return { r: 128, g: 128, b: 128 };
        return { r: parseInt(hex.slice(1, 3), 16) || 0, g: parseInt(hex.slice(3, 5), 16) || 0, b: parseInt(hex.slice(5, 7), 16) || 0 };
    }

    return { init, setFloorConfig, render };
})();
