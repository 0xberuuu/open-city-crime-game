// Port Sable: every tuning number, colour and world constant in one place.
// The world is a fixed 3200x3200 area; the renderer shows a 1280x800 window of it.

export const WORLD = { width: 3200, height: 3200 };

/** Fixed simulation step: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Streets run on this grid pitch; the road itself is ROAD wide, centred on each line. */
export const GRID = { pitch: 400, road: 104, first: 200, count: 8 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  runSpeed: 300,
  maxHealth: 100,
  maxArmor: 100,
  regenDelay: 4,
  regenRate: 9,
  punchDamage: 12,
  punchRange: 34,
  punchCooldown: 0.42,
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, cooldown: 0.42, spread: 0, auto: false, ammo: Infinity, sound: 'punch' },
  pistol: { name: 'Pistol', damage: 26, cooldown: 0.26, spread: 0.035, auto: false, ammo: 48, sound: 'shot' },
  smg: { name: 'SMG', damage: 13, cooldown: 0.085, spread: 0.09, auto: true, ammo: 180, sound: 'shot' },
};

export const CARS = {
  sedan: { name: 'Alba Sedan', length: 62, width: 30, accel: 330, topSpeed: 520, reverse: 190, turn: 2.9, grip: 3.4, health: 100, colors: ['#c8ccd4', '#7d8aa0', '#a03d3d', '#3d6b8f'] },
  taxi: { name: 'Sable Cab', length: 62, width: 30, accel: 320, topSpeed: 500, reverse: 180, turn: 2.9, grip: 3.4, health: 100, colors: ['#e8b93c'] },
  coupe: { name: 'Vento Coupe', length: 58, width: 28, accel: 430, topSpeed: 640, reverse: 210, turn: 3.4, grip: 4.1, health: 85, colors: ['#b3312f', '#2f6fb3', '#d8d8d8'] },
  van: { name: 'Harbor Van', length: 72, width: 32, accel: 250, topSpeed: 420, reverse: 160, turn: 2.4, grip: 3.0, health: 140, colors: ['#e6e2d8', '#5a6b52'] },
  truck: { name: 'Dock Truck', length: 86, width: 34, accel: 210, topSpeed: 380, reverse: 150, turn: 2.1, grip: 2.8, health: 180, colors: ['#8f7a4e', '#4e6b8f'] },
  police: { name: 'Interceptor', length: 62, width: 30, accel: 420, topSpeed: 620, reverse: 210, turn: 3.3, grip: 4.0, health: 130, colors: ['#1d2733'] },
};

export const POLICE = {
  maxStars: 5,
  // Seconds with no officer seeing the player before one star fades.
  fadeTime: 9,
  cruiserPerStar: [0, 1, 2, 3, 4, 5],
  officerPerStar: [0, 0, 1, 2, 3, 4],
  sightRange: 520,
  arrestRange: 30,
  arrestTime: 1.6,
};

export const PEDS = { count: 26, walkSpeed: 55, fleeSpeed: 170 };

export const TRAFFIC = { count: 14, speed: 165, minGap: 58 };

export const MISSION_REWARDS = [150, 250, 350, 450, 700];

export const PALETTE = {
  ground: '#b8a06a',
  grass: '#7da95c',
  parkGrass: '#6f9e52',
  sand: '#e3d3a1',
  sea: '#3f8fb5',
  seaDeep: '#2f7499',
  road: '#4a4a52',
  roadEdge: '#5d5d66',
  sidewalk: '#c9bfa5',
  lane: '#e8dd9a',
  crosswalk: '#d8d8d8',
  building: '#d9c9a8',
  buildingSide: '#a89878',
  roof: '#b0563a',
  roofAlt: '#7a8ba0',
  tower: '#cfd6de',
  towerSide: '#9aa5b1',
  tree: '#4e7d3a',
  treeDark: '#3d6330',
  palm: '#5e8f3e',
  text: '#f5f0e0',
  muted: '#c9c2ab',
  gold: '#f2c94c',
  red: '#d84a3a',
  police: '#3a6fd8',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';

/** Where the save game is kept between visits (this browser only). */
export const SAVE_KEY = 'port-sable.save.v1';
