const CONFIG = {
    SCREEN_W: 800,
    SCREEN_H: 500,
    FOV: Math.PI / 3,
    MAX_DEPTH: 20,
    TILE: { WALL: 1, FLOOR: 0, ELEVATOR: 3, DOOR_LOCKED: 4, DOOR_OPEN: 5 },
    AI_DECISION_INTERVAL: 0.2,

    PLAYER: {
        SPEED: 3.0, TURN_SPEED: 3.0, MAX_HEALTH: 100, RADIUS: 0.3,
    },

    FLOORS: [
        {
            name: 'THE ENTRANCE', mapSize: 25, rooms: 8,
            wallColor: '#4a4a5e', fogColor: '#1a1a2e', lightColor: '#ffcc44', accentColor: '#44ff44',
            monsterTypes: ['SHAMBLER', 'RAT'], bossType: 'GUARDIAN',
            weaponReward: 'SHOTGUN', bpm: 100,
            atmosphere: ['The air is damp and cold...', 'Footsteps echo in the distance...', 'A torch flickers and dies...'],
        },
        {
            name: 'THE CRYPTS', mapSize: 29, rooms: 10,
            wallColor: '#3e3e3e', fogColor: '#1a0a0a', lightColor: '#ff4444', accentColor: '#ff8800',
            monsterTypes: ['GHOUL', 'SPECTER'], bossType: 'WARDEN',
            weaponReward: 'RIFLE', bpm: 110,
            atmosphere: ['Something scratches behind the walls...', 'The smell of decay is overwhelming...', 'You hear a low moan from ahead...'],
        },
        {
            name: 'THE ABYSS', mapSize: 33, rooms: 12,
            wallColor: '#2a1a3e', fogColor: '#0a0a1e', lightColor: '#8844ff', accentColor: '#00ffff',
            monsterTypes: ['DEMON', 'SHADOW'], bossType: 'OVERLORD',
            weaponReward: 'ROCKET', bpm: 120,
            atmosphere: ['Reality feels thin here...', 'The walls seem to breathe...', 'Whispers in a language you don\'t know...'],
        },
        {
            name: 'THE CORE', mapSize: 35, rooms: 14,
            wallColor: '#1a1a1a', fogColor: '#0a0000', lightColor: '#ff0044', accentColor: '#ffff00',
            monsterTypes: ['DEMON', 'SHADOW', 'GHOUL'], bossType: 'OVERLORD',
            weaponReward: null, bpm: 130,
            atmosphere: ['This place should not exist...', 'Your shadow moves independently...', 'The floor pulses like a heartbeat...'],
        },
    ],

    MONSTERS: {
        SHAMBLER:  { name: 'Shambler',  hp: 25,  speed: 1.0, damage: 8,  color: '#556644', sightRange: 6, attackRange: 1.0, ranged: false },
        RAT:       { name: 'Rat Swarm', hp: 10,  speed: 3.5, damage: 3,  color: '#665544', sightRange: 5, attackRange: 0.8, ranged: false },
        GHOUL:     { name: 'Ghoul',     hp: 40,  speed: 2.5, damage: 12, color: '#556666', sightRange: 7, attackRange: 1.0, ranged: false },
        SPECTER:   { name: 'Specter',   hp: 30,  speed: 2.0, damage: 15, color: '#8888aa', sightRange: 9, attackRange: 7.0, ranged: true },
        DEMON:     { name: 'Demon',     hp: 60,  speed: 2.0, damage: 18, color: '#aa4444', sightRange: 8, attackRange: 8.0, ranged: true },
        SHADOW:    { name: 'Shadow',    hp: 45,  speed: 3.0, damage: 22, color: '#332244', sightRange: 4, attackRange: 1.0, ranged: false },
        GUARDIAN:  { name: 'Guardian',  hp: 200, speed: 1.5, damage: 20, color: '#888844', sightRange: 10, attackRange: 1.5, ranged: false, boss: true },
        WARDEN:    { name: 'Warden',    hp: 350, speed: 1.2, damage: 25, color: '#664444', sightRange: 10, attackRange: 6.0, ranged: true, boss: true },
        OVERLORD:  { name: 'Overlord',  hp: 500, speed: 1.0, damage: 35, color: '#440044', sightRange: 12, attackRange: 8.0, ranged: true, boss: true },
    },

    WEAPONS: {
        PISTOL:  { name: 'Pistol',  clipSize: 12, damage: 12, fireRate: 0.4,  range: 10, reloadTime: 1.2, infiniteAmmo: true,  reserveAmmo: 999, spread: 0.02 },
        SHOTGUN: { name: 'Shotgun', clipSize: 6,  damage: 8,  fireRate: 1.0,  range: 5,  reloadTime: 2.5, infiniteAmmo: false, reserveAmmo: 24,  pellets: 5, spreadAngle: Math.PI / 12 },
        RIFLE:   { name: 'Rifle',   clipSize: 20, damage: 20, fireRate: 0.25, range: 15, reloadTime: 1.8, infiniteAmmo: false, reserveAmmo: 80,  spread: 0.01 },
        ROCKET:  { name: 'Rocket',  clipSize: 4,  damage: 80, fireRate: 2.0,  range: 12, reloadTime: 3.0, infiniteAmmo: false, reserveAmmo: 12,  spread: 0, aoe: 3, selfDamage: true },
    },

    MEMORY_SIZE: 12,
};
