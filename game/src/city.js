// Port Sable, generated from a seed: an 8x8 street grid with four districts —
// downtown towers in the north-centre, a park in the west, a sandy beach and
// sea along the south edge, and a working harbor with piers on the east edge.
// Buildings, trees and crates are collision; water blocks movement except on
// the piers. The road graph is the street grid itself, which traffic follows.

import { GRID, WORLD } from './config.js';
import { createRandom, pick, randInt } from './random.js';

export const STREET_LINES = [];
for (let i = 0; i < GRID.count; i += 1) STREET_LINES.push(GRID.first + i * GRID.pitch);

const ROOFS = ['#b0563a', '#a34d33', '#7a8ba0', '#8f6b4a', '#96584a', '#6b7d5a'];
const SIDES = ['#d9c9a8', '#cdbb98', '#e0d3b3', '#c4b294', '#d3c2a0'];

function blockRect(col, row) {
  const half = GRID.road / 2 + 14;
  return {
    x: STREET_LINES[col] + half,
    y: STREET_LINES[row] + half,
    w: GRID.pitch - 2 * half,
    h: GRID.pitch - 2 * half,
  };
}

function isPark(col, row) {
  return col >= 1 && col <= 2 && row >= 3 && row <= 4;
}
function isDowntown(col, row) {
  return col >= 3 && col <= 4 && row >= 1 && row <= 2;
}
function isHarborBlock(col, row) {
  return col === 7 && row >= 1 && row <= 5;
}

export function createCity(seed) {
  const random = createRandom(seed);
  const buildings = [];
  const trees = [];
  const crates = [];
  const lamps = [];

  for (let col = 0; col < GRID.count - 1; col += 1) {
    for (let row = 0; row < GRID.count - 1; row += 1) {
      const b = blockRect(col, row);
      if (isPark(col, row)) {
        const count = randInt(random, 7, 11);
        for (let i = 0; i < count; i += 1) {
          trees.push({ x: b.x + 30 + random() * (b.w - 60), y: b.y + 30 + random() * (b.h - 60), r: 12 + random() * 7, palm: false });
        }
        continue;
      }
      if (isHarborBlock(col, row)) {
        // Warehouses: long low sheds plus crate stacks.
        const shed = { x: b.x + 20, y: b.y + 30, w: b.w - 40, h: 90, height: 26, roof: '#8a7a5c', side: '#b3a284', tower: false, helipad: false };
        buildings.push(shed);
        const n = randInt(random, 4, 7);
        for (let i = 0; i < n; i += 1) {
          crates.push({ x: b.x + 20 + random() * (b.w - 70), y: b.y + 150 + random() * (b.h - 200), w: 26 + random() * 14, h: 26 + random() * 14 });
        }
        continue;
      }
      if (isDowntown(col, row)) {
        const tower = {
          x: b.x + 40, y: b.y + 40, w: b.w - 80, h: b.h - 80,
          height: 90 + random() * 70, roof: '#cfd6de', side: '#9aa5b1', tower: true,
          helipad: random() < 0.5,
        };
        buildings.push(tower);
        lamps.push({ x: b.x + 8, y: b.y + 8 });
        continue;
      }
      // Ordinary blocks: one to four buildings with setbacks.
      const splits = random() < 0.45 ? 1 : random() < 0.7 ? 2 : 4;
      for (let s = 0; s < splits; s += 1) {
        const gx = splits === 4 ? (s % 2) : splits === 2 ? s : 0;
        const gy = splits === 4 ? Math.floor(s / 2) : 0;
        const cw = splits === 1 ? b.w : b.w / 2;
        const ch = splits === 4 ? b.h / 2 : b.h;
        const pad = 16;
        const w = cw - pad * 2 - random() * 30;
        const h = ch - pad * 2 - random() * 30;
        buildings.push({
          x: b.x + gx * cw + pad + random() * 10,
          y: b.y + gy * ch + pad + random() * 10,
          w: Math.max(50, w), h: Math.max(50, h),
          height: 26 + random() * 30,
          roof: pick(random, ROOFS), side: pick(random, SIDES),
          tower: false, helipad: false,
        });
      }
      if (random() < 0.6) trees.push({ x: b.x + 14, y: b.y + 14, r: 10 + random() * 5, palm: false });
    }
  }

  // Beach palms and umbrellas along the south sand.
  for (let i = 0; i < 16; i += 1) {
    trees.push({ x: 120 + random() * (WORLD.width - 240), y: 3075 + random() * 40, r: 11, palm: true });
  }
  // Street trees on sidewalks.
  for (const sx of STREET_LINES) {
    for (const sy of STREET_LINES) {
      if (random() < 0.35) trees.push({ x: sx + 66, y: sy + 66, r: 9 + random() * 4, palm: false });
    }
  }

  // Water: the sea south of the beach and east of the harbor, with piers.
  const water = [
    { x: 0, y: 3130, w: WORLD.width, h: WORLD.height - 3130 },
    { x: 3120, y: 0, w: WORLD.width - 3120, h: 3130 },
  ];
  const piers = [
    { x: 3040, y: 900, w: 130, h: 26 },
    { x: 3040, y: 1700, w: 130, h: 26 },
    { x: 3040, y: 2500, w: 130, h: 26 },
  ];
  // Crates stacked near the piers.
  for (const pier of piers) {
    crates.push({ x: pier.x - 60, y: pier.y - 40, w: 30, h: 30 });
    crates.push({ x: pier.x - 30, y: pier.y - 44, w: 26, h: 26 });
  }

  // Named places the story uses, all on drivable ground.
  const places = {
    garage: { x: STREET_LINES[2], y: STREET_LINES[5] + 70, name: "Marlow's Garage" },
    garageDoor: { x: STREET_LINES[2] + 60, y: STREET_LINES[5] + 70 },
    marina: { x: STREET_LINES[5], y: 3010, name: 'Marina Lot' },
    lookout: { x: STREET_LINES[1], y: STREET_LINES[1], name: 'Lookout Point' },
    warehouse: { x: 2980, y: STREET_LINES[3], name: 'Crowe Warehouse' },
    docks: { x: 3060, y: 1700, name: 'East Docks' },
    beachBar: { x: STREET_LINES[3], y: 3020, name: 'Sandy Anchor Bar' },
    dropNorth: { x: STREET_LINES[6], y: STREET_LINES[1], name: 'North Drop' },
  };

  return { buildings, trees, crates, lamps, water, piers, places, seed };
}

/** True when the point is inside a water region and not standing on a pier. */
export function inWater(city, x, y) {
  for (const pier of city.piers) {
    if (x >= pier.x && x <= pier.x + pier.w && y >= pier.y && y <= pier.y + pier.h) return false;
  }
  for (const w of city.water) {
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
  }
  return false;
}

function pushOutOfRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
  }
  // Centre inside the rect: push out along the smallest penetration.
  const left = x - rect.x;
  const right = rect.x + rect.w - x;
  const top = y - rect.y;
  const bottom = rect.y + rect.h - y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: rect.x - r, y };
  if (m === right) return { x: rect.x + rect.w + r, y };
  if (m === top) return { x, y: rect.y - r };
  return { x, y: rect.y + rect.h + r };
}

/**
 * Resolve a circle against buildings, crates, trees, water and the world edge.
 * Returns the corrected position; the circle is never left inside a solid.
 */
export function resolveCircle(city, x, y, r) {
  let px = Math.max(r, Math.min(WORLD.width - r, x));
  let py = Math.max(r, Math.min(WORLD.height - r, y));
  for (const b of city.buildings) {
    const out = pushOutOfRect(px, py, r, b);
    if (out) { px = out.x; py = out.y; }
  }
  for (const c of city.crates) {
    const out = pushOutOfRect(px, py, r, c);
    if (out) { px = out.x; py = out.y; }
  }
  for (const t of city.trees) {
    const dx = px - t.x;
    const dy = py - t.y;
    const d2 = dx * dx + dy * dy;
    const min = r + 4;
    if (d2 < min * min && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      px = t.x + (dx / d) * min;
      py = t.y + (dy / d) * min;
    }
  }
  if (inWater(city, px, py)) {
    // Step back toward the previous dry position: pull toward the map centre.
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    const dx = cx - px;
    const dy = cy - py;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = px;
    let ny = py;
    for (let i = 0; i < 40 && inWater(city, nx, ny); i += 1) {
      nx += (dx / d) * 8;
      ny += (dy / d) * 8;
    }
    px = nx;
    py = ny;
  }
  return { x: px, y: py };
}

/**
 * Find a spot near (x, y) where a circle of radius r sits clear of every
 * solid — parked and mission cars must never spawn inside a building.
 */
export function findClearSpot(city, x, y, r) {
  for (let ring = 0; ring < 7; ring += 1) {
    for (let a = 0; a < 8; a += 1) {
      const cx = x + Math.cos((a / 8) * Math.PI * 2) * ring * 26;
      const cy = y + Math.sin((a / 8) * Math.PI * 2) * ring * 26;
      const resolved = resolveCircle(city, cx, cy, r);
      if (Math.abs(resolved.x - cx) < 0.5 && Math.abs(resolved.y - cy) < 0.5) {
        return { x: cx, y: cy };
      }
    }
  }
  return { x, y };
}

/**
 * A heading along the nearest street with open ground ahead, so a parked car
 * never faces a wall or another parked car: probe both directions and take
 * the clear one.
 */
export function faceAlongRoad(city, cars, x, y) {
  const sx = nearestStreet(x);
  const sy = nearestStreet(y);
  const vertical = Math.abs(x - sx) <= Math.abs(y - sy);
  const options = vertical ? [-Math.PI / 2, Math.PI / 2] : [0, Math.PI];
  for (const a of options) {
    const ahead = { x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 90 };
    const resolved = resolveCircle(city, ahead.x, ahead.y, 20);
    if (Math.abs(resolved.x - ahead.x) >= 0.5 || Math.abs(resolved.y - ahead.y) >= 0.5) continue;
    const blocked = (cars || []).some((c) => Math.hypot(c.x - ahead.x, c.y - ahead.y) < 48);
    if (!blocked) return a;
  }
  return options[0];
}

/** True when a straight line between two points crosses a building. */
export function sightBlocked(city, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(len / 24));
  for (let i = 1; i < steps; i += 1) {
    const x = x1 + (dx * i) / steps;
    const y = y1 + (dy * i) / steps;
    for (const b of city.buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
  }
  return false;
}

/** The street line nearest to a coordinate. */
export function nearestStreet(v) {
  let best = STREET_LINES[0];
  let bd = Math.abs(v - best);
  for (const s of STREET_LINES) {
    const d = Math.abs(v - s);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** True when the point is on a road (within the road width of a street line). */
export function onRoad(x, y) {
  const half = GRID.road / 2;
  for (const s of STREET_LINES) {
    if (Math.abs(x - s) <= half || Math.abs(y - s) <= half) return true;
  }
  return false;
}

/** A random intersection point. */
export function randomIntersection(random) {
  return { x: pick(random, STREET_LINES), y: pick(random, STREET_LINES) };
}

/**
 * The next waypoint for a car that must stay on the street grid: drive along
 * the current street to the target's row or column, then turn onto it. Cars
 * using this never cut diagonally across blocks.
 */
export function gridWaypoint(x, y, tx, ty) {
  const sx = nearestStreet(x);
  const sy = nearestStreet(y);
  const onV = Math.abs(x - sx) < 26;
  const onH = Math.abs(y - sy) < 26;
  if (onV && Math.abs(y - ty) > 34) return { x: sx, y: ty };
  if (onH && Math.abs(x - tx) > 34) return { x: tx, y: sy };
  if (onV) return { x: tx, y };
  if (onH) return { x, y: ty };
  // Off the grid (a driveway or a shove): head for the nearest street line.
  if (Math.abs(x - sx) < Math.abs(y - sy)) return { x: sx, y };
  return { x, y: sy };
}
