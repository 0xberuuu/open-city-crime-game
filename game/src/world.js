// The world: one state object holding the city, the player, cars, police,
// combat and the story, and the single step function that advances it all.
// Combat crimes raise heat; cars that burn out explode; the camera follows
// the player; the mission marker and Odette's callout are derived each step.

import { STEP, WORLD, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { createCity, resolveCircle, findClearSpot, faceAlongRoad } from './city.js';
import { createPlayer, walkPlayer, aimPlayer, hurtPlayer, regenPlayer, exitCar, enterCar, nearestCar, spendShot, canFire, currentWeapon, healPlayer, giveArmor, giveAmmo, cycleWeapon } from './player.js';
import { driveCar, damageCar, separateCars, carsOverlap, createCar } from './vehicles.js';
import { createTraffic, createPedestrians, stepTraffic, stepPedestrians, knockPed } from './traffic.js';
import { createPolice, stepPolice, addHeat, clearWanted, policeSeePlayer } from './police.js';
import { createCombat, fireBullet, stepBullets, stepEnemies, stepPickups, meleeSwing, spawnPickup } from './combat.js';
import { createEffects, stepEffects, explosion, smokePuff, addSkid, addFloat, sparkBurst } from './effects.js';
import { createMissionState, updateMission, missionInteract, missionMarker, placePickups, openDialogue, advanceDialogue, typeDialogue } from './missions.js';
import { createAudio } from './audio.js';
import { VIEW } from './render.js';

export function createWorld(seed) {
  const city = createCity(seed);
  const random = createRandom(seed ^ 0x9e37);
  const garage = city.places.garage;
  const player = createPlayer(garage.x - 30, garage.y - 40);
  const world = {
    seed,
    city,
    random,
    time: 0,
    player,
    cars: [],
    peds: createPedestrians(city, seed),
    police: createPolice(),
    combat: createCombat(),
    fx: createEffects(),
    mission: createMissionState(),
    audio: createAudio(),
    camera: { x: 0, y: 0 },
    dialogue: null,
    marker: null,
    showOdetteMark: true,
    saveRequested: false,
    scare: null,
    odette: { x: garage.x, y: garage.y, angle: Math.PI / 2 },
    minimap: null,
    wasted: false,
    busted: false,
    cashLost: 0,
    engineSound: 0,
  };
  // Traffic cars, plus a few parked cars near the garage and the marina.
  // Each parked car is nudged to a clear spot so none spawns in a building.
  world.cars = createTraffic(city, seed);
  const parkedAt = [
    ['sedan', garage.x + 90, garage.y + 30, '#7d8aa0'],
    ['van', garage.x + 90, garage.y + 90, '#e6e2d8'],
    ['coupe', city.places.marina.x + 60, city.places.marina.y - 40, '#2f6fb3'],
    ['sedan', city.places.beachBar.x - 80, city.places.beachBar.y + 20, '#a03d3d'],
    ['taxi', 1000, 1000, '#e8b93c'],
  ];
  for (const [type, x, y, color] of parkedAt) {
    const spot = findClearSpot(city, x, y, 26);
    world.cars.push(createCar(type, spot.x, spot.y, faceAlongRoad(city, world.cars, spot.x, spot.y), color));
  }
  placePickups(world);
  return world;
}

/** Reset the world to a fresh run with the same seed. */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.minimap = world.minimap;
  fresh.audio = world.audio;
  Object.assign(world, fresh);
}

function updateCamera(world, dt) {
  const p = world.player;
  const focus = p.car || p;
  const tx = focus.x - VIEW.width / 2;
  const ty = focus.y - VIEW.height / 2;
  const k = 1 - Math.pow(0.001, dt);
  world.camera.x += (tx - world.camera.x) * k;
  world.camera.y += (ty - world.camera.y) * k;
  world.camera.x = Math.max(0, Math.min(WORLD.width - VIEW.width, world.camera.x));
  world.camera.y = Math.max(0, Math.min(WORLD.height - VIEW.height, world.camera.y));
}

function explodeCar(world, car) {
  if (car.exploded) return;
  car.exploded = true;
  explosion(world.fx, car.x, car.y);
  world.audio.play('explosion');
  const p = world.player;
  const pd = Math.hypot(p.x - car.x, p.y - car.y);
  if (pd < 130 && !p.dead) hurtPlayer(p, 45);
  for (const e of world.combat.enemies) {
    if (!e.dead && Math.hypot(e.x - car.x, e.y - car.y) < 130) e.health = 0;
  }
  for (const ped of world.peds) {
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 110) knockPed(ped);
  }
  addHeat(world.police, 6);
  world.scare = { x: car.x, y: car.y };
}

/**
 * One fixed step. `input` carries axes, aim, firing and one-shot actions.
 * Returns an event string ('wasted' | 'busted') when the run ends, else null.
 */
export function stepWorld(world, input, dt) {
  const p = world.player;
  world.time += dt;
  if (world.dialogue) {
    typeDialogue(world, dt);
    return null;
  }

  // One-shot actions.
  const actions = input.takeActions();
  if (actions & 4) { // interact
    if (!missionInteract(world)) {
      if (p.car) {
        exitCar(p, world.city);
        world.audio.play('click');
      } else {
        const car = nearestCar(p, world.cars, 56);
        if (car) {
          const jacked = enterCar(p, car);
          world.audio.play('click');
          if (jacked) {
            addHeat(world.police, 12);
            addFloat(world.fx, p.x, p.y - 30, 'Car jacked!', '#ff5a3c');
          }
        }
      }
    }
  }
  if (actions & 8) { // weapon switch
    cycleWeapon(p);
    world.audio.play('click');
  }

  // Aim.
  const mouse = input.mouse();
  const wx = mouse.x + world.camera.x;
  const wy = mouse.y + world.camera.y;
  if (!p.car) aimPlayer(p, wx, wy);
  else p.angle = p.car.angle;

  // Movement.
  const axes = input.axes();
  if (p.car) {
    const car = p.car;
    const throttle = -axes.y;
    const steer = axes.x;
    const handbrake = input.handbrake();
    const hit = driveCar(car, dt, throttle, steer, handbrake, world.city);
    if (hit.crashed) {
      world.audio.play('crash');
      sparkBurst(world.fx, car.x, car.y);
      addHeat(world.police, 2);
    }
    if (handbrake && Math.abs(car.speed) > 200 && Math.random() < 0.5) {
      addSkid(world.fx, car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20, car.angle);
    }
    if (car.smoke > 0 && Math.random() < car.smoke * 0.4) {
      smokePuff(world.fx, car.x + Math.cos(car.angle) * 26, car.y + Math.sin(car.angle) * 26, car.smoke > 0.7);
    }
    if (car.burning > 0 && car.dead) {
      // The fuse burns in the central loop below; the blast comes from there.
    }
    p.x = car.x;
    p.y = car.y;
    world.engineSound = Math.abs(car.speed) / car.spec.topSpeed;
    // Running over pedestrians is a crime.
    for (const ped of world.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 30 && Math.abs(car.speed) > 120) {
        knockPed(ped);
        addHeat(world.police, 14);
        addFloat(world.fx, ped.x, ped.y - 24, 'Pedestrian down!', '#ff5a3c');
        world.scare = { x: ped.x, y: ped.y };
      }
    }
  } else {
    walkPlayer(p, dt, axes, input.running(), world.city);
    world.engineSound = 0;
    // Firing on foot.
    if (input.isFiring() && canFire(p)) {
      const weapon = p.weapon;
      if (spendShot(p)) {
        if (weapon === 'fists') {
          meleeSwing(world.combat, world.fx, p, world.peds, (e) => {
            addFloat(world.fx, e.x, e.y - 24, '+$20', '#f2c94c');
            p.cash += 20;
          });
          world.audio.play('punch');
        } else {
          fireBullet(world.combat, world.fx, p.x, p.y, p.angle, weapon, true, 1);
          world.audio.play('shot');
          addHeat(world.police, 4);
          world.scare = { x: p.x, y: p.y };
        }
      }
    }
  }
  regenPlayer(p, dt);

  // Traffic and pedestrians.
  stepTraffic(world.cars, world.cars, dt, world.city, world.random, (car) => world.audio.play('honk'));
  stepPedestrians(world.peds, dt, world.city, world.random, world.scare);
  if (world.scare) world.scare = null;

  // Car-vs-car collisions.
  for (let i = 0; i < world.cars.length; i += 1) {
    for (let j = i + 1; j < world.cars.length; j += 1) {
      const a = world.cars[i];
      const b = world.cars[j];
      if (a.dead || b.dead) continue;
      if (carsOverlap(a, b)) {
        const impact = separateCars(a, b);
        if (impact > 140) {
          damageCar(a, impact * 0.03);
          damageCar(b, impact * 0.03);
          sparkBurst(world.fx, (a.x + b.x) / 2, (a.y + b.y) / 2);
          if (a.driver === 'player' || b.driver === 'player') {
            world.audio.play('crash');
            addHeat(world.police, 3);
          }
        }
      }
    }
  }
  // Burning cars explode when the fuse runs out (explodeCar guards repeats).
  for (const car of world.cars) {
    if (car.dead && !car.exploded && car.burning > 0) {
      car.burning -= dt;
      if (Math.random() < 0.5) smokePuff(world.fx, car.x, car.y, true);
      if (car.burning <= 0) explodeCar(world, car);
    }
  }

  // Combat.
  stepBullets(
    world.combat, world.fx, dt, world.city, world.cars, p,
    (damage) => {
      if (p.car) {
        damageCar(p.car, damage * 0.6);
      } else {
        hurtPlayer(p, damage);
      }
    },
    (e) => {
      p.cash += e.boss ? 200 : 20;
      addFloat(world.fx, e.x, e.y - 24, e.boss ? '+$200' : '+$20', '#f2c94c');
      if (Math.random() < 0.4) spawnPickup(world.combat, e.x, e.y, 'cash', 25);
    },
    (car) => {
      // A bullet-killed car burns on its fuse; the central loop detonates it.
      smokePuff(world.fx, car.x, car.y, true);
    },
  );
  stepEnemies(world.combat, world.fx, dt, world.city, p, world.random);
  stepPickups(world.combat, dt, p, (pickup) => {
    if (pickup.kind === 'health') {
      healPlayer(p, pickup.amount);
      addFloat(world.fx, p.x, p.y - 30, `+${pickup.amount} HP`, '#5ec95a');
    } else if (pickup.kind === 'armor') {
      giveArmor(p, pickup.amount);
      addFloat(world.fx, p.x, p.y - 30, `+${pickup.amount} Armor`, '#5aa8d8');
    } else if (pickup.kind === 'ammo') {
      giveAmmo(p, 'pistol', pickup.amount);
      giveAmmo(p, 'smg', pickup.amount);
      addFloat(world.fx, p.x, p.y - 30, `+${pickup.amount} Ammo`, '#f2c94c');
    } else {
      p.cash += pickup.amount;
      addFloat(world.fx, p.x, p.y - 30, `+$${pickup.amount}`, '#f2c94c');
    }
    world.audio.play('pickup');
  });

  // Police.
  const result = stepPolice(world.police, dt, world.city, p, world.cars, world.random, () => {});
  if (result === 'busted' && !p.dead) {
    world.busted = true;
    world.cashLost = Math.min(p.cash, 100);
    p.cash -= world.cashLost;
    return 'busted';
  }

  // Missions and effects.
  updateMission(world, dt);
  stepEffects(world.fx, dt);
  updateCamera(world, dt);
  world.marker = missionMarker(world);
  world.showOdetteMark = !world.mission.active && !world.mission.done;

  // Audio beds.
  world.audio.engine(world.engineSound);
  world.audio.siren(world.police.stars, world.time);
  world.audio.music(dt, true);

  if (p.dead && !world.wasted) {
    world.wasted = true;
    world.cashLost = Math.floor(p.cash / 2);
    p.cash -= world.cashLost;
    world.audio.play('wasted');
    return 'wasted';
  }
  return null;
}

/** Respawn at the garage after wasted/busted, with heat cleared. */
export function respawn(world) {
  const p = world.player;
  const g = world.city.places.garage;
  if (p.car) {
    p.car.driver = null;
    p.car = null;
  }
  p.x = g.x - 30;
  p.y = g.y - 40;
  p.health = PLAYER.maxHealth;
  p.armor = 0;
  p.dead = false;
  p.busted = false;
  world.wasted = false;
  world.busted = false;
  clearWanted(world.police);
  world.combat.enemies = [];
  world.combat.bullets = [];
  world.camera.x = Math.max(0, Math.min(WORLD.width - VIEW.width, p.x - VIEW.width / 2));
  world.camera.y = Math.max(0, Math.min(WORLD.height - VIEW.height, p.y - VIEW.height / 2));
  // A failed timed mission restarts from the talk; other progress stands.
  if (world.mission.failed) world.mission.failed = false;
}

export { STEP, openDialogue, advanceDialogue, policeSeePlayer, resolveCircle };
