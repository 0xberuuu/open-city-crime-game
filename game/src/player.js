// The player on foot and in a car: movement, aiming, carjacking, health and
// armor, and the weapon they carry. When driving, the car is the body and the
// player rides inside it; getting out puts them beside the driver's door.

import { PLAYER, WEAPONS } from './config.js';
import { clamp } from './random.js';
import { resolveCircle } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    armor: 0,
    cash: 120,
    weapon: 'pistol',
    weapons: { fists: true, pistol: true, smg: false },
    ammo: { pistol: WEAPONS.pistol.ammo, smg: 0 },
    cooldown: 0,
    hurtTimer: 0,
    timeSinceHurt: 99,
    car: null,
    moving: false,
    running: false,
    dead: false,
    busted: false,
    punchAnim: 0,
  };
}

/** Walk one step on foot; axes are screen-space -1..1. Returns nothing. */
export function walkPlayer(player, dt, axes, running, city) {
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(axes.x, axes.y);
  player.moving = len > 0.1;
  player.running = running && player.moving;
  if (!player.moving) return;
  const nx = player.x + (axes.x / len) * speed * dt;
  const ny = player.y + (axes.y / len) * speed * dt;
  const resolved = resolveCircle(city, nx, ny, PLAYER.radius);
  player.x = resolved.x;
  player.y = resolved.y;
}

/** Aim the player toward a world point (the mouse). */
export function aimPlayer(player, wx, wy) {
  player.angle = Math.atan2(wy - player.y, wx - player.x);
}

/** Damage the player: armor absorbs 60% until it runs out. */
export function hurtPlayer(player, amount) {
  if (player.dead) return;
  let rest = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, rest * 0.6);
    player.armor -= absorbed;
    rest -= absorbed;
  }
  player.health -= rest;
  player.hurtTimer = 0.25;
  player.timeSinceHurt = 0;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
  }
}

/** Slow health regeneration after a few calm seconds. */
export function regenPlayer(player, dt) {
  player.timeSinceHurt += dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  if (player.cooldown > 0) player.cooldown -= dt;
  if (player.punchAnim > 0) player.punchAnim -= dt;
  if (!player.dead && player.timeSinceHurt > PLAYER.regenDelay && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + PLAYER.regenRate * dt);
  }
}

/** Cycle to the next owned weapon. */
export function cycleWeapon(player) {
  const order = ['fists', 'pistol', 'smg'];
  const at = order.indexOf(player.weapon);
  for (let i = 1; i <= order.length; i += 1) {
    const next = order[(at + i) % order.length];
    if (player.weapons[next]) {
      player.weapon = next;
      return next;
    }
  }
  return player.weapon;
}

export function currentWeapon(player) {
  return WEAPONS[player.weapon];
}

/** Can the current weapon fire right now? */
export function canFire(player) {
  if (player.cooldown > 0 || player.dead) return false;
  const w = currentWeapon(player);
  if (player.weapon === 'fists') return true;
  return player.ammo[player.weapon] > 0;
}

/** Spend one shot's cooldown and ammo; returns false when it cannot fire. */
export function spendShot(player) {
  if (!canFire(player)) return false;
  const w = currentWeapon(player);
  player.cooldown = w.cooldown;
  if (player.weapon !== 'fists') player.ammo[player.weapon] -= 1;
  if (player.weapon === 'fists') player.punchAnim = 0.22;
  return true;
}

/** The nearest car within reach, for entering or jacking. */
export function nearestCar(player, cars, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const car of cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

/** Get in a car: occupied cars are jacked (a crime); parked ones are free. */
export function enterCar(player, car) {
  const jacked = car.driver !== null && car.driver !== 'player';
  player.car = car;
  car.driver = 'player';
  car.target = null;
  return jacked;
}

/** Get out beside the car, on the driver's side. */
export function exitCar(player, city) {
  const car = player.car;
  if (!car) return;
  player.car = null;
  car.driver = null;
  const side = car.angle + Math.PI / 2;
  const px = car.x + Math.cos(side) * 34;
  const py = car.y + Math.sin(side) * 34;
  const resolved = resolveCircle(city, px, py, PLAYER.radius);
  player.x = resolved.x;
  player.y = resolved.y;
  player.angle = car.angle;
}

export function healPlayer(player, amount) {
  player.health = clamp(player.health + amount, 0, PLAYER.maxHealth);
}

export function giveArmor(player, amount) {
  player.armor = clamp(player.armor + amount, 0, PLAYER.maxArmor);
}

export function giveAmmo(player, weapon, amount) {
  if (!player.weapons[weapon]) player.weapons[weapon] = true;
  player.ammo[weapon] = (player.ammo[weapon] || 0) + amount;
}
