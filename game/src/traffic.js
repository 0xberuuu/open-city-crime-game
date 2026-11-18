// The city's background life: traffic cars that follow the street grid with
// lane offsets, slowing for the car ahead and honking when stuck, and
// pedestrians who stroll the sidewalks, gather near the beach and the park,
// and run away from gunfire and speeding cars.

import { PEDS, TRAFFIC, WORLD } from './config.js';
import { createRandom, pick, randInt } from './random.js';
import { STREET_LINES, nearestStreet, onRoad, randomIntersection, resolveCircle, gridWaypoint } from './city.js';
import { createCar, driveCar, steerToward } from './vehicles.js';

const CAR_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'coupe', 'truck'];
const PED_COLORS = ['#c96a4a', '#4a7dc9', '#c9b44a', '#6ac96a', '#9a5ac9', '#d8d8d8', '#5ac9b8', '#c95a7d'];

export function createTraffic(city, seed) {
  const random = createRandom(seed ^ 0x5f3a);
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const vertical = random() < 0.5;
    const line = pick(random, STREET_LINES);
    const along = 100 + random() * (WORLD.width - 200);
    const x = vertical ? line : along;
    const y = vertical ? along : line;
    const angle = vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
    const type = pick(random, CAR_TYPES);
    const car = createCar(type, x, y, angle, pick(random, ['#c8ccd4', '#7d8aa0', '#a03d3d', '#3d6b8f', '#e8b93c', '#e6e2d8', '#5a6b52']));
    car.driver = 'traffic';
    car.target = randomIntersection(random);
    cars.push(car);
  }
  return cars;
}

export function createPedestrians(city, seed) {
  const random = createRandom(seed ^ 0x1b7e);
  const peds = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    let x = 0;
    let y = 0;
    // Prefer sidewalks: near a street line but off the road.
    for (let tries = 0; tries < 20; tries += 1) {
      x = 80 + random() * (WORLD.width - 160);
      y = 80 + random() * (WORLD.height - 160);
      if (!onRoad(x, y)) break;
    }
    const resolved = resolveCircle(city, x, y, 10);
    peds.push({
      x: resolved.x, y: resolved.y,
      angle: random() * Math.PI * 2,
      color: pick(random, PED_COLORS),
      speed: PEDS.walkSpeed * (0.8 + random() * 0.4),
      target: null,
      flee: 0,
      fleeAngle: 0,
      down: 0,
      wander: random() * 4,
      phase: random() * Math.PI * 2,
    });
  }
  return peds;
}

function carAhead(car, cars) {
  let best = Infinity;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (forward > 0 && forward < TRAFFIC.minGap + 50 && side < 34 && forward < best) best = forward;
  }
  return best;
}

/** One traffic step: follow the grid, keep a gap, honk when blocked. */
export function stepTraffic(cars, allCars, dt, city, random, onHonk) {
  for (const car of cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    if (!car.target || Math.hypot(car.target.x - car.x, car.target.y - car.y) < 40) {
      car.target = randomIntersection(random);
    }
    // Follow the grid: the waypoint keeps the car on streets, never diagonal.
    const wp = gridWaypoint(car.x, car.y, car.target.x, car.target.y);
    const gap = carAhead(car, allCars);
    let { throttle, steer } = steerToward(car, wp.x, wp.y, TRAFFIC.speed);
    if (gap < TRAFFIC.minGap) {
      throttle = gap < 30 ? -0.4 : 0;
      car.stuck += dt;
      if (car.stuck > 2.5 && car.honkCooldown <= 0) {
        car.honkCooldown = 4;
        car.stuck = 0;
        if (onHonk) onHonk(car);
      }
    } else {
      car.stuck = 0;
    }
    if (car.honkCooldown > 0) car.honkCooldown -= dt;
    driveCar(car, dt, throttle, steer, false, city);
  }
}

/** Pedestrians stroll, pause, and flee from a scare point. */
export function stepPedestrians(peds, dt, city, random, scare) {
  for (const ped of peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    // A scare sets the flee direction at once: the scare point itself is gone
    // after one step, but the ped keeps running for the full flee time.
    if (scare && Math.hypot(ped.x - scare.x, ped.y - scare.y) < 260) {
      ped.flee = 2.5;
      ped.fleeAngle = Math.atan2(ped.y - scare.y, ped.x - scare.x);
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = ped.fleeAngle;
      ped.angle = away;
      const nx = ped.x + Math.cos(away) * PEDS.fleeSpeed * dt;
      const ny = ped.y + Math.sin(away) * PEDS.fleeSpeed * dt;
      const resolved = resolveCircle(city, nx, ny, 10);
      ped.x = resolved.x;
      ped.y = resolved.y;
      continue;
    }
    ped.wander -= dt;
    if (ped.wander <= 0) {
      ped.wander = 2 + random() * 4;
      if (random() < 0.6) {
        ped.target = { x: ped.x + (random() - 0.5) * 500, y: ped.y + (random() - 0.5) * 500 };
      } else {
        ped.target = null;
      }
    }
    if (ped.target) {
      const want = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
      ped.angle = want;
      const nx = ped.x + Math.cos(want) * ped.speed * dt;
      const ny = ped.y + Math.sin(want) * ped.speed * dt;
      const resolved = resolveCircle(city, nx, ny, 10);
      ped.x = resolved.x;
      ped.y = resolved.y;
      if (Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 20) ped.target = null;
    }
    ped.phase += dt * 6;
  }
}

/** Knock a pedestrian down (hit by a car or caught in a blast). */
export function knockPed(ped) {
  ped.down = 3 + Math.random() * 2;
  ped.flee = 0;
}

export function pedCount() {
  return PEDS.count;
}

export function randomPedColor(random) {
  return pick(random, PED_COLORS);
}

export { randInt };
