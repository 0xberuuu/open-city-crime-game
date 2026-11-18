// Combat: bullets, enemy gunmen with seek/strafe/shoot behaviour, and the
// pickups the world drops. Bullets are fast projectiles that stop at walls,
// cars and people; enemies need line of sight to shoot and strafe while they
// do it, so a firefight moves instead of standing still.

import { WEAPONS } from './config.js';
import { sightBlocked, resolveCircle } from './city.js';
import { bloodPuff, muzzle, sparkBurst } from './effects.js';
import { damageCar } from './vehicles.js';

export function createCombat() {
  return { bullets: [], enemies: [], pickups: [] };
}

export function fireBullet(combat, fx, x, y, angle, weapon, fromPlayer, damageMul) {
  const w = WEAPONS[weapon];
  const spread = (Math.random() - 0.5) * 2 * w.spread;
  const a = angle + spread;
  combat.bullets.push({
    x: x + Math.cos(a) * 22,
    y: y + Math.sin(a) * 22,
    vx: Math.cos(a) * 900,
    vy: Math.sin(a) * 900,
    life: 0.7,
    damage: w.damage * (damageMul || 1),
    fromPlayer,
  });
  muzzle(fx, x, y, a);
}

/** A gunman: seeks the player, strafes at range, shoots on line of sight. */
export function spawnEnemy(combat, x, y, opts) {
  const o = opts || {};
  combat.enemies.push({
    x, y,
    angle: 0,
    health: o.health || 60,
    maxHealth: o.health || 60,
    speed: o.speed || 165,
    damage: o.damage || 8,
    cooldown: 0.5 + Math.random(),
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    strafeTimer: 1 + Math.random() * 2,
    color: o.color || '#7a3a3a',
    boss: !!o.boss,
    name: o.name || 'Goon',
    dead: false,
    radius: o.boss ? 17 : 13,
  });
  return combat.enemies[combat.enemies.length - 1];
}

export function spawnPickup(combat, x, y, kind, amount) {
  combat.pickups.push({ x, y, kind, amount: amount || 0, bob: Math.random() * 6 });
}

function bulletHitsCircle(b, x, y, r) {
  const dx = b.x - x;
  const dy = b.y - y;
  return dx * dx + dy * dy < r * r;
}

/** Move bullets and resolve hits against walls, cars, enemies and the player. */
export function stepBullets(combat, fx, dt, city, cars, player, onPlayerHit, onEnemyDown, onCarHit) {
  for (let i = combat.bullets.length - 1; i >= 0; i -= 1) {
    const b = combat.bullets[i];
    b.life -= dt;
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    let dead = b.life <= 0;
    if (!dead && sightBlocked(city, b.x, b.y, nx, ny)) {
      sparkBurst(fx, nx, ny);
      dead = true;
    }
    if (!dead) {
      for (const car of cars) {
        if (car.dead) continue;
        const dx = nx - car.x;
        const dy = ny - car.y;
        const localX = dx * Math.cos(-car.angle) - dy * Math.sin(-car.angle);
        const localY = dx * Math.sin(-car.angle) + dy * Math.cos(-car.angle);
        if (Math.abs(localX) < car.spec.length / 2 && Math.abs(localY) < car.spec.width / 2) {
          if (damageCar(car, b.damage)) {
            if (onCarHit) onCarHit(car);
          }
          sparkBurst(fx, nx, ny);
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.fromPlayer) {
      for (const e of combat.enemies) {
        if (e.dead) continue;
        if (bulletHitsCircle(b, e.x, e.y, e.radius)) {
          e.health -= b.damage;
          bloodPuff(fx, nx, ny);
          if (e.health <= 0) {
            e.dead = true;
            if (onEnemyDown) onEnemyDown(e);
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead && !b.fromPlayer && !player.dead) {
      const target = player.car || player;
      const r = player.car ? 26 : 14;
      if (bulletHitsCircle(b, target.x, target.y, r)) {
        if (onPlayerHit) onPlayerHit(b.damage);
        bloodPuff(fx, nx, ny);
        dead = true;
      }
    }
    if (dead) combat.bullets.splice(i, 1);
    else { b.x = nx; b.y = ny; }
  }
  combat.enemies = combat.enemies.filter((e) => !e.dead || e.deathTimer > 0);
}

/** Enemy AI: close in, strafe at shooting range, fire on line of sight. */
export function stepEnemies(combat, fx, dt, city, player, random) {
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  for (const e of combat.enemies) {
    if (e.dead) continue;
    e.cooldown -= dt;
    e.strafeTimer -= dt;
    if (e.strafeTimer <= 0) {
      e.strafeDir *= -1;
      e.strafeTimer = 1 + random() * 2;
    }
    const dx = px - e.x;
    const dy = py - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    e.angle = want;
    const blocked = sightBlocked(city, e.x, e.y, px, py);
    let mx = 0;
    let my = 0;
    if (blocked || dist > 300) {
      mx = Math.cos(want);
      my = Math.sin(want);
    } else if (dist < 150) {
      mx = -Math.cos(want) * 0.5;
      my = -Math.sin(want) * 0.5;
    } else {
      const strafe = want + (Math.PI / 2) * e.strafeDir;
      mx = Math.cos(strafe) * 0.7;
      my = Math.sin(strafe) * 0.7;
    }
    const nx = e.x + mx * e.speed * dt;
    const ny = e.y + my * e.speed * dt;
    const resolved = resolveCircle(city, nx, ny, e.radius);
    e.x = resolved.x;
    e.y = resolved.y;
    if (!blocked && dist < 420 && e.cooldown <= 0 && !player.dead) {
      e.cooldown = e.boss ? 0.55 : 0.8 + random() * 0.5;
      fireBullet(combat, fx, e.x, e.y, want, 'pistol', false, e.damage / WEAPONS.pistol.damage);
    }
  }
}

/** Pickups bob gently; the player collects them by walking or driving over. */
export function stepPickups(combat, dt, player, onCollect) {
  for (let i = combat.pickups.length - 1; i >= 0; i -= 1) {
    const p = combat.pickups[i];
    p.bob += dt * 3;
    const tx = player.car ? player.car.x : player.x;
    const ty = player.car ? player.car.y : player.y;
    if (Math.hypot(p.x - tx, p.y - ty) < 34) {
      combat.pickups.splice(i, 1);
      if (onCollect) onCollect(p);
    }
  }
}

/** A melee swing: hits enemies and peds in front of the player. */
export function meleeSwing(combat, fx, player, peds, onEnemyDown) {
  const reach = 40;
  const px = player.x + Math.cos(player.angle) * reach;
  const py = player.y + Math.sin(player.angle) * reach;
  for (const e of combat.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - px, e.y - py) < e.radius + 16) {
      e.health -= WEAPONS.fists.damage;
      bloodPuff(fx, e.x, e.y);
      if (e.health <= 0) {
        e.dead = true;
        if (onEnemyDown) onEnemyDown(e);
      }
    }
  }
  for (const ped of peds) {
    if (Math.hypot(ped.x - px, ped.y - py) < 26) {
      ped.down = 3;
      bloodPuff(fx, ped.x, ped.y);
    }
  }
}
