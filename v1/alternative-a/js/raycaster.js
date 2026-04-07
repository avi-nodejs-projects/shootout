// Raycasting renderer (Wolfenstein 3D style)
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

        // Clear - draw ceiling and floor
        ctx.fillStyle = CONFIG.COLORS.CEILING;
        ctx.fillRect(0, 0, CONFIG.SCREEN_W, CONFIG.SCREEN_H / 2);
        ctx.fillStyle = CONFIG.COLORS.FLOOR;
        ctx.fillRect(0, CONFIG.SCREEN_H / 2, CONFIG.SCREEN_W, CONFIG.SCREEN_H / 2);

        // Cast rays
        for (let col = 0; col < CONFIG.SCREEN_W; col++) {
            const rayAngle = p.angle - CONFIG.FOV / 2 + (col / CONFIG.SCREEN_W) * CONFIG.FOV;
            const result = castRayDDA(p.x, p.y, rayAngle);

            // Fix fisheye
            const correctedDist = result.dist * Math.cos(rayAngle - p.angle);
            depthBuffer[col] = correctedDist;

            // Wall height
            const wallHeight = Math.min(CONFIG.SCREEN_H * 2, CONFIG.SCREEN_H / correctedDist);
            const wallTop = (CONFIG.SCREEN_H - wallHeight) / 2;

            // Shading by distance
            const shade = Math.max(0, 1 - correctedDist / CONFIG.MAX_DEPTH);

            // Color by wall side
            let baseColor;
            if (result.side === 0) {
                baseColor = hexToRgb(CONFIG.COLORS.WALL_NS);
            } else {
                baseColor = hexToRgb(CONFIG.COLORS.WALL_EW);
            }

            const r = Math.floor(baseColor.r * shade);
            const g = Math.floor(baseColor.g * shade);
            const b = Math.floor(baseColor.b * shade);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(col, wallTop, 1, wallHeight);
        }

        // Render sprites
        renderSprites(p);

        // Muzzle flash
        if (p.muzzleFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 100, ${p.muzzleFlash * 5})`;
            ctx.fillRect(CONFIG.SCREEN_W / 2 - 30, CONFIG.SCREEN_H - 80, 60, 40);
        }

        // Weapon display at bottom center
        renderWeaponView(p);
    }

    function castRayDDA(ox, oy, angle) {
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        let mapX = Math.floor(ox);
        let mapY = Math.floor(oy);

        const deltaDistX = Math.abs(1 / dirX);
        const deltaDistY = Math.abs(1 / dirY);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (dirX < 0) {
            stepX = -1;
            sideDistX = (ox - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1 - ox) * deltaDistX;
        }
        if (dirY < 0) {
            stepY = -1;
            sideDistY = (oy - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1 - oy) * deltaDistY;
        }

        let side = 0;
        let dist = 0;

        for (let i = 0; i < 100; i++) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }

            if (GameMap.isWall(mapX, mapY)) {
                if (side === 0) {
                    dist = sideDistX - deltaDistX;
                } else {
                    dist = sideDistY - deltaDistY;
                }
                return { dist: Math.max(0.1, dist), side };
            }
        }

        return { dist: CONFIG.MAX_DEPTH, side: 0 };
    }

    function renderSprites(p) {
        const sorted = Sprites.getSorted(p.x, p.y);

        for (const { sprite, dist } of sorted) {
            if (dist < 0.3 || dist > CONFIG.MAX_DEPTH) continue;

            // Sprite angle relative to player
            const dx = sprite.x - p.x;
            const dy = sprite.y - p.y;
            const spriteAngle = Math.atan2(dy, dx) - p.angle;

            // Normalize angle
            let normAngle = spriteAngle;
            while (normAngle > Math.PI) normAngle -= Math.PI * 2;
            while (normAngle < -Math.PI) normAngle += Math.PI * 2;

            // Check if in FOV
            if (Math.abs(normAngle) > CONFIG.FOV / 2 + 0.2) continue;

            // Screen position
            const screenX = CONFIG.SCREEN_W / 2 + (normAngle / CONFIG.FOV) * CONFIG.SCREEN_W;
            const spriteHeight = CONFIG.SCREEN_H / dist;
            const spriteWidth = spriteHeight * 0.6;
            const spriteTop = (CONFIG.SCREEN_H - spriteHeight) / 2;

            // Shade by distance
            const shade = Math.max(0.2, 1 - dist / CONFIG.MAX_DEPTH);

            // Check depth buffer for occlusion
            const startCol = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const endCol = Math.min(CONFIG.SCREEN_W, Math.floor(screenX + spriteWidth / 2));

            let visible = false;
            for (let col = startCol; col < endCol; col++) {
                if (dist < depthBuffer[col]) { visible = true; break; }
            }
            if (!visible) continue;

            // Draw sprite
            let color;
            if (sprite.alive !== undefined) {
                // Monster
                const rgb = hexToRgb(sprite.color);
                const r = Math.floor(rgb.r * shade);
                const g = Math.floor(rgb.g * shade);
                const b = Math.floor(rgb.b * shade);

                if (sprite.hurtTimer > 0) {
                    color = `rgb(255, ${g}, ${b})`;
                } else {
                    color = `rgb(${r},${g},${b})`;
                }

                // Draw monster body
                for (let col = startCol; col < endCol; col++) {
                    if (dist < depthBuffer[col]) {
                        ctx.fillStyle = color;
                        ctx.fillRect(col, spriteTop + spriteHeight * 0.2, 1, spriteHeight * 0.6);
                        // Eyes
                        if (col === Math.floor(screenX - spriteWidth * 0.15) || col === Math.floor(screenX + spriteWidth * 0.15)) {
                            ctx.fillStyle = '#ff0000';
                            ctx.fillRect(col, spriteTop + spriteHeight * 0.3, 2, spriteHeight * 0.08);
                        }
                    }
                }

                // Health bar above monster
                if (sprite.hp < sprite.maxHp) {
                    const barW = spriteWidth * 0.8;
                    const barH = 3;
                    const barX = screenX - barW / 2;
                    const barY = spriteTop + spriteHeight * 0.1;
                    const hpPct = sprite.hp / sprite.maxHp;
                    ctx.fillStyle = '#300';
                    ctx.fillRect(barX, barY, barW, barH);
                    ctx.fillStyle = hpPct > 0.5 ? '#0f0' : (hpPct > 0.25 ? '#ff0' : '#f00');
                    ctx.fillRect(barX, barY, barW * hpPct, barH);
                }
            } else {
                // Pickup - pulsing bob
                const bob = Math.sin(performance.now() / 300 + (sprite.bobPhase || 0)) * spriteHeight * 0.05;
                const rgb = hexToRgb(sprite.color);
                const r = Math.floor(rgb.r * shade);
                const g = Math.floor(rgb.g * shade);
                const b = Math.floor(rgb.b * shade);
                color = `rgb(${r},${g},${b})`;

                const pickupSize = spriteHeight * 0.25;
                for (let col = startCol; col < endCol; col++) {
                    if (dist < depthBuffer[col]) {
                        ctx.fillStyle = color;
                        ctx.fillRect(col, spriteTop + spriteHeight * 0.5 - pickupSize / 2 + bob, 1, pickupSize);
                    }
                }
            }
        }
    }

    function renderWeaponView(p) {
        const weapon = Weapons.current();
        if (!weapon) return;

        const bob = Math.sin(performance.now() / 200) * 3;
        const baseX = CONFIG.SCREEN_W / 2;
        const baseY = CONFIG.SCREEN_H - 60 + bob;

        ctx.fillStyle = '#555';
        // Gun barrel
        ctx.fillRect(baseX - 3, baseY - 30, 6, 30);
        // Gun body
        ctx.fillRect(baseX - 10, baseY, 20, 15);
        // Handle
        ctx.fillRect(baseX - 5, baseY + 10, 10, 20);

        if (weapon.reloading) {
            ctx.fillStyle = '#ff04';
            ctx.fillText('RELOADING', baseX - 30, baseY - 40);
        }
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    return { init, render };
})();
