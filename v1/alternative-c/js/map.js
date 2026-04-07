const GameMap = (() => {
    let grid = [], rooms = [], width = 0, height = 0;
    let elevatorPos = null, bossRoomIdx = -1, keyRoomIdx = -1;

    function generate(floorConfig) {
        width = floorConfig.mapSize;
        height = floorConfig.mapSize;
        grid = [];
        rooms = [];
        elevatorPos = null;
        bossRoomIdx = -1;
        keyRoomIdx = -1;

        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) grid[y][x] = CONFIG.TILE.WALL;
        }

        // Place rooms
        const numRooms = floorConfig.rooms;
        for (let attempt = 0; attempt < numRooms * 15 && rooms.length < numRooms; attempt++) {
            const rw = 3 + Math.floor(Math.random() * 4);
            const rh = 3 + Math.floor(Math.random() * 4);
            let rx = 1 + Math.floor(Math.random() * ((width - rw - 2) / 2)) * 2;
            let ry = 1 + Math.floor(Math.random() * ((height - rh - 2) / 2)) * 2;
            if (rx + rw >= width - 1) rx = width - rw - 2;
            if (ry + rh >= height - 1) ry = height - rh - 2;
            if (rx < 1) rx = 1;
            if (ry < 1) ry = 1;

            let ok = true;
            for (const r of rooms) {
                if (rx - 1 < r.x + r.w && rx + rw + 1 > r.x && ry - 1 < r.y + r.h && ry + rh + 1 > r.y) { ok = false; break; }
            }
            if (!ok) continue;

            for (let dy = 0; dy < rh; dy++)
                for (let dx = 0; dx < rw; dx++)
                    grid[ry + dy][rx + dx] = CONFIG.TILE.FLOOR;

            rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2), type: 'normal' });
        }

        // Maze corridors
        carveMaze(1, 1);
        for (const r of rooms) connectRoom(r);

        // Assign special rooms
        if (rooms.length >= 3) {
            // Boss room = farthest from spawn
            const spawn = rooms[0];
            let maxDist = 0;
            for (let i = 1; i < rooms.length; i++) {
                const d = Math.sqrt((rooms[i].cx - spawn.cx) ** 2 + (rooms[i].cy - spawn.cy) ** 2);
                if (d > maxDist) { maxDist = d; bossRoomIdx = i; }
            }
            rooms[bossRoomIdx].type = 'boss';

            // Elevator in boss room
            elevatorPos = { x: rooms[bossRoomIdx].cx, y: rooms[bossRoomIdx].cy };
            grid[elevatorPos.y][elevatorPos.x] = CONFIG.TILE.ELEVATOR;

            // Key in a random non-boss, non-spawn room
            const candidates = [];
            for (let i = 1; i < rooms.length; i++) if (i !== bossRoomIdx) candidates.push(i);
            keyRoomIdx = candidates[Math.floor(Math.random() * candidates.length)];
            rooms[keyRoomIdx].type = 'key';

            // Safe rooms
            let safeCount = 0;
            for (let i = 1; i < rooms.length; i++) {
                if (i === bossRoomIdx || i === keyRoomIdx) continue;
                if (safeCount < 2 && Math.random() < 0.4) { rooms[i].type = 'safe'; safeCount++; }
                else if (rooms[i].type === 'normal') rooms[i].type = Math.random() < 0.5 ? 'monster' : 'ammo';
            }
        }

        return { grid, rooms, width, height, elevatorPos, bossRoomIdx, keyRoomIdx };
    }

    function carveMaze(sx, sy) {
        const stack = [];
        if (grid[sy][sx] === CONFIG.TILE.WALL) grid[sy][sx] = CONFIG.TILE.FLOOR;
        stack.push({ x: sx, y: sy });
        while (stack.length) {
            const cur = stack[stack.length - 1];
            const nb = [
                { x: cur.x - 2, y: cur.y }, { x: cur.x + 2, y: cur.y },
                { x: cur.x, y: cur.y - 2 }, { x: cur.x, y: cur.y + 2 }
            ].filter(d => d.x > 0 && d.x < width - 1 && d.y > 0 && d.y < height - 1 && grid[d.y][d.x] === CONFIG.TILE.WALL);
            if (nb.length) {
                const next = nb[Math.floor(Math.random() * nb.length)];
                grid[cur.y + (next.y - cur.y) / 2][cur.x + (next.x - cur.x) / 2] = CONFIG.TILE.FLOOR;
                grid[next.y][next.x] = CONFIG.TILE.FLOOR;
                stack.push(next);
            } else stack.pop();
        }
    }

    function connectRoom(room) {
        const edges = [
            { x: room.x - 1, y: room.cy }, { x: room.x + room.w, y: room.cy },
            { x: room.cx, y: room.y - 1 }, { x: room.cx, y: room.y + room.h },
        ];
        for (const e of edges) {
            if (e.x > 0 && e.x < width - 1 && e.y > 0 && e.y < height - 1) {
                grid[e.y][e.x] = CONFIG.TILE.FLOOR;
            }
        }
    }

    function isWall(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return true;
        return grid[gy][gx] === CONFIG.TILE.WALL || grid[gy][gx] === CONFIG.TILE.DOOR_LOCKED;
    }

    function isFloor(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return false;
        const t = grid[gy][gx];
        return t === CONFIG.TILE.FLOOR || t === CONFIG.TILE.ELEVATOR || t === CONFIG.TILE.DOOR_OPEN;
    }

    function hasLineOfSight(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist / 0.15);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (isWall(x1 + dx * t, y1 + dy * t)) return false;
        }
        return true;
    }

    function getRoomAt(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) return i;
        }
        return -1;
    }

    function isElevator(x, y) {
        if (!elevatorPos) return false;
        return Math.floor(x) === elevatorPos.x && Math.floor(y) === elevatorPos.y;
    }

    return {
        generate, isWall, isFloor, hasLineOfSight, getRoomAt, isElevator,
        getGrid: () => grid, getRooms: () => rooms, getWidth: () => width, getHeight: () => height,
        getElevatorPos: () => elevatorPos, getBossRoomIdx: () => bossRoomIdx, getKeyRoomIdx: () => keyRoomIdx,
    };
})();
