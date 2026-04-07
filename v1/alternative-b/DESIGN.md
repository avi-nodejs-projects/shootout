# Alternative B: "Neon Maze" — Detailed Design

## Architecture Overview

```
index.html          — Entry point, canvas element, HUD overlay
styles.css          — Neon-themed styling, HUD, minimap panel
js/
  main.js           — Game loop, initialization, state management
  config.js         — Constants (colors, neon palette, speeds, sizes)
  raycaster.js      — Raycasting engine with neon glow effects
  map.js            — BSP maze generation, room/corridor layout
  player.js         — Player state, movement, shooting, health, inventory
  player-ai.js      — A* pathfinding, tactical AI (cover, retreat, prioritize)
  monsters.js       — Monster spawning, types, state
  monster-ai.js     — 3-state AI (idle/alert/attack), type-specific behaviors
  weapons.js        — Weapon definitions, ammo, reload, visual effects
  pickups.js        — Ammo, health, weapon, bonus pickups
  obstacles.js      — Crates, pillars, barrels — cover objects
  hud.js            — Health bar, ammo, minimap, messages, neon styling
  minimap.js        — Top-down fog-of-war minimap with room graph
  memory.js         — Room graph with decay (last ~8 rooms detailed)
  audio.js          — Synthwave music generator, SFX engine
  input.js          — Keyboard handler for manual override
  sprites.js        — Billboard sprite renderer (monsters, pickups, obstacles)
  particles.js      — Neon particle effects (muzzle flash, hits, pickups)
  lighting.js       — Per-column color tinting, wall glow effects
```

## Visual Design — Neon Synthwave Aesthetic

### Color Palette
```
Background:     #0a0a1a (deep dark blue-black)
Wall Primary:   #ff00ff (magenta neon)
Wall Secondary: #00ffff (cyan neon)
Wall Accent:    #ff6600 (orange neon)
Floor Grid:     #1a0033 base, #330066 grid lines
Ceiling:        #0a001a (near black with subtle purple)
Player HUD:     #00ff88 (green neon)
Health:         #ff0044 (red neon)
Ammo:           #ffff00 (yellow neon)
Pickup Glow:    #ffffff pulsing at 2Hz
Monster Eyes:   #ff0000 (red, glowing)
```

### Wall Rendering
- Raycasted walls rendered with solid neon colors
- Edge glow: 2px bright line at wall edges (where walls meet)
- Distance fog: walls fade toward background color with distance
- Wall direction determines color: N/S = magenta, E/W = cyan
- Hit walls flash white briefly

### Floor & Ceiling
- Floor: dark grid pattern (thin glowing lines every tile)
- Ceiling: solid dark, no rendering needed (saves performance)
- Grid lines pulse subtly to the music beat

### Particle Effects
- Muzzle flash: expanding circle of neon yellow, 3 frames
- Bullet impact: spray of 5-8 small neon sparks
- Monster death: explosion of colored particles matching monster color
- Pickup collect: ring of rising particles
- All particles are simple circles/squares — no textures

## Maze Generation — BSP (Binary Space Partitioning)

### Algorithm
```
1. Start with full rectangle (e.g., 60x60 tiles)
2. Recursively split:
   a. Choose split direction (alternate H/V, with randomness)
   b. Choose split position (40-60% of dimension)
   c. Recurse on both halves
   d. Stop when partition < minimum room size (6x6)
3. Place rooms:
   a. In each leaf partition, place a room (random size within partition)
   b. Room must be at least 4x4, leave 1-tile wall margin
4. Connect rooms:
   a. For each split, connect one room from left child to one from right child
   b. Corridor: L-shaped path between room centers
5. Place obstacles inside rooms (2-4 per room)
```

### Room Types
| Type | Size | Features | Spawn Rate |
|------|------|----------|------------|
| Empty | 4x4 - 6x6 | Nothing special | 30% |
| Armory | 5x5 - 7x7 | Weapon + ammo pickup | 10% |
| Infirmary | 4x4 - 6x6 | Health pickup | 15% |
| Monster Den | 6x6 - 8x8 | 3-5 monsters, good loot | 15% |
| Corridor Hub | 3x8+ | Long passage, ambush point | 20% |
| Boss Room | 8x8+ | Strong monster, best loot | 10% |

### Obstacles (Cover Objects)
| Object | Size | Blocks | Destructible |
|--------|------|--------|-------------|
| Crate | 1x1 | Movement + bullets | Yes (30 HP) |
| Pillar | 1x1 | Movement + bullets | No |
| Barrel | 1x1 | Movement only | Yes (explodes, 20 HP, 30 damage in 2-tile radius) |
| Low Wall | 2x1 | Movement + bullets | No |

## Player Character

### Stats
| Stat | Starting | Max | Regen |
|------|----------|-----|-------|
| Health | 100 | 150 | 0 (pickup only) |
| Shield | 0 | 50 | 1/sec when not taking damage |
| Speed | 3.5 u/s | 3.5 | — |
| Sprint | 5.0 u/s | 5.0 | Drains stamina |
| Stamina | 100 | 100 | 10/sec when not sprinting |

### Actions
- **Walk/Sprint**: WASD movement, shift to sprint
- **Turn**: Mouse or arrow keys
- **Shoot**: Fire current weapon (consumes ammo)
- **Reload**: Manual or auto when clip empty
- **Take Cover**: Crouch behind obstacle (reduces hitbox, slows movement)
- **Switch Weapon**: Number keys or scroll
- **Interact**: Pick up items when close

### Auto-AI — Tactical A* System
```
Decision tree (evaluated every 0.5s):

1. CRITICAL HEALTH (HP < 25%):
   → If health pickup in memory: A* pathfind to it
   → Else: find nearest cover, hide, wait for shield regen

2. LOW AMMO (current weapon clip < 25%):
   → Reload if safe (no monster within 4 tiles)
   → If total ammo low: pathfind to known ammo pickup

3. COMBAT (monster detected):
   → If monster within 3 tiles AND behind cover available:
     → Move to cover, peek and shoot
   → If monster within weapon range:
     → Face monster, shoot
     → Strafe to dodge (if monster is ranged)
   → If monster too close (melee range) AND player has ranged weapon:
     → Back away while shooting

4. EXPLORE (no threats):
   → A* to nearest unexplored room (via room graph)
   → Prefer rooms adjacent to current room
   → Mark corridors as explored while traversing
   → Collect pickups along the path

5. TACTICAL BONUSES:
   → Before entering a room: pause at door, "peek" (check for monsters)
   → When hearing monster sounds: slow approach, weapon ready
   → Prioritize armory rooms if current weapon is weak
```

### Cover System
- Player can position behind any obstacle
- "In cover" state: 50% damage reduction, accuracy penalty for shooting
- Peek: briefly expose to shoot, then return to cover
- AI evaluates cover quality: prefers cover facing the threat direction

## Monsters

### Types
| Type | HP | Speed | Damage | Range | Color | Behavior |
|------|-----|-------|--------|-------|-------|----------|
| Drone | 20 | 3.0 | 8 | Melee | Cyan | Rushes straight at player |
| Sentinel | 40 | 1.5 | 12 | 8 tiles | Magenta | Ranged, stays at distance |
| Lurker | 35 | 2.5 | 20 | Melee | Dark purple | Hides behind corners, ambush |
| Heavy | 80 | 1.0 | 30 | 4 tiles | Orange | Slow tank, area damage |
| Swarm | 10 | 4.0 | 5 | Melee | Green | Spawns in groups of 4-6 |

### 3-State AI
```
State: IDLE
  - Wander within assigned room
  - Face random directions
  - Transition → ALERT: hear gunshot (8-tile radius) OR see player (6 tiles, 90° FOV)

State: ALERT
  - Turn toward sound/sight direction
  - Move cautiously toward last known player position
  - Play alert sound (growl, beep, etc.)
  - Transition → ATTACK: confirm player in line-of-sight
  - Transition → IDLE: no contact for 8 seconds

State: ATTACK
  - Type-specific behavior:
    - Drone: direct charge, melee when close
    - Sentinel: maintain 5-6 tile distance, shoot
    - Lurker: circle around to flank, attack from side/behind
    - Heavy: slow advance, fire spread attack every 3 seconds
    - Swarm: all rush from different angles
  - Transition → ALERT: lose line-of-sight for 3 seconds
  - Transition → FLEE: health < 20% (Sentinel and Lurker only)
```

### Monster Spawning
- Each room has a "danger level" based on distance from player start
- Monsters spawn when player enters a room for the first time
- Spawn count: `1 + floor(dangerLevel / 2)` monsters
- Type distribution weighted by danger level

## Weapons

| Weapon | Clip | Reserve | Damage | Rate | Range | Reload | Special |
|--------|------|---------|--------|------|-------|--------|---------|
| Pistol | 15 | ∞ | 12 | 3/s | 12 tiles | 1.2s | Infinite reserve ammo |
| Shotgun | 8 | 32 | 45 | 1.2/s | 5 tiles | 2.0s | 7-ray cone, 20° spread |
| Plasma Rifle | 40 | 120 | 18 | 5/s | 10 tiles | 1.8s | Projectile with travel time, glow trail |

### Visual Effects (Neon Style)
- **Pistol**: Small cyan muzzle flash, thin bullet trail line
- **Shotgun**: Wide magenta flash, multiple spread lines
- **Plasma Rifle**: Glowing green orb projectile with trail, splash on impact

### Weapon Pickups
- Float 0.5 tiles above ground, rotate slowly
- Neon glow aura pulsing
- Auto-collected when player walks within 1.5 tiles

## Memory System — Room Graph

### Data Structure
```javascript
roomGraph = {
  rooms: Map<roomId, {
    id: number,
    x: number, y: number,         // center position
    width: number, height: number,
    connections: [roomId, ...],    // adjacent rooms
    visited: boolean,
    visitTimestamp: number,
    remembered: boolean,           // true if in active memory
    details: {                     // only stored for remembered rooms
      monstersKilled: number,
      itemsFound: string[],
      dangerLevel: number,
      hasUnpickedItems: boolean
    }
  }),
  
  activeMemory: roomId[],          // last 8 rooms (detailed memory)
  visitedSet: Set<roomId>,         // all-time visited (fog-of-war only)
  
  enterRoom(roomId) {
    // Add to activeMemory
    // If activeMemory > 8, evict oldest
    // Evicted room loses details but stays in visitedSet
    // Show HUD message if room was in visitedSet but not activeMemory
  }
}
```

### Minimap Rendering
- Explored rooms: shown as outlines on minimap
- Active memory rooms (last 8): filled with dim color, show connections
- Current room: bright highlight
- Unexplored rooms: hidden (fog of war)
- Forgotten rooms (visited but evicted): shown as faded outlines only
- Player position: glowing dot
- Known monster positions: red dots (only in active memory rooms)

### Player Feedback Messages
- Entering new room: "New area discovered"
- Entering remembered room: "You remember this place" + restored details
- Entering forgotten room: "This seems familiar..." (no details restored)
- Finding a shortcut: "A connection to [Room Type]!"

## HUD Layout — Neon Style

```
┌──────────────────────────────────────────────────┐
│                               ┌────────────┐     │
│                               │  MINIMAP   │     │
│                               │  (fog of   │     │
│                               │   war)     │     │
│      FIRST-PERSON VIEWPORT    │  150x150   │     │
│      (Raycasted Neon 3D)      └────────────┘     │
│                                                  │
│   ┌─MESSAGE─────────────────────────────────┐    │
│   │ "New area discovered"                   │    │
│   └─────────────────────────────────────────┘    │
│                                                  │
│  ┌SHIELD──┐  ┌HEALTH──┐  [SHOTGUN]  8/32       │
│  │████░░░░│  │████████│                          │
│  └────────┘  └────────┘  Kills: 12  Rooms: 5/20 │
└──────────────────────────────────────────────────┘
```

- All HUD elements use neon glow CSS (text-shadow with color)
- Health bar: green → yellow → red gradient
- Shield bar: cyan with pulse when regenerating
- Weapon name pulses when low ammo
- Kill/room counters for score tracking

## Audio Design — Synthwave

### Background Music (Procedural Web Audio API)
```
BPM: 110
Key: A minor

Layers:
1. Sub Bass:    Sine wave, root note, whole notes
2. Bass Line:   Sawtooth, filtered, 8th note pattern (A-C-D-E arpeggios)
3. Pad:         Detuned saw x2, slow filter sweep, sustained chords
4. Lead:        Square wave, delay effect, pentatonic melody (8-bar loop)
5. Hi-hat:      Filtered noise, 16th notes, velocity variation
6. Kick:        Sine wave pitch sweep (200Hz→40Hz), 4-on-floor
7. Snare:       Noise burst + sine, beats 2 and 4
8. Clap:        Short noise, beat 4 (every other bar)

Dynamic mixing:
- Idle: layers 1-3 only (ambient)
- Exploring: layers 1-5 (rhythmic)
- Combat: all layers (full energy)
- Low health: add filter wobble to all layers
```

### Sound Effects
| Event | Design |
|-------|--------|
| Pistol shot | Short square wave burst, high freq → low freq sweep |
| Shotgun blast | Noise burst through low-pass filter, heavy reverb |
| Plasma shot | Ascending sine sweep + noise, delayed echo |
| Reload | 3-click sequence: metallic sine pings at 800, 1200, 600 Hz |
| Monster alert | Low growl: filtered sawtooth, slow LFO modulation |
| Monster hurt | Noise burst, pitch-shifted down |
| Monster death | Descending sawtooth sweep + noise explosion |
| Player hurt | Distorted noise thump, screen flash red |
| Player death | Long descending tone, all music fades out |
| Pickup collect | 3-note ascending arpeggio (C-E-G), clean sine |
| Door open | Low-frequency sweep up |
| Footsteps | Soft filtered noise clicks, tempo-synced to movement |
| Ambient (idle) | Subtle low-frequency hum, random distant echoes |

## Game Flow

1. **Init**: Generate BSP maze, place rooms, corridors, obstacles
2. **Spawn**: Player in starting room with pistol, full health
3. **Explore**: Auto-AI navigates room-to-room via A*
4. **Combat**: Engage monsters in rooms, use cover
5. **Collect**: Gather weapons, ammo, health as found
6. **Progress**: Deeper rooms have harder monsters, better loot
7. **Victory**: Clear all rooms OR reach the exit room
8. **Death**: Health reaches 0 → game over screen with stats
9. **Score**: `(monstersKilled * 100) + (roomsExplored * 50) + (timeBonus)`

## Controls (Manual Override)

| Key | Action |
|-----|--------|
| W/↑ | Move forward |
| S/↓ | Move backward |
| A | Strafe left |
| D | Strafe right |
| ←/→ | Turn left/right |
| Space | Shoot |
| R | Reload |
| 1-3 | Switch weapon |
| C | Toggle cover (when near obstacle) |
| Tab | Toggle minimap size |
| P | Pause |
| T | Toggle AI autopilot on/off |
