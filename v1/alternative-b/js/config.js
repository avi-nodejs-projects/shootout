const CONFIG = {
    SCREEN_W: 640,
    SCREEN_H: 400,

    MAP_SIZE: 48,
    TILE: { WALL: 1, FLOOR: 0, OBSTACLE: 2 },

    // BSP generation
    BSP_MIN_SIZE: 6,
    BSP_MAX_DEPTH: 5,
    MIN_ROOM_SIZE: 4,
    CORRIDOR_WIDTH: 1,

    FOV: Math.PI / 3,
    MAX_DEPTH: 20,

    // Neon color palette
    COLORS: {
        BG: '#0a0a1a',
        CEILING: '#0a001a',
        FLOOR: '#1a0033',
        FLOOR_GRID: '#330066',
        WALL_NS: '#ff00ff',
        WALL_EW: '#00ffff',
        WALL_ACCENT: '#ff6600',
        WALL_EDGE: '#ffffff',
        OBSTACLE: '#ff660088',
    },

    PLAYER: {
        SPEED: 3.5,
        SPRINT_SPEED: 5.0,
        TURN_SPEED: 3.0,
        MAX_HEALTH: 100,
        MAX_SHIELD: 50,
        SHIELD_REGEN: 1,
        SHIELD_REGEN_DELAY: 3,
        MAX_STAMINA: 100,
        STAMINA_DRAIN: 20,
        STAMINA_REGEN: 10,
        RADIUS: 0.3,
    },

    MONSTERS: {
        DRONE:    { name: 'Drone',    hp: 20,  speed: 3.0, damage: 8,  color: '#00ffff', radius: 0.35, sightRange: 6,  attackRange: 1.0, ranged: false },
        SENTINEL: { name: 'Sentinel', hp: 40,  speed: 1.5, damage: 12, color: '#ff00ff', radius: 0.4,  sightRange: 10, attackRange: 8.0, ranged: true },
        LURKER:   { name: 'Lurker',   hp: 35,  speed: 2.5, damage: 20, color: '#330066', radius: 0.35, sightRange: 5,  attackRange: 1.0, ranged: false },
        HEAVY:    { name: 'Heavy',    hp: 80,  speed: 1.0, damage: 30, color: '#ff6600', radius: 0.5,  sightRange: 7,  attackRange: 4.0, ranged: true },
        SWARM:    { name: 'Swarm',    hp: 10,  speed: 4.0, damage: 5,  color: '#00ff44', radius: 0.25, sightRange: 6,  attackRange: 0.8, ranged: false },
    },

    WEAPONS: {
        PISTOL:  { name: 'Pistol',       clipSize: 15, damage: 12, fireRate: 0.33, range: 12, reloadTime: 1.2, infiniteAmmo: true,  reserveAmmo: 999, spread: 0.02, color: '#00ffff' },
        SHOTGUN: { name: 'Shotgun',      clipSize: 8,  damage: 7,  fireRate: 0.83, range: 5,  reloadTime: 2.0, infiniteAmmo: false, reserveAmmo: 32,  spread: 0, pellets: 7, spreadAngle: Math.PI/9, color: '#ff00ff' },
        PLASMA:  { name: 'Plasma Rifle', clipSize: 40, damage: 18, fireRate: 0.2,  range: 10, reloadTime: 1.8, infiniteAmmo: false, reserveAmmo: 120, spread: 0.01, color: '#00ff44', projectile: true },
    },

    MINIMAP_SIZE: 150,
    MEMORY_SIZE: 8,
    AI_DECISION_INTERVAL: 0.5,
};
