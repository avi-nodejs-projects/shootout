const Sprites = (() => {
    let sprites = [];
    function reset() { sprites = []; }
    function add(s) { sprites.push(s); return s; }
    function remove(s) { const i = sprites.indexOf(s); if (i >= 0) sprites.splice(i, 1); }
    function getSorted(px, py) {
        return sprites.map(s => ({ sprite: s, dist: Math.sqrt((s.x - px) ** 2 + (s.y - py) ** 2) })).sort((a, b) => b.dist - a.dist);
    }
    return { reset, add, remove, getSorted };
})();
