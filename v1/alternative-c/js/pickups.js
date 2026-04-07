const Pickups = (() => {
    let items = [];
    function reset() { items = []; }

    function spawn(x, y, type, subtype) {
        const colors = { health: '#44ff44', ammo: '#ffff44', weapon: '#ff8844', key: '#ffcc44' };
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

    function placeForFloor(floorIdx) {
        const rooms = GameMap.getRooms();
        const keyRoomIdx = GameMap.getKeyRoomIdx();
        const floorCfg = CONFIG.FLOORS[Math.min(floorIdx, CONFIG.FLOORS.length - 1)];

        for (let i = 1; i < rooms.length; i++) {
            const r = rooms[i];
            const rx = () => r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
            const ry = () => r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));

            // Key pickup
            if (i === keyRoomIdx) spawn(rx(), ry(), 'key', null);

            // Weapon in armory room
            if (floorCfg.weaponReward && r.type === 'ammo' && Math.random() < 0.3) {
                spawn(rx(), ry(), 'weapon', floorCfg.weaponReward);
            }

            // Health in safe rooms
            if (r.type === 'safe') {
                spawn(rx(), ry(), 'health', null);
                spawn(rx(), ry(), 'health', null);
            }

            // Ammo in ammo rooms
            if (r.type === 'ammo') {
                const types = Object.keys(CONFIG.WEAPONS);
                spawn(rx(), ry(), 'ammo', types[Math.floor(Math.random() * types.length)]);
            }

            // Random drops
            if (Math.random() < 0.3) spawn(rx(), ry(), 'health', null);
            if (Math.random() < 0.4) {
                const types = Object.keys(CONFIG.WEAPONS);
                spawn(rx(), ry(), 'ammo', types[Math.floor(Math.random() * Math.min(types.length, 2 + floorIdx))]);
            }
        }
    }

    function getAll() { return items; }
    return { reset, spawn, checkCollection, placeForFloor, getAll };
})();
