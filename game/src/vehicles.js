// Cars: arcade driving with drift, handbrake turns, damage, smoke, fire and
// explosions. A car is a point with a heading and a forward speed; steering
// turns it in proportion to speed, and lateral velocity bleeds off through
// grip — low grip while the handbrake is held is what makes it slide.

import { CARS } from './config.js';
import { clamp, turnToward } from './random.js';
import { resolveCircle } from './city.js';

let nextId = 1;

export function createCar(type, x, y, angle, color) {
  const spec = CARS[type];
  return {
    id: nextId++,
    type,
    spec,
    x, y,
    angle,
    speed: 0,
    slide: 0,
    health: spec.health,
    maxHealth: spec.health,
    color: color || spec.colors[0],
    dead: false,
    burning: 0,
    smoke: 0,
    driver: null, // 'player' | 'traffic' | 'police' | null (parked)
    honkCooldown: 0,
    target: null,
    stuck: 0,
  };
}

/** The car's footprint corners, for drawing and rough collision. */
export function carCorners(car) {
  const { length, width } = car.spec;
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const hl = length / 2;
  const hw = width / 2;
  return [
    { x: car.x + c * hl - s * hw, y: car.y + s * hl + c * hw },
    { x: car.x + c * hl + s * hw, y: car.y + s * hl - c * hw },
    { x: car.x - c * hl + s * hw, y: car.y - s * hl - c * hw },
    { x: car.x - c * hl - s * hw, y: car.y - s * hl + c * hw },
  ];
}

/** Drive one step. `throttle` -1..1, `steer` -1..1, `handbrake` boolean. */
export function driveCar(car, dt, throttle, steer, handbrake, city) {
  const spec = car.spec;
  if (throttle > 0) car.speed += spec.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= spec.accel * 1.6 * dt; // braking
    else car.speed = Math.max(-spec.reverse, car.speed + spec.accel * throttle * dt);
  }
  // Drag and rolling resistance.
  car.speed -= car.speed * (handbrake ? 0.9 : 0.35) * dt;
  car.speed = clamp(car.speed, -spec.reverse, spec.topSpeed);
  const speedFactor = clamp(Math.abs(car.speed) / 160, 0, 1);
  const grip = handbrake ? spec.grip * 0.35 : spec.grip;
  car.angle += steer * spec.turn * speedFactor * dt * (car.speed >= 0 ? 1 : -1);
  car.slide = clamp(car.slide + steer * speedFactor * (handbrake ? 3 : 0.6) * dt, -1, 1);
  car.slide -= car.slide * grip * dt;
  const moveAngle = car.angle + car.slide * 0.35;
  const nx = car.x + Math.cos(moveAngle) * car.speed * dt;
  const ny = car.y + Math.sin(moveAngle) * car.speed * dt;
  const radius = spec.length * 0.42;
  const hit = { crashed: false };
  const resolved = resolveCircle(city, nx, ny, radius);
  if (Math.abs(resolved.x - nx) > 0.5 || Math.abs(resolved.y - ny) > 0.5) {
    hit.crashed = Math.abs(car.speed) > 120;
    if (hit.crashed) {
      damageCar(car, Math.abs(car.speed) * 0.045);
      car.speed *= -0.25;
    } else {
      car.speed *= 0.5;
    }
  }
  car.x = resolved.x;
  car.y = resolved.y;
  // The burning fuse is counted down by the world's central loop, not here,
  // so parked and driven cars burn at the same rate.
  if (car.health < car.maxHealth * 0.35 && car.health > 0) car.smoke = 1;
  else if (car.health < car.maxHealth * 0.65) car.smoke = 0.5;
  else car.smoke = 0;
  return hit;
}

export function damageCar(car, amount) {
  if (car.dead) return false;
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    car.dead = true;
    car.burning = 2.2;
    return true;
  }
  return false;
}

/** Keep a parked car's nose on the road edge; used when spawning traffic. */
export function snapToRoad(x, y) {
  return { x, y };
}

/** Two cars overlap (circle test on their centres)? */
export function carsOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const min = (a.spec.length + b.spec.length) * 0.3;
  return dx * dx + dy * dy < min * min;
}

/** Push two overlapping cars apart and trade some speed; returns impact speed. */
export function separateCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const min = (a.spec.length + b.spec.length) * 0.3;
  const push = (min - d) / 2;
  if (push <= 0) return 0;
  const nx = dx / d;
  const ny = dy / d;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const impact = Math.abs(a.speed - b.speed);
  const avg = (a.speed + b.speed) / 2;
  a.speed = avg * 0.7;
  b.speed = avg * 0.7;
  return impact;
}

/** Steer a car toward a target point; returns {throttle, steer}. */
export function steerToward(car, tx, ty, topSpeed) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  const delta = ((want - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const steer = clamp(delta * 2.2, -1, 1);
  const dist = Math.hypot(tx - car.x, ty - car.y);
  let throttle = 1;
  if (Math.abs(delta) > 1.9) throttle = -0.6; // turn around
  else if (Math.abs(delta) > 0.9) throttle = 0.35;
  if (car.speed > (topSpeed || car.spec.topSpeed)) throttle = 0;
  if (dist < 30) throttle = 0.3;
  return { throttle, steer };
}

export function aimAngle(car, tx, ty) {
  return turnToward(car.angle, Math.atan2(ty - car.y, tx - car.x), 10);
}
