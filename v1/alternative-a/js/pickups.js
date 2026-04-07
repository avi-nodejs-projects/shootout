// Pickup items (ammo, health, weapons)
const Pickups = (() => {
    let items = [];

    function reset() {
        items = [];
    }

    function spawn(x, y, type, subtype) {
        const pickup = {
            x: x + 0.5,
            y: y + 0.5,
            type,       // 'health', 'ammo', 'weapon'
            subtype,    // weapon type or ammo type
            color: getColor(type),
            collected: false,
            bobPhase: Math.random() * Math.PI * 2,
        };
        items.push(pickup);
        Sprites.add(pickup);
        return pickup;
    }

    function getColor(type) {
        switch (type) {
            case 'health': return '#44ff44';
            case 'ammo': return '#ffff44';
            case 'weapon': return '#ff8844';
            default: return '#ffffff';
        }
    }

    function checkCollection(px, py) {
        const collected = [];
        for (let i = items.length - 1; i >= 0; i--) {
            const p = items[i];
            if (p.collected) continue;
            const dx = p.x - px;
            const dy = p.y - py;
            if (dx * dx + dy * dy < 0.8) {
                p.collected = true;
                collected.push(p);
                Sprites.remove(p);
                items.splice(i, 1);
            }
        }
        return collected;
    }

    function getAll() {
        return items;
    }

    function placeInRooms(rooms) {
        const mapRooms = GameMap.getRooms();
        // Skip first room (player spawn)
        for (let i = 1; i < mapRooms.length; i++) {
            const room = mapRooms[i];
            const rx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
            const ry = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

            // Place weapon in specific rooms
            if (i === 2 || i === 3) {
                spawn(rx, ry, 'weapon', 'SHOTGUN');
            } else if (i === 5 || i === 6) {
                spawn(rx, ry, 'weapon', 'SMG');
            }

            // Health in some rooms
            if (Math.random() < 0.4) {
                const hx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const hy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                spawn(hx, hy, 'health', null);
            }

            // Ammo in most rooms
            if (Math.random() < 0.6) {
                const ax = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                const ay = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                const ammoType = i < 4 ? 'PISTOL' : (Math.random() < 0.5 ? 'SHOTGUN' : 'SMG');
                spawn(ax, ay, 'ammo', ammoType);
            }
        }
    }

    return { reset, spawn, checkCollection, getAll, placeInRooms };
})();
