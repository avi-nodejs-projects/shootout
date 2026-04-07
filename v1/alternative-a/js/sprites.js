// Billboard sprite rendering system for monsters and pickups
const Sprites = (() => {
    let sprites = [];

    function reset() {
        sprites = [];
    }

    function add(sprite) {
        sprites.push(sprite);
        return sprite;
    }

    function remove(sprite) {
        const idx = sprites.indexOf(sprite);
        if (idx >= 0) sprites.splice(idx, 1);
    }

    function getAll() {
        return sprites;
    }

    // Sort sprites by distance from player (far to near for painter's algorithm)
    function getSorted(px, py) {
        return sprites
            .map(s => ({
                sprite: s,
                dist: Math.sqrt((s.x - px) ** 2 + (s.y - py) ** 2)
            }))
            .sort((a, b) => b.dist - a.dist);
    }

    return { reset, add, remove, getAll, getSorted };
})();
