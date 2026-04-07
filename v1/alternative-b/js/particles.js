// Neon particle effects
const Particles = (() => {
    let particles = [];

    function reset() { particles = []; }

    function spawn(x, y, count, color, speed, life) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = speed * (0.5 + Math.random() * 0.5);
            particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: life * (0.5 + Math.random() * 0.5),
                maxLife: life,
                color,
                size: 2 + Math.random() * 3,
            });
        }
    }

    function muzzleFlash(x, y, angle, color) {
        for (let i = 0; i < 5; i++) {
            const spread = (Math.random() - 0.5) * 0.5;
            particles.push({
                x, y,
                vx: Math.cos(angle + spread) * 4,
                vy: Math.sin(angle + spread) * 4,
                life: 0.1,
                maxLife: 0.1,
                color: color || '#ffff00',
                size: 3,
            });
        }
    }

    function update(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function getAll() { return particles; }

    return { reset, spawn, muzzleFlash, update, getAll };
})();
