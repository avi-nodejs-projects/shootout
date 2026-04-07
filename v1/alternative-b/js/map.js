// BSP maze generation with rooms and corridors
const GameMap = (() => {
    let grid = [];
    let rooms = [];
    let width = 0, height = 0;

    function generate() {
        width = CONFIG.MAP_SIZE;
        height = CONFIG.MAP_SIZE;
        grid = [];
        rooms = [];

        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) grid[y][x] = CONFIG.TILE.WALL;
        }

        // BSP split
        const root = { x: 1, y: 1, w: width - 2, h: height - 2, left: null, right: null, room: null };
        splitNode(root, 0);
        createRooms(root);
        connectNodes(root);

        return { grid, rooms, width, height };
    }

    function splitNode(node, depth) {
        if (depth >= CONFIG.BSP_MAX_DEPTH) return;
        if (node.w < CONFIG.BSP_MIN_SIZE * 2 + 2 && node.h < CONFIG.BSP_MIN_SIZE * 2 + 2) return;

        // Choose split direction
        let splitH;
        if (node.w > node.h * 1.3) splitH = false;
        else if (node.h > node.w * 1.3) splitH = true;
        else splitH = Math.random() < 0.5;

        if (splitH) {
            if (node.h < CONFIG.BSP_MIN_SIZE * 2 + 2) return;
            const split = CONFIG.BSP_MIN_SIZE + Math.floor(Math.random() * (node.h - CONFIG.BSP_MIN_SIZE * 2));
            node.left = { x: node.x, y: node.y, w: node.w, h: split, left: null, right: null, room: null };
            node.right = { x: node.x, y: node.y + split + 1, w: node.w, h: node.h - split - 1, left: null, right: null, room: null };
        } else {
            if (node.w < CONFIG.BSP_MIN_SIZE * 2 + 2) return;
            const split = CONFIG.BSP_MIN_SIZE + Math.floor(Math.random() * (node.w - CONFIG.BSP_MIN_SIZE * 2));
            node.left = { x: node.x, y: node.y, w: split, h: node.h, left: null, right: null, room: null };
            node.right = { x: node.x + split + 1, y: node.y, w: node.w - split - 1, h: node.h, left: null, right: null, room: null };
        }

        splitNode(node.left, depth + 1);
        splitNode(node.right, depth + 1);
    }

    function createRooms(node) {
        if (node.left || node.right) {
            if (node.left) createRooms(node.left);
            if (node.right) createRooms(node.right);
            return;
        }

        // Leaf node — create room
        const rw = CONFIG.MIN_ROOM_SIZE + Math.floor(Math.random() * (node.w - CONFIG.MIN_ROOM_SIZE));
        const rh = CONFIG.MIN_ROOM_SIZE + Math.floor(Math.random() * (node.h - CONFIG.MIN_ROOM_SIZE));
        const rx = node.x + Math.floor(Math.random() * (node.w - rw));
        const ry = node.y + Math.floor(Math.random() * (node.h - rh));

        if (rx + rw >= width - 1 || ry + rh >= height - 1) return;

        for (let dy = 0; dy < rh; dy++) {
            for (let dx = 0; dx < rw; dx++) {
                grid[ry + dy][rx + dx] = CONFIG.TILE.FLOOR;
            }
        }

        const room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2), id: rooms.length };
        rooms.push(room);
        node.room = room;
    }

    function getRoom(node) {
        if (node.room) return node.room;
        if (node.left) { const r = getRoom(node.left); if (r) return r; }
        if (node.right) return getRoom(node.right);
        return null;
    }

    function connectNodes(node) {
        if (!node.left || !node.right) return;
        connectNodes(node.left);
        connectNodes(node.right);

        const roomA = getRoom(node.left);
        const roomB = getRoom(node.right);
        if (roomA && roomB) {
            carveCorridor(roomA.cx, roomA.cy, roomB.cx, roomB.cy);
        }
    }

    function carveCorridor(x1, y1, x2, y2) {
        // L-shaped corridor
        let cx = x1, cy = y1;
        if (Math.random() < 0.5) {
            while (cx !== x2) { carveCell(cx, cy); cx += Math.sign(x2 - cx); }
            while (cy !== y2) { carveCell(cx, cy); cy += Math.sign(y2 - cy); }
        } else {
            while (cy !== y2) { carveCell(cx, cy); cy += Math.sign(y2 - cy); }
            while (cx !== x2) { carveCell(cx, cy); cx += Math.sign(x2 - cx); }
        }
        carveCell(cx, cy);
    }

    function carveCell(x, y) {
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            grid[y][x] = CONFIG.TILE.FLOOR;
        }
    }

    function isWall(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return true;
        return grid[gy][gx] === CONFIG.TILE.WALL || grid[gy][gx] === CONFIG.TILE.OBSTACLE;
    }

    function isSolid(x, y) {
        return isWall(x, y);
    }

    function isFloor(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return false;
        return grid[gy][gx] === CONFIG.TILE.FLOOR;
    }

    function getRoomAt(x, y) {
        const gx = Math.floor(x), gy = Math.floor(y);
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) return i;
        }
        return -1;
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

    return {
        generate, isWall, isSolid, isFloor, getRoomAt, hasLineOfSight,
        getGrid: () => grid, getRooms: () => rooms, getWidth: () => width, getHeight: () => height,
        setTile: (x, y, v) => { if (x > 0 && x < width - 1 && y > 0 && y < height - 1) grid[y][x] = v; }
    };
})();
