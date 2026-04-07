# Shootout — FPS Maze Survival Game

## Project Overview

A first-person shooter simulation game featuring:
- Low-poly/low-graphics aesthetic
- A player character navigating a procedurally generated maze
- Ammo and bonus collection throughout the maze
- Monsters with basic AI to fight
- Weapons collected along the way, starting with a pistol
- Synthwave rhythmic background music and sound effects
- Basic AI for both monsters and the player character
- Player actions: get hurt, heal, shoot, reload, hide behind walls/obstacles, walk
- Auto-advancing AI for the main character navigating the maze
- Memory system tracking last several corridors/rooms visited to create an illusion of spatial awareness

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML5 Canvas for rendering
- Web Audio API for synthwave music and sound effects
- No build system — runs directly in the browser

## Design Alternatives

### Alternative A: "Classic Dungeon Crawler" — Raycasting Engine

**Rendering**: Wolfenstein 3D-style raycasting (pseudo-3D from a 2D grid). Walls rendered as solid-colored vertical strips. Very low graphics, very fast performance.

**Maze**: Grid-based rooms and corridors. Procedurally generated per level using recursive backtracking. Rooms are wider cells, corridors are 1-cell-wide passages.

**Memory System**: Circular buffer of last ~20 visited cells. When the player re-enters a remembered cell, the game "recognizes" it ("You've been here before...") and may show a faint trail on a minimap. Beyond the buffer, it's forgotten — giving the illusion of spatial memory.

**AI**:
- Monsters patrol fixed routes within rooms. When they "hear" a shot or "see" the player (line-of-sight raycast), they switch to chase mode.
- Player character auto-AI uses a wall-following algorithm (right-hand rule) with randomized room exploration.

**Weapons**: Pistol → Shotgun → SMG. Found on pedestals in rooms. Ammo scattered in corridors.

**Pros**: Proven technique, very performant, authentic retro FPS feel.
**Cons**: Walls all look similar (no height variation). Can feel repetitive visually.

---

### Alternative B: "Neon Maze" — Top-Down 2.5D with First-Person Viewport

**Rendering**: Split layout — a small top-down minimap in a corner + a first-person viewport rendered with raycasting. Synthwave neon aesthetic: dark backgrounds, glowing wall edges, pulsing floor grids.

**Maze**: Hybrid generation using BSP (Binary Space Partitioning) to carve out rooms of varying sizes, then connect with corridors. More organic layouts. Obstacles (crates, pillars) inside rooms for cover.

**Memory System**: Room graph — each visited room gets a node with connections. Store last ~8 rooms with details (items found, monsters killed). Older rooms fade to "fog" on the minimap. When revisited, the game says "This room seems familiar..." but doesn't fully restore details.

**AI**:
- Monsters have 3 states: idle/wander, alert (heard noise), attack (sees player). Different monster types — melee rushers, ranged shooters, ambushers hiding behind corners.
- Player auto-AI uses A* pathfinding toward unexplored areas, with tactical decisions (take cover when health low, prioritize ammo pickups when low).

**Weapons**: Pistol → Shotgun → Plasma Rifle. Each with distinct sound and visual effect.

**Pros**: Best visual match for synthwave music. Minimap adds strategic depth. Cover system with obstacles.
**Cons**: More complex rendering. Split attention between minimap and FPS view.

---

### Alternative C: "The Depths" — Pure Raycasting with Atmosphere

**Rendering**: Full-screen raycasting with added atmosphere — distance fog, flickering lights, colored lighting zones (red danger rooms, green safe rooms, blue ammo caches). Minimal but mood-heavy.

**Maze**: Layer-based with "floors" of increasing difficulty. Each floor is procedurally generated. Elevator rooms connect floors. Sense of progression and variety.

**Memory System**: Per-floor journal — the game keeps a log of rooms visited on the current floor (last ~12). When descending to a new floor, previous floor memory is wiped. Visited corridors get subtle wall marks (scratches, arrows) as visual breadcrumbs.

**AI**:
- Monsters scale with floor depth. Floor 1: slow zombies. Floor 2: faster ghouls. Floor 3+: ranged demons. Boss monster guards each elevator.
- Player auto-AI explores methodically, prefers unexplored paths, retreats to heal when hurt, seeks ammo when low.

**Weapons**: Pistol → Shotgun → Rifle → Rocket Launcher (one per floor).

**Pros**: Strongest game loop (floor progression). Atmosphere compensates for low graphics. Boss fights add punctuation.
**Cons**: More content to design (multiple floors, boss behaviors). Most ambitious scope.

---

## Recommendation

**Alternative B ("Neon Maze")** is the recommended sweet spot because:
1. Synthwave aesthetic maps perfectly to neon-outlined walls and glowing effects — cheap to render but visually striking
2. Cover system (hiding behind obstacles) works best with BSP room layouts containing interior objects
3. Minimap solves "player gets lost" problem while fog-of-war creates mystery
4. Room-graph memory system naturally models "I remember recent rooms but forget old ones"
5. Scope is manageable for vanilla JS + Canvas

## Implementation Plan

All three alternatives will be implemented in `./v1/` subdirectories for comparison:
- `v1/alternative-a/` — Classic Dungeon Crawler
- `v1/alternative-b/` — Neon Maze
- `v1/alternative-c/` — The Depths
