// Spatial memory - circular buffer of visited cells
const Memory = (() => {
    let buffer = [];
    const maxSize = CONFIG.MEMORY_SIZE;

    function reset() {
        buffer = [];
    }

    function visit(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);

        // Don't add duplicates of the most recent cell
        if (buffer.length > 0) {
            const last = buffer[buffer.length - 1];
            if (last.x === gx && last.y === gy) return false;
        }

        // Check if already in buffer
        const existingIdx = buffer.findIndex(b => b.x === gx && b.y === gy);
        if (existingIdx >= 0) {
            // Move to end (refresh)
            buffer[existingIdx].timestamp = Date.now();
            const item = buffer.splice(existingIdx, 1)[0];
            buffer.push(item);
            return 'remembered';
        }

        // Add new entry
        const entry = { x: gx, y: gy, timestamp: Date.now() };

        if (buffer.length >= maxSize) {
            buffer.shift(); // Remove oldest
        }
        buffer.push(entry);
        return 'new';
    }

    function wasVisited(x, y) {
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        return buffer.some(b => b.x === gx && b.y === gy);
    }

    function getTrail() {
        return buffer.map((b, i) => ({
            x: b.x,
            y: b.y,
            age: (buffer.length - i) / buffer.length // 0 = newest, 1 = oldest
        }));
    }

    function getRecentPositions(count) {
        return buffer.slice(-count).map(b => ({ x: b.x, y: b.y }));
    }

    return { reset, visit, wasVisited, getTrail, getRecentPositions };
})();
