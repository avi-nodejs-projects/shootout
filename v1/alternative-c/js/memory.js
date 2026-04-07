// Per-floor journal memory
const Memory = (() => {
    let activeJournal = [];
    let allVisited = new Set();
    let roomNotes = new Map();
    let keyFound = false;
    let bossDefeated = false;
    const maxActive = CONFIG.MEMORY_SIZE;

    function reset() {
        activeJournal = [];
        allVisited = new Set();
        roomNotes = new Map();
        keyFound = false;
        bossDefeated = false;
    }

    function enterRoom(roomId) {
        if (roomId < 0) return null;
        allVisited.add(roomId);

        const existing = activeJournal.indexOf(roomId);
        if (existing >= 0) {
            activeJournal.splice(existing, 1);
            activeJournal.push(roomId);
            return 'remembered';
        }

        const wasPrevious = roomNotes.has(roomId);
        if (activeJournal.length >= maxActive) activeJournal.shift();
        activeJournal.push(roomId);

        if (!roomNotes.has(roomId)) {
            roomNotes.set(roomId, { kills: 0, items: [], cleared: false });
            return 'new';
        }
        return wasPrevious ? 'familiar' : 'remembered';
    }

    function incrementKills(roomId) { const n = roomNotes.get(roomId); if (n) n.kills++; }
    function markCleared(roomId) { const n = roomNotes.get(roomId); if (n) n.cleared = true; }
    function setKeyFound(v) { keyFound = v; }
    function setBossDefeated(v) { bossDefeated = v; }
    function hasKey() { return keyFound; }
    function isBossDefeated() { return bossDefeated; }
    function isRemembered(roomId) { return activeJournal.includes(roomId); }
    function wasVisited(roomId) { return allVisited.has(roomId); }
    function getExploredCount() { return allVisited.size; }

    return { reset, enterRoom, incrementKills, markCleared,
        setKeyFound, setBossDefeated, hasKey, isBossDefeated,
        isRemembered, wasVisited, getExploredCount };
})();
