// The screenshot scenes behind ?shot=chase|drive|foot|mission. Each one sets
// up a real situation — a police chase, a city drive, a walk on the beach, a
// dockside firefight — then plays the actual simulation forward for a fixed
// number of steps with scripted inputs, so the frame is what playing the game
// really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { createCar } from './vehicles.js';
import { enterCar } from './player.js';
import { addHeat } from './police.js';
import { spawnEnemy } from './combat.js';
import { stepWorld } from './world.js';
import { SCREEN_PLAY } from './hud.js';

/** A scripted input stand-in with the same shape as the real one. */
function scriptedInput(world) {
  const state = {
    axes: { x: 0, y: 0 },
    firing: false,
    aim: null,
    handbrake: false,
  };
  return {
    state,
    takeActions() { return 0; },
    mouse() {
      if (state.aim) return { x: state.aim.x - world.camera.x, y: state.aim.y - world.camera.y };
      return { x: 900, y: 300 };
    },
    isFiring() { return state.firing; },
    axes() { return state.axes; },
    running() { return false; },
    handbrake() { return state.handbrake; },
  };
}

function runSteps(world, input, seconds, perStep) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (perStep) perStep(i, steps);
    stepWorld(world, input, STEP);
  }
}

function putPlayerInCar(world, type, x, y, angle, color) {
  const car = createCar(type, x, y, angle, color);
  world.cars.push(car);
  enterCar(world.player, car);
  car.speed = 240;
  return car;
}

/** Clear parked and traffic cars out of a rectangle, so a staged drive is clean. */
function clearCorridor(world, x0, y0, x1, y1) {
  world.cars = world.cars.filter((c) => c.driver === 'player' || c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1);
}

/** Chase: 3 stars, two cruisers on the player's tail, timed delivery running. */
function stageChase(world, input) {
  const p = world.player;
  clearCorridor(world, 1100, 880, 2600, 1120);
  const car = putPlayerInCar(world, 'coupe', 1400, 1000, 0, '#b3312f');
  car.speed = 400;
  addHeat(world.police, 55);
  world.police.spawnCooldown = 99;
  // Two cruisers right behind on the same street centreline, already pursuing.
  for (const offset of [120, 210]) {
    const cruiser = createCar('police', 1400 - offset, 1000, 0, '#1d2733');
    cruiser.driver = 'police';
    cruiser.speed = 400;
    world.police.cruisers.push(cruiser);
    world.cars.push(cruiser);
  }
  world.mission.active = true;
  world.mission.index = 2;
  world.mission.stepIndex = 1;
  world.mission.timer = 42;
  input.state.axes = { x: 0, y: -1 };
  runSteps(world, input, 0.9);
  return { screen: SCREEN_PLAY };
}

/** Drive: cruising south past the park with traffic, pedestrians and an objective. */
function stageDrive(world, input) {
  clearCorridor(world, 520, 1200, 700, 2100);
  const car = putPlayerInCar(world, 'sedan', 600, 1300, Math.PI / 2, '#c94f4f');
  car.speed = 300;
  world.mission.active = true;
  world.mission.index = 0;
  world.mission.stepIndex = 1;
  input.state.axes = { x: 0, y: -1 };
  runSteps(world, input, 1.4);
  return { screen: SCREEN_PLAY };
}

/** Foot: Cass on the beach promenade — palms, sea, pedestrians, parked cars. */
function stageFoot(world, input) {
  const p = world.player;
  p.x = 1500;
  p.y = 3000;
  p.angle = Math.PI / 2;
  p.weapon = 'pistol';
  world.mission.done = true;
  world.mission.active = false;
  // A few pedestrians strolling the promenade near the player.
  for (let i = 0; i < 5; i += 1) {
    const ped = world.peds[i];
    ped.x = 1400 + i * 70;
    ped.y = 2970 + (i % 2) * 50;
    ped.target = { x: ped.x + 160, y: ped.y };
  }
  // Walk east along the promenade so the pose reads as motion.
  input.state.axes = { x: 1, y: 0 };
  runSteps(world, input, 1.2);
  return { screen: SCREEN_PLAY };
}

/** Mission: a firefight on the docks — goons, muzzle flash, marker overhead. */
function stageMission(world, input) {
  const p = world.player;
  const docks = world.city.places.docks;
  p.x = docks.x - 310;
  p.y = docks.y + 40;
  p.weapon = 'smg';
  p.weapons.smg = true;
  p.ammo.smg = 180;
  p.health = 86;
  p.armor = 40;
  world.mission.active = true;
  world.mission.index = 3;
  world.mission.stepIndex = 0;
  world.mission.spawned = true;
  const spots = [
    { x: docks.x - 160, y: docks.y - 70 },
    { x: docks.x - 90, y: docks.y + 90 },
    { x: docks.x - 130, y: docks.y + 170 },
    { x: docks.x - 40, y: docks.y - 40 },
  ];
  for (const spot of spots) spawnEnemy(world.combat, spot.x, spot.y, {});
  runSteps(world, input, 1.6, (i, total) => {
    // Aim at the nearest goon and fire through the last half-second.
    let best = null;
    let bd = Infinity;
    for (const e of world.combat.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) input.state.aim = { x: best.x, y: best.y };
    input.state.firing = i > total - 30;
  });
  return { screen: SCREEN_PLAY };
}

/**
 * Stage the named scene (chase, drive, foot or mission; any other name is
 * chase) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const input = scriptedInput(world);
  // Let the camera settle on the player before the scene starts.
  world.camera.x = Math.max(0, world.player.x - 640);
  world.camera.y = Math.max(0, world.player.y - 400);
  if (name === 'drive') return stageDrive(world, input);
  if (name === 'foot') return stageFoot(world, input);
  if (name === 'mission') return stageMission(world, input);
  return stageChase(world, input);
}
