// Game configuration constants
const CONFIG = {
    // Screen
    SCREEN_W: 640,
    SCREEN_H: 400,

    // Map
    MAP_SIZE: 31,
    TILE_SIZE: 1,
    TILE: { WALL: 1, FLOOR: 0, DOOR: 2, SPAWN_PLAYER: 3, SPAWN_MONSTER: 4, PICKUP: 5 },

    // Room generation
    MIN_ROOMS: 5,
    MAX_ROOMS: 8,
    MIN_ROOM_SIZE: 3,
    MAX_ROOM_SIZE: 5,

    // Raycaster
    FOV: Math.PI / 3,
    MAX_DEPTH: 20,

    // Colors
    COLORS: {
        CEILING: '#111122',
        FLOOR: '#222222',
        WALL_NS: '#666688',
        WALL_EW: '#8888aa',
        WALL_NS_DARK: '#44445e',
        WALL_EW_DARK: '#5e5e7e',
    },

    // Player
    PLAYER: {
        SPEED: 3.0,
        TURN_SPEED: 3.0,
        MAX_HEALTH: 100,
        RADIUS: 0.3,
    },

    // Monster types
    MONSTERS: {
        ZOMBIE:  { name: 'Zombie',  hp: 30,  speed: 1.0, damage: 10, color: '#448844', radius: 0.4, sightRange: 6, attackRange: 1.0 },
        GUARD:   { name: 'Guard',   hp: 50,  speed: 2.0, damage: 15, color: '#884444', radius: 0.4, sightRange: 8, attackRange: 6.0 },
        BRUTE:   { name: 'Brute',   hp: 100, speed: 1.5, damage: 25, color: '#886644', radius: 0.5, sightRange: 5, attackRange: 1.2 },
    },

    // Weapons
    WEAPONS: {
        PISTOL:  { name: 'Pistol',  clipSize: 12, damage: 15, fireRate: 0.5,  range: 10, reloadTime: 1.5, infiniteAmmo: true,  reserveAmmo: 999, spread: 0 },
        SHOTGUN: { name: 'Shotgun', clipSize: 6,  damage: 8,  fireRate: 1.0,  range: 5,  reloadTime: 2.5, infiniteAmmo: false, reserveAmmo: 24,  spread: 5, pellets: 5, spreadAngle: Math.PI/12 },
        SMG:     { name: 'SMG',     clipSize: 30, damage: 10, fireRate: 0.167, range: 8, reloadTime: 2.0, infiniteAmmo: false, reserveAmmo: 60,  spread: 0.05 },
    },

    // Minimap
    MINIMAP_SIZE: 120,
    MINIMAP_SCALE: 4,

    // Memory
    MEMORY_SIZE: 20,

    // AI
    AI_DECISION_INTERVAL: 0.5,
};
