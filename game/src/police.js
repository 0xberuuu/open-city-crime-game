// The wanted system: crimes raise heat, stars rise, and the Port Sable police
// answer. Cruisers spawn ahead of the player and ram; foot officers close in
// and arrest. Break line of sight and stay quiet and the heat fades, one star
// at a time. Getting busted costs cash; getting wasted costs more.

import { POLICE } from './config.js';
import { sightBlocked, resolveCircle, randomIntersection, gridWaypoint } from './city.js';
import { createCar, driveCar, steerToward } from './vehicles.js';

export function createPolice() {
  return {
    stars: 0,
    heat: 0,
    unseenTimer: 0,
    cruisers: [],
    officers: [],
    arrestProgress: 0,
    spawnCooldown: 0,
  };
}

export function addHeat(police, amount) {
  police.heat = Math.min(100, police.heat + amount);
  const stars = police.heat <= 0 ? 0 : police.heat < 18 ? 1 : police.heat < 38 ? 2 : police.heat < 60 ? 3 : police.heat < 82 ? 4 : 5;
  if (stars > police.stars) police.unseenTimer = 0;
  police.stars = stars;
}

export function clearWanted(police) {
  police.stars = 0;
  police.heat = 0;
  police.unseenTimer = 0;
  police.arrestProgress = 0;
  police.cruisers = [];
  police.officers = [];
}

/** Is any officer or cruiser currently seeing the player? */
export function policeSeePlayer(police, city, px, py) {
  const watchers = [...police.cruisers, ...police.officers];
  for (const w of watchers) {
    if (w.dead) continue;
    const d = Math.hypot(w.x - px, w.y - py);
    if (d < POLICE.sightRange && !sightBlocked(city, w.x, w.y, px, py)) return true;
  }
  return false;
}

function spawnCruiser(police, city, px, py, random) {
  // Spawn on a road ahead of the player, off-screen when possible.
  const spot = randomIntersection(random);
  const car = createCar('police', spot.x, spot.y, Math.atan2(py - spot.y, px - spot.x), '#1d2733');
  car.driver = 'police';
  police.cruisers.push(car);
  return car;
}

function spawnOfficer(police, px, py, random) {
  const a = random() * Math.PI * 2;
  const d = 320 + random() * 160;
  police.officers.push({
    x: px + Math.cos(a) * d,
    y: py + Math.sin(a) * d,
    angle: 0,
    speed: 175,
    cooldown: 1,
    dead: false,
    radius: 13,
  });
}

/**
 * One police step: keep the right number of units out, drive cruisers into the
 * player, walk officers up for the arrest, and fade stars when unseen.
 * Returns 'busted' when an arrest completes, else null.
 */
export function stepPolice(police, dt, city, player, cars, random, onRam) {
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  police.spawnCooldown -= dt;

  const wantCruisers = POLICE.cruiserPerStar[police.stars] || 0;
  const wantOfficers = POLICE.officerPerStar[police.stars] || 0;
  police.cruisers = police.cruisers.filter((c) => !c.dead);
  police.officers = police.officers.filter((o) => !o.dead);
  if (police.stars > 0 && police.spawnCooldown <= 0) {
    if (police.cruisers.length < wantCruisers) {
      const car = spawnCruiser(police, city, px, py, random);
      cars.push(car);
      police.spawnCooldown = 1.2;
    } else if (police.officers.length < wantOfficers) {
      spawnOfficer(police, px, py, random);
      police.spawnCooldown = 1.2;
    }
  }

  // Cruisers pursue and ram: grid-follow from afar, direct chase up close.
  for (const car of police.cruisers) {
    const dist = Math.hypot(px - car.x, py - car.y);
    const goal = dist > 300 ? gridWaypoint(car.x, car.y, px, py) : { x: px, y: py };
    const { throttle, steer } = steerToward(car, goal.x, goal.y, car.spec.topSpeed);
    const hit = driveCar(car, dt, throttle, steer, false, city);
    if (hit.crashed && onRam) onRam(car);
    // Ram the player's car directly when close.
    if (player.car && Math.hypot(car.x - player.car.x, car.y - player.car.y) < 70) {
      car.speed = Math.max(car.speed, 200);
    }
  }

  // Officers run at the player; standing next to them fills the arrest meter.
  let arresting = false;
  for (const o of police.officers) {
    o.cooldown -= dt;
    const dx = px - o.x;
    const dy = py - o.y;
    const dist = Math.hypot(dx, dy) || 1;
    o.angle = Math.atan2(dy, dx);
    if (dist > POLICE.arrestRange) {
      const nx = o.x + (dx / dist) * o.speed * dt;
      const ny = o.y + (dy / dist) * o.speed * dt;
      const resolved = resolveCircle(city, nx, ny, o.radius);
      o.x = resolved.x;
      o.y = resolved.y;
    } else if (!player.car) {
      arresting = true;
    }
  }
  if (arresting && !player.dead) {
    police.arrestProgress += dt / POLICE.arrestTime;
    if (police.arrestProgress >= 1) {
      police.arrestProgress = 0;
      return 'busted';
    }
  } else {
    police.arrestProgress = Math.max(0, police.arrestProgress - dt * 0.8);
  }

  // Fade: unseen for long enough and one star drops.
  if (police.stars > 0) {
    if (policeSeePlayer(police, city, px, py)) {
      police.unseenTimer = 0;
    } else {
      police.unseenTimer += dt;
      if (police.unseenTimer > POLICE.fadeTime) {
        police.unseenTimer = 0;
        police.heat = Math.max(0, police.heat - 22);
        const stars = police.heat <= 0 ? 0 : police.heat < 18 ? 1 : police.heat < 38 ? 2 : police.heat < 60 ? 3 : police.heat < 82 ? 4 : 5;
        police.stars = stars;
        if (police.stars === 0) {
          police.cruisers = [];
          police.officers = [];
        }
      }
    }
  }
  return null;
}
