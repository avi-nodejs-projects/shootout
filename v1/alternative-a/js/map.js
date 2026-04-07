// Maze generation using recursive backtracker with room placement
const GameMap = (() => {
    let grid = [];
    let rooms = [];
    let width = 0;
    let height = 0;

    function generate() {
        width = CONFIG.MAP_SIZE;
        height = CONFIG.MAP_SIZE;
        grid = [];
        rooms = [];

        // Fill with walls
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                grid[y][x] = CONFIG.TILE.WALL;
            }
        }

        // Place rooms
        const numRooms = CONFIG.MIN_ROOMS + Math.floor(Math.random() * (CONFIG.MAX_ROOMS - CONFIG.MIN_ROOMS + 1));
        for (let attempt = 0; attempt < numRooms * 10 && rooms.length < numRooms; attempt++) {
            const rw = CONFIG.MIN_ROOM_SIZE + Math.floor(Math.random() * (CONFIG.MAX_ROOM_SIZE - CONFIG.MIN_ROOM_SIZE + 1));
            const rh = CONFIG.MIN_ROOM_SIZE + Math.floor(Math.random() * (CONFIG.MAX_ROOM_SIZE - CONFIG.MIN_ROOM_SIZE + 1));
            // Ensure odd positions for alignment with maze corridors
            let rx = 1 + Math.floor(Math.random() * ((width - rw - 2) / 2)) * 2;
            let ry = 1 + Math.floor(Math.random() * ((height - rh - 2) / 2)) * 2;
            if (rx + rw >= width - 1) rx = width - rw - 2;
            if (ry + rh >= height - 1) ry = height - rh - 2;
            if (rx < 1) rx = 1;
            if (ry < 1) ry = 1;

            // Check overlap
            let overlaps = false;
            for (const room of rooms) {
                if (rx - 1 < room.x + room.w && rx + rw + 1 > room.x &&
                    ry - 1 < room.y + room.h && ry + rh + 1 > room.y) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Carve room
            for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                    grid[ry + dy][rx + dx] = CONFIG.TILE.FLOOR;
                }
            }

            rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) });
        }

        // Recursive backtracker maze in remaining walls
        carveMaze(1, 1);

        // Connect rooms to maze - ensure every room has at least one opening
        for (const room of rooms) {
            connectRoom(room);
        }

        return { grid, rooms, width, height };
    }

    function carveMaze(startX, startY) {
        const stack = [];
        if (grid[startY][startX] === CONFIG.TILE.WALL) {
            grid[startY][startX] = CONFIG.TILE.FLOOR;
        }
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = getUnvisitedNeighbors(current.x, current.y);

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                // Remove wall between current and next
                const wallX = current.x + (next.x - current.x) / 2;
                const wallY = current.y + (next.y - current.y) / 2;
                grid[wallY][wallX] = CONFIG.TILE.FLOOR;
                grid[next.y][next.x] = CONFIG.TILE.FLOOR;
                stack.push(next);
            } else {
                stack.pop();
            }
        }
    }

    function getUnvisitedNeighbors(x, y) {
        const dirs = [
            { x: x - 2, y: y }, { x: x + 2, y: y },
            { x: x, y: y - 2 }, { x: x, y: y + 2 }
        ];
        return dirs.filter(d =>
            d.x > 0 && d.x < width - 1 && d.y > 0 && d.y < height - 1 &&
            grid[d.y][d.x] === CONFIG.TILE.WALL
        );
    }

    function connectRoom(room) {
        // Try to connect each wall edge to adjacent corridors
        const edges = [
            { x: room.x - 1, y: room.cy, dx: -1, dy: 0 },
            { x: room.x + room.w, y: room.cy, dx: 1, dy: 0 },
            { x: room.cx, y: room.y - 1, dx: 0, dy: -1 },
            { x: room.cx, y: room.y + room.h, dx: 0, dy: 1 },
        ];

        let connected = false;
        for (const edge of edges) {
            if (edge.x > 0 && edge.x < width - 1 && edge.y > 0 && edge.y < height - 1) {
                const checkX = edge.x + edge.dx;
                const checkY = edge.y + edge.dy;
                if (checkX > 0 && checkX < width - 1 && checkY > 0 && checkY < height - 1) {
                    if (grid[checkY][checkX] === CONFIG.TILE.FLOOR || grid[edge.y][edge.x] === CONFIG.TILE.FLOOR) {
                        grid[edge.y][edge.x] = CONFIG.TILE.FLOOR;
                        connected = true;
                    }
                }
            }
        }
        // Force at least one connection
        if (!connected && rooms.length > 1) {
            const edge = edges[Math.floor(Math.random() * edges.length)];
            if (edge.x > 0 && edge.x < width - 1 && edge.y > 0 && edge.y < height - 1) {
                grid[edge.y][edge.x] = CONFIG.TILE.FLOOR;
            }
        }
    }

    function isWall(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return true;
        return grid[gy][gx] === CONFIG.TILE.WALL;
    }

    function isFloor(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        if (gx < 0 || gx >= width || gy < 0 || gy >= height) return false;
        return grid[gy][gx] !== CONFIG.TILE.WALL;
    }

    function getRoomAt(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) {
                return i;
            }
        }
        return -1;
    }

    function castRay(ox, oy, angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        let dist = 0;
        const step = 0.05;
        while (dist < CONFIG.MAX_DEPTH) {
            const x = ox + cos * dist;
            const y = oy + sin * dist;
            if (isWall(x, y)) return dist;
            dist += step;
        }
        return CONFIG.MAX_DEPTH;
    }

    function hasLineOfSight(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist / 0.2);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            if (isWall(x, y)) return false;
        }
        return true;
    }

    return { generate, isWall, isFloor, getRoomAt, castRay, hasLineOfSight,
        getGrid: () => grid, getRooms: () => rooms, getWidth: () => width, getHeight: () => height };
})();
