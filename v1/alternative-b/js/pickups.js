const Pickups = (() => {
    let items = [];
    function reset() { items = []; }

    function spawn(x, y, type, subtype) {
        const colors = { health: '#00ff88', ammo: '#ffff00', weapon: '#ff6600', shield: '#00ffff' };
        const p = { x: x + 0.5, y: y + 0.5, type, subtype, color: colors[type] || '#fff', collected: false, bobPhase: Math.random() * Math.PI * 2 };
        items.push(p);
        Sprites.add(p);
        return p;
    }

    function checkCollection(px, py) {
        const collected = [];
        for (let i = items.length - 1; i >= 0; i--) {
            const p = items[i];
            if (p.collected) continue;
            if ((p.x - px) ** 2 + (p.y - py) ** 2 < 0.8) {
                p.collected = true;
                collected.push(p);
                Sprites.remove(p);
                items.splice(i, 1);
            }
        }
        return collected;
    }

    function placeInRooms() {
        const rooms = GameMap.getRooms();
        for (let i = 1; i < rooms.length; i++) {
            const r = rooms[i];
            const rx = () => r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
            const ry = () => r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));

            // Weapon pickups in mid/late rooms
            if (i === Math.floor(rooms.length * 0.3)) spawn(rx(), ry(), 'weapon', 'SHOTGUN');
            if (i === Math.floor(rooms.length * 0.7)) spawn(rx(), ry(), 'weapon', 'PLASMA');

            // Health
            if (Math.random() < 0.35) spawn(rx(), ry(), 'health', null);
            // Shield
            if (Math.random() < 0.2) spawn(rx(), ry(), 'shield', null);
            // Ammo
            if (Math.random() < 0.5) {
                const types = ['PISTOL', 'SHOTGUN', 'PLASMA'];
                spawn(rx(), ry(), 'ammo', types[Math.floor(Math.random() * types.length)]);
            }
        }
    }

    function getAll() { return items; }
    return { reset, spawn, checkCollection, placeInRooms, getAll };
})();
