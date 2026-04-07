# Alternative A: "Classic Dungeon Crawler" — Detailed Design

## Architecture Overview

```
index.html          — Entry point, canvas element, HUD overlay
styles.css          — Minimal styling for HUD and canvas
js/
  main.js           — Game loop, initialization
  config.js         — Constants (screen size, tile size, colors, speeds)
  raycaster.js      — Raycasting engine (wall rendering, DDA algorithm)
  map.js            — Maze generation (recursive backtracker), tile grid
  player.js         — Player state, movement, shooting, health, inventory
  player-ai.js      — Auto-pilot AI (wall-following, room exploration)
  monsters.js       — Monster spawning, state, types
  monster-ai.js     — Monster behavior (patrol, chase, attack)
  weapons.js        — Weapon definitions, ammo, reload mechanics
  pickups.js        — Ammo, health, weapon pickups
  hud.js            — Health bar, ammo counter, minimap, messages
  memory.js         — Circular buffer tracking visited cells
  audio.js          — Web Audio API: synthwave music generator, SFX
  input.js          — Keyboard input handler (manual override mode)
  sprites.js        — 2D sprite rendering in 3D space (monsters, pickups)
```

## Rendering Engine

### Raycasting (Wolfenstein 3D style)
- Cast one ray per screen column (e.g., 640 rays for 640px width)
- Use DDA (Digital Differential Analyzer) algorithm for wall detection
- Wall height = `constant / perpendicular_distance` to avoid fisheye
- Walls colored by direction: N/S = darker shade, E/W = lighter shade
- Floor and ceiling: solid colors (dark gray floor, dark blue ceiling)
- No textures — solid colors with shading by distance for fog effect

### Sprite Rendering
- Monsters and pickups rendered as 2D billboard sprites
- Sort by distance (painter's algorithm — far to near)
- Scale sprite size by distance, clip against wall column depth buffer

### Performance Target
- 60 FPS on modern browsers
- Canvas resolution: 640x480 (scaled up via CSS for retro feel)

## Maze Generation

### Algorithm: Recursive Backtracker
```
1. Start with grid of walls
2. Pick random starting cell, mark as passage
3. While stack not empty:
   a. Look at current cell's unvisited neighbors
   b. If neighbors exist: pick random one, remove wall between, push current, move to neighbor
   c. If no neighbors: pop stack (backtrack)
```

### Grid Structure
- Tile types: WALL, FLOOR, DOOR, SPAWN_PLAYER, SPAWN_MONSTER, PICKUP
- Grid size: 31x31 (odd numbers ensure walls on borders)
- Rooms: 3x3 to 5x5 open areas placed before maze generation
- Corridors: 1-tile-wide paths connecting rooms

### Room Placement
1. Attempt to place 5-8 rooms randomly
2. Run recursive backtracker on remaining cells
3. Ensure all rooms are connected
4. Place player spawn in first room
5. Place monster spawns and pickups in remaining rooms

## Player Character

### Stats
| Stat | Starting Value | Max |
|------|---------------|-----|
| Health | 100 | 100 |
| Armor | 0 | 100 |
| Speed | 3.0 units/sec | 3.0 |
| Turn Speed | 3.0 rad/sec | 3.0 |

### Actions
- **Walk**: Forward, backward, strafe left/right
- **Turn**: Rotate left/right
- **Shoot**: Fire current weapon (if ammo > 0)
- **Reload**: Reload current weapon (auto-reload when clip empty)
- **Switch Weapon**: Cycle through collected weapons
- **Hide**: Stop near a wall (reduces monster detection range by 50%)

### Auto-AI (Player Autopilot)
```
Priority system (evaluated each tick):
1. CRITICAL: Health < 20% → seek nearest health pickup (if known)
2. COMBAT: Monster in line of sight → face and shoot
3. RELOAD: Clip empty → reload
4. EXPLORE: Follow right-hand wall rule
   - Prefer unvisited cells (check memory buffer)
   - Random turn at intersections (30% chance to break pattern)
5. COLLECT: Walk over pickups automatically
```

### Wall-Following Algorithm
- Keep right hand on wall
- At intersection: prefer right turn > straight > left turn > U-turn
- Random exploration breaks every 10-15 seconds to avoid loops

## Monsters

### Types
| Type | Health | Speed | Damage | Behavior |
|------|--------|-------|--------|----------|
| Zombie | 30 | 1.0 | 10 | Slow melee, wanders aimlessly |
| Guard | 50 | 2.0 | 15 | Patrols, ranged attack |
| Brute | 100 | 1.5 | 25 | Charges player, melee |

### AI State Machine
```
IDLE → (hears shot within 8 tiles OR sees player within 6 tiles) → ALERT
ALERT → (confirms player position via line-of-sight) → CHASE
CHASE → (within attack range) → ATTACK
CHASE → (lost player for 5 seconds) → SEARCH
SEARCH → (can't find player for 10 seconds) → IDLE
ATTACK → (player out of range) → CHASE
Any state → (health < 30%) → FLEE (seek distance from player)
```

### Line-of-Sight Check
- Cast ray from monster to player position
- If no wall tiles intersect → player is visible
- Check performed every 0.5 seconds (not every frame)

### Patrol Routes
- Monsters assigned a list of 3-5 waypoints within their room
- Walk between waypoints in order, then reverse
- Slight random deviation in path (±0.5 tiles)

## Weapons

| Weapon | Clip Size | Damage | Fire Rate | Range | Reload Time |
|--------|-----------|--------|-----------|-------|-------------|
| Pistol | 12 | 15 | 2/sec | 10 tiles | 1.5s |
| Shotgun | 6 | 40 (spread) | 1/sec | 5 tiles | 2.5s |
| SMG | 30 | 10 | 6/sec | 8 tiles | 2.0s |

### Shotgun Spread
- Fire 5 rays in a 15° cone
- Each ray does 8 damage
- Damage falls off with distance

### Pickup Locations
- Pistol: starting weapon (always available)
- Shotgun: found in room 3-4 (mid-maze)
- SMG: found in room 6-7 (deep maze)
- Ammo boxes: scattered in corridors (restore 50% of weapon's clip)

## Memory System

### Circular Buffer (20 cells)
```javascript
// Structure
memory = {
  buffer: [{x, y, timestamp, type}],  // last 20 visited cells
  maxSize: 20,
  
  visit(x, y, type) {
    // Remove oldest if full
    // Add new entry with current timestamp
  },
  
  wasVisited(x, y) {
    // Returns true if cell is in buffer
  },
  
  getTrail() {
    // Returns array of positions for minimap rendering
  }
}
```

### Player Feedback
- Entering a remembered cell: "You've been here before..." (HUD message)
- Entering a forgotten cell that was previously visited: no message (forgotten)
- Trail dots on minimap fade from bright to dim based on recency

## HUD Layout

```
┌──────────────────────────────────────────────┐
│  [Minimap 120x120]                    MSG    │
│                                              │
│                                              │
│              GAME VIEWPORT                   │
│              (Raycasted 3D)                  │
│                                              │
│                                              │
│  ♥ 100/100   [Pistol]   12/36   Floor: 1    │
└──────────────────────────────────────────────┘
```

- Top-left: Minimap showing explored area + memory trail
- Top-right: Messages ("You've been here before", "Picked up Shotgun")
- Bottom: Health, current weapon, ammo (clip/reserve), floor number

## Audio Design

### Synthwave Background Music (Procedural)
- Generated with Web Audio API oscillators
- Base: sawtooth wave bass line (4-bar loop, 120 BPM)
- Lead: square wave melody (8-bar loop, pentatonic scale)
- Drums: noise-based kick/snare/hi-hat pattern
- Tempo increases when monsters are nearby

### Sound Effects
| Event | Sound |
|-------|-------|
| Pistol fire | Short noise burst, high-pass filtered |
| Shotgun fire | Longer noise burst, low-pass filtered |
| SMG fire | Rapid short clicks |
| Reload | Metallic click sequence |
| Monster hurt | Low-pitched noise burst |
| Monster death | Descending tone |
| Player hurt | Distorted thump + screen flash red |
| Pickup collect | Rising arpeggio (3 notes) |
| Footsteps | Soft rhythmic taps (tempo matches speed) |

## Game Flow

1. **Start**: Generate maze, place player in room 1
2. **Play**: Auto-AI navigates maze, fights monsters, collects items
3. **Progress**: Player clears rooms, finds better weapons
4. **End**: Player reaches the maze exit (special room at far end) OR dies
5. **Score**: Rooms explored, monsters killed, time survived
