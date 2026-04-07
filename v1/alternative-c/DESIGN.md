# Alternative C: "The Depths" — Detailed Design

## Architecture Overview

```
index.html          — Entry point, canvas, HUD overlay
styles.css          — Dark atmospheric styling, HUD
js/
  main.js           — Game loop, initialization, floor management
  config.js         — Constants (per-floor configs, colors, speeds)
  raycaster.js      — Raycasting engine with fog, dynamic lighting
  map.js            — Per-floor maze generation (recursive backtracker + rooms)
  floor-manager.js  — Floor progression, difficulty scaling, elevator logic
  player.js         — Player state, movement, shooting, health, inventory
  player-ai.js      — Methodical exploration AI with retreat/heal logic
  monsters.js       — Monster spawning, floor-scaled types
  monster-ai.js     — Monster behaviors, boss AI
  boss.js           — Boss monster definitions and special attacks
  weapons.js        — Weapon definitions (one new per floor)
  pickups.js        — Ammo, health, weapon, key pickups
  hud.js            — Health, ammo, floor indicator, journal, messages
  memory.js         — Per-floor journal system (last ~12 rooms)
  audio.js          — Synthwave music with per-floor mood, SFX
  input.js          — Keyboard handler
  sprites.js        — Billboard sprite renderer
  lighting.js       — Colored zone lighting, flickering, fog
  atmosphere.js     — Screen effects (fog, flash, shake, vignette)
```

## Visual Design — Atmospheric Low-Fi

### Per-Floor Color Schemes
```
Floor 1 — "The Entrance"
  Walls:    #4a4a5e (gray-blue stone)
  Fog:      #1a1a2e (dark blue)
  Lighting: #ffcc44 (warm torchlight)
  Accent:   #44ff44 (green safe zones)

Floor 2 — "The Crypts"
  Walls:    #3e3e3e (dark gray)
  Fog:      #1a0a0a (dark red tint)
  Lighting: #ff4444 (red danger lighting)
  Accent:   #ff8800 (orange warning)

Floor 3 — "The Abyss"
  Walls:    #2a1a3e (dark purple)
  Fog:      #0a0a1e (deep blue-black)
  Lighting: #8844ff (purple eerie glow)
  Accent:   #00ffff (cyan highlights)

Floor 4+ — "The Core"
  Walls:    #1a1a1a (near black)
  Fog:      #0a0000 (blood red fog)
  Lighting: #ff0044 (red pulsing)
  Accent:   #ffff00 (yellow emergency)
```

### Atmospheric Effects
- **Distance Fog**: Walls fade into fog color based on distance. Fog density increases per floor.
- **Flickering Lights**: Random light zones flicker (sine wave + noise modulation). Some corridors go completely dark briefly.
- **Colored Lighting Zones**: Rooms tinted by type:
  - Green = safe room (health, save point)
  - Red = danger room (monsters guaranteed)
  - Blue = ammo cache
  - Purple = boss room
  - Yellow = elevator room
- **Screen Vignette**: Dark edges, increases when health is low.
- **Screen Shake**: On explosions, boss attacks, player hurt.
- **Flash**: White flash on weapon fire, red flash on damage taken.

### Wall Rendering
- Solid-colored walls with fog distance shading
- Wall brightness modulated by nearby light sources
- N/S walls slightly darker than E/W walls
- "Breadcrumb" marks on visited walls: subtle scratches (lighter color patches)

## Maze Generation — Per-Floor Procedural

### Algorithm: Enhanced Recursive Backtracker
```
Per floor:
1. Grid size scales with floor: 25x25 (floor 1) → 35x35 (floor 4+)
2. Place special rooms first:
   - 1 elevator room (connects to next floor) at far end from entrance
   - 1 boss room (guards elevator)
   - 2-3 safe rooms (health stations)
   - 1-2 ammo caches
   - 1 armory (new weapon on appropriate floors)
3. Run recursive backtracker to fill remaining space
4. Add dead ends (15% of corridors lead nowhere — tension builders)
5. Place key doors: boss room requires a key found elsewhere on floor
```

### Room Types per Floor
| Room Type | Floor 1 | Floor 2 | Floor 3 | Floor 4+ |
|-----------|---------|---------|---------|----------|
| Safe Room | 3 | 2 | 1 | 1 |
| Ammo Cache | 2 | 2 | 3 | 3 |
| Monster Room | 3 | 5 | 6 | 8 |
| Boss Room | 1 | 1 | 1 | 1 |
| Elevator | 1 | 1 | 1 | — (final) |
| Armory | 1 | 1 | 1 | 0 |

### Key & Lock System
- Each floor has 1 key hidden in a side room
- Boss room door requires the key
- Key location is randomized, always reachable without the key
- HUD indicator shows if key is found

## Player Character

### Stats (Scale with Pickups)
| Stat | Starting | Max | Notes |
|------|----------|-----|-------|
| Health | 100 | 200 | Increases via permanent upgrades |
| Speed | 3.0 u/s | 3.0 | Constant |
| Damage Resist | 0% | 30% | Armor pickups, lost on floor change |

### Actions
- **Walk**: Forward, backward, strafe
- **Turn**: Rotate left/right
- **Shoot**: Fire current weapon
- **Reload**: Reload current weapon
- **Switch Weapon**: Cycle collected weapons
- **Use Key**: Automatically used when at locked door
- **Descend**: Step into elevator to go to next floor

### Auto-AI — Methodical Explorer
```
Priority system (0.5s decision cycle):

1. FLEE (HP < 15%):
   → Pathfind to nearest safe room (if in memory)
   → If no safe room known: retreat from monster, hug walls
   → Enter safe room: heal at health station

2. HEAL (HP < 50% AND safe room nearby):
   → If current room is safe: stay and heal
   → If safe room within 3 rooms: pathfind to it

3. COMBAT:
   → If monster visible: face and shoot
   → If monster is boss: kite (maintain distance, shoot while moving backward)
   → If HP < 40% during combat: try to break line-of-sight, then re-engage

4. SEEK KEY (key not found AND unexplored rooms exist):
   → A* to nearest unexplored room
   → Methodical: prefer rooms in a sweep pattern (left-to-right, top-to-bottom)

5. SEEK BOSS (key found):
   → Pathfind to boss room (if remembered)
   → If boss room not found: continue exploring

6. EXPLORE (default):
   → Prefer unvisited corridors (check journal)
   → At forks: prefer unexplored direction
   → Mark dead ends to avoid revisiting

7. AMMO CHECK:
   → If total ammo < 20%: seek known ammo cache
   → If ammo cache not known: add urgency to exploration

8. WEAPON UPGRADE:
   → If on floor with armory and weapon not yet collected: seek armory
```

## Monsters — Floor Scaling

### Floor 1: "The Entrance"
| Type | HP | Speed | Damage | Behavior |
|------|-----|-------|--------|----------|
| Shambler | 25 | 1.0 | 8 | Slow walk toward player, melee |
| Rat Swarm | 10 | 3.5 | 3 | Small, fast, spawns in groups of 3 |
| **BOSS: Guardian** | 200 | 1.5 | 20 | Charges, slams ground (area damage) |

### Floor 2: "The Crypts"
| Type | HP | Speed | Damage | Behavior |
|------|-----|-------|--------|----------|
| Ghoul | 40 | 2.5 | 12 | Fast melee, zigzag approach |
| Specter | 30 | 2.0 | 15 | Ranged (projectile), phases through obstacles briefly |
| **BOSS: Warden** | 350 | 1.2 | 25 | Summons 2 ghouls, ranged+melee combo |

### Floor 3: "The Abyss"
| Type | HP | Speed | Damage | Behavior |
|------|-----|-------|--------|----------|
| Demon | 60 | 2.0 | 18 | Ranged fireball, strafes |
| Shadow | 45 | 3.0 | 22 | Invisible until close (4 tiles), fast melee |
| **BOSS: Overlord** | 500 | 1.0 | 35 | Teleports, multi-projectile attack, shield phase |

### Floor 4+: "The Core" (Repeating, scaling)
- Previous monster types with +25% HP and +15% damage per floor
- Boss: random boss type with scaling stats
- Endless mode — difficulty keeps increasing

### Monster AI State Machine
```
IDLE:
  - Wander within room boundaries
  - Face random directions, pause occasionally
  → Transition to ALERT: see player (LOS, floor-scaled range), hear gunshot

ALERT:
  - Move toward last known player position
  - Check LOS every 0.5s
  → ATTACK: confirm visual on player
  → IDLE: no contact for 10 seconds

ATTACK:
  - Type-specific behavior (see monster tables)
  - Melee types: pathfind to player, attack when adjacent
  - Ranged types: maintain optimal distance, shoot with cooldown
  - Boss types: phase-based attack patterns (see boss section)
  → ALERT: lose LOS for 5 seconds

FLEE (non-boss only, HP < 15%):
  - Move away from player
  - Try to break LOS
  - Will re-engage if cornered
```

### Boss AI — Phase System
```
Phase 1 (HP > 60%):
  - Basic attack pattern
  - Single attack type
  - Predictable movement

Phase 2 (HP 30-60%):
  - Enhanced attack pattern
  - Add secondary attack
  - More aggressive, faster

Phase 3 (HP < 30%):
  - Desperation mode
  - All attacks available
  - Fastest speed
  - May summon regular monsters
```

## Weapons — One Per Floor

| Weapon | Found | Clip | Reserve | Damage | Rate | Range | Reload | Special |
|--------|-------|------|---------|--------|------|-------|--------|---------|
| Pistol | Start | 12 | ∞ | 12 | 2.5/s | 10 | 1.2s | Infinite reserve |
| Shotgun | Floor 1 | 6 | 24 | 40 | 1/s | 5 | 2.5s | 5-ray spread |
| Rifle | Floor 2 | 20 | 80 | 20 | 4/s | 15 | 1.8s | Accurate, long range |
| Rocket Launcher | Floor 3 | 4 | 12 | 80 | 0.5/s | 12 | 3.0s | Area damage (3-tile radius), self-damage possible |

### Weapon Visual Effects
- Each weapon has a distinct muzzle flash color
- Rocket launcher: visible projectile with smoke trail
- All weapons: brief screen shake on fire (scales with weapon power)

## Memory System — Per-Floor Journal

### Data Structure
```javascript
journal = {
  currentFloor: 1,
  
  // Per-floor tracking
  floors: Map<floorNum, {
    rooms: Map<roomId, {
      type: string,           // 'safe', 'monster', 'ammo', 'boss', etc.
      visited: boolean,
      remembered: boolean,    // in active journal
      notes: string[],        // "3 monsters killed", "health station", etc.
      hasKey: boolean,
      hasWeapon: boolean,
      cleared: boolean        // all monsters dead
    }>,
    
    activeJournal: roomId[],  // last 12 rooms with full details
    totalVisited: number,     // for stats
    keyFound: boolean,
    bossDefeated: boolean
  }),
  
  // When entering new floor:
  newFloor(floorNum) {
    // Create empty floor data
    // Previous floor journal is archived (stats kept, details dropped)
    // Player "forgets" previous floor layout
  },
  
  enterRoom(roomId) {
    // Add to activeJournal
    // If > 12, evict oldest
    // Mark visited
    // Generate room description for HUD
  }
}
```

### Visual Breadcrumbs
- Visited corridors: wall scratch marks (lighter colored patches on walls)
- Direction arrows: subtle arrow marks pointing toward unexplored areas
- These are rendered in the raycaster as slight color variations
- Only visible on current floor — lost when descending

### Player Feedback
- New room: "Entering [Room Type]" with colored flash matching zone
- Remembered room: "Your marks are still on the walls"
- Forgotten room (re-entering after eviction): "Was I here before?"
- Finding key: "Key acquired — the boss room awaits"
- Near elevator: "The elevator hums... but the guardian blocks the way"

## HUD Layout — Atmospheric

```
┌──────────────────────────────────────────────────┐
│  FLOOR 2: THE CRYPTS              ┌─JOURNAL──┐  │
│                                   │ Key: ✗   │  │
│                                   │ Boss: ?  │  │
│                                   │ Rooms:   │  │
│      FIRST-PERSON VIEWPORT        │  7/15    │  │
│      (Raycasted + Fog + Lighting)  │ Cleared: │  │
│                                   │  4/7     │  │
│                                   └──────────┘  │
│                                                  │
│  ┌─MSG──────────────────────────────────────┐    │
│  │ "The walls drip with something dark..."  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ♥ 85/100  [Shotgun] 4/24   Floor 2   Score: 450│
└──────────────────────────────────────────────────┘
```

- Top-left: current floor name (atmospheric title)
- Right panel: journal summary (key status, boss status, exploration progress)
- Center: FPS viewport (largest area)
- Message bar: atmospheric text + gameplay messages
- Bottom: health, weapon, ammo, floor, score

### Atmospheric Messages (Random, per floor)
```
Floor 1: "The air is damp and cold..."
         "Footsteps echo in the distance..."
         "A torch flickers and dies..."

Floor 2: "Something scratches behind the walls..."
         "The smell of decay is overwhelming..."
         "You hear a low moan from ahead..."

Floor 3: "Reality feels thin here..."
         "The walls seem to breathe..."
         "Whispers in a language you don't know..."

Floor 4+: "This place should not exist..."
          "Your shadow moves independently..."
          "The floor pulses like a heartbeat..."
```

## Audio Design — Floor-Adaptive Synthwave

### Music System
```
Base BPM: 100 (Floor 1) → 120 (Floor 4+)

Floor 1 — Mysterious/Cautious:
  - Slow pad chords (minor key)
  - Minimal drums (just kick on 1 and 3)
  - Subtle bass, lots of reverb
  - Occasional metallic ping (like dripping water)

Floor 2 — Tense/Aggressive:
  - Add arpeggiated bass line
  - Full drum pattern (kick, snare, hi-hat)
  - Distorted lead appears in combat
  - Heartbeat-like sub bass when HP low

Floor 3 — Chaotic/Intense:
  - Fast arpeggios, multiple oscillators
  - Double-time hi-hats
  - Detuned leads for unease
  - Noise sweeps during boss fights

Floor 4+ — Relentless:
  - All layers active
  - Tempo increases
  - More noise, more distortion
  - Music never fully rests
```

### Dynamic Music Layers
```
Idle (no monsters nearby):
  → Ambient pad + subtle bass only
  → Random atmospheric SFX

Exploring (moving, no danger):
  → Add drums (half-time feel)
  → Bass line active

Alert (monster heard/nearby):
  → Full drums
  → Faster bass line
  → Tension stinger (ascending tone)

Combat:
  → All layers
  → Lead melody/riff
  → Extra percussion

Boss Fight:
  → Maximum intensity
  → Unique boss motif per floor
  → Tempo +10%

Low Health:
  → All layers get low-pass filtered
  → Heartbeat kick replaces normal kick
  → Sirene-like high tone
```

### Sound Effects
| Event | Design |
|-------|--------|
| Pistol | Sharp click, short reverb |
| Shotgun | Heavy boom, long reverb tail |
| Rifle | Rapid metallic snaps |
| Rocket | Whoosh + distant explosion, screen shake |
| Monster growl | Per-type: filtered noise/saw at different pitches |
| Monster death | Pitch-shifted scream + body thud |
| Boss roar | Deep layered noise + sub bass hit |
| Player hurt | Distorted crunch + heartbeat |
| Player death | Slow descending tone, all audio fades to silence |
| Key pickup | Unique chime (recognizable across floors) |
| Elevator activate | Deep mechanical hum, rising pitch |
| Door unlock | Heavy metallic clank |
| Torch flicker | Soft crackling noise |
| Ambient drip | Random water drop sounds (Floor 1) |
| Footsteps | Floor-specific: stone (1), wood (2), metal (3), flesh (4) |

## Game Flow

1. **Floor 1 Start**: Generate maze, spawn player with pistol
2. **Explore Floor**: Auto-AI navigates rooms, fights shamblers
3. **Find Shotgun**: In armory room, major power-up
4. **Find Key**: In a side room, unlocks boss room
5. **Boss Fight**: Defeat Guardian to access elevator
6. **Descend**: Move to Floor 2, maze regenerated, memory wiped
7. **Repeat**: Each floor harder, new weapon, new monsters
8. **Endless**: After Floor 4, floors repeat with scaling difficulty
9. **Death**: Game over with stats (floors cleared, total kills, score)

### Scoring
```
Monster kill:     10 * floorNumber points
Boss kill:        200 * floorNumber points
Room explored:    25 * floorNumber points
Floor cleared:    500 * floorNumber points (all rooms explored + boss killed)
Time bonus:       max(0, 300 - seconds_on_floor) * floorNumber
```

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
| 1-4 | Switch weapon |
| E | Interact (elevator, doors) |
| J | Toggle journal panel |
| P | Pause |
| T | Toggle AI autopilot on/off |
