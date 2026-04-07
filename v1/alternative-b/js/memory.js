// Room graph memory with decay
const Memory = (() => {
    let roomData = new Map();
    let activeMemory = [];
    let visitedSet = new Set();
    const maxActive = CONFIG.MEMORY_SIZE;

    function reset() {
        roomData = new Map();
        activeMemory = [];
        visitedSet = new Set();
    }

    function enterRoom(roomId) {
        if (roomId < 0) return null;

        visitedSet.add(roomId);

        const existingIdx = activeMemory.indexOf(roomId);
        if (existingIdx >= 0) {
            // Refresh position
            activeMemory.splice(existingIdx, 1);
            activeMemory.push(roomId);
            return 'remembered';
        }

        // Was previously visited but evicted?
        const wasVisited = roomData.has(roomId) && !activeMemory.includes(roomId);

        // Add to active memory
        if (activeMemory.length >= maxActive) {
            const evicted = activeMemory.shift();
            // Keep basic data but mark as not remembered
            if (roomData.has(evicted)) {
                roomData.get(evicted).remembered = false;
            }
        }
        activeMemory.push(roomId);

        // Create or update room data
        if (!roomData.has(roomId)) {
            roomData.set(roomId, {
                id: roomId,
                remembered: true,
                visitCount: 1,
                monstersKilled: 0,
                itemsFound: [],
                firstVisit: Date.now(),
            });
            return 'new';
        } else {
            const data = roomData.get(roomId);
            data.remembered = true;
            data.visitCount++;
            return wasVisited ? 'familiar' : 'remembered';
        }
    }

    function updateRoom(roomId, key, value) {
        const data = roomData.get(roomId);
        if (data) data[key] = value;
    }

    function incrementKills(roomId) {
        const data = roomData.get(roomId);
        if (data) data.monstersKilled++;
    }

    function addItem(roomId, itemName) {
        const data = roomData.get(roomId);
        if (data) data.itemsFound.push(itemName);
    }

    function isRemembered(roomId) {
        return activeMemory.includes(roomId);
    }

    function wasVisited(roomId) {
        return visitedSet.has(roomId);
    }

    function getActiveRooms() {
        return activeMemory.slice();
    }

    function getVisitedSet() {
        return visitedSet;
    }

    function getRoomData(roomId) {
        return roomData.get(roomId);
    }

    function getExploredCount() {
        return visitedSet.size;
    }

    return { reset, enterRoom, updateRoom, incrementKills, addItem,
        isRemembered, wasVisited, getActiveRooms, getVisitedSet, getRoomData, getExploredCount };
})();
