// The story: five missions for Cass Voss, back in Port Sable after two years
// away. Each mission is a list of steps — talk, go to, steal, deliver, timed
// run, clear the area — with typewriter dialogue between them. Completing one
// pays cash, unlocks the next, and autosaves; failing the timed run restarts
// that mission at the garage.

import { MISSION_REWARDS } from './config.js';
import { findClearSpot, faceAlongRoad } from './city.js';
import { createCar } from './vehicles.js';
import { spawnEnemy, spawnPickup } from './combat.js';
import { addHeat, clearWanted } from './police.js';
import { giveAmmo } from './player.js';

export const STORY = [
  {
    title: 'Back in Port Sable',
    intro: [
      { who: 'ODETTE', text: 'Cass Voss. Two years gone and you walk in like the tide never went out.' },
      { who: 'CASS', text: 'Missed the sun, Odette. And your terrible coffee.' },
      { who: 'ODETTE', text: 'Sun is free. Coffee costs. Go up to the lookout and tell me what you see at the docks.' },
    ],
    steps: [
      { type: 'talk', npc: 'odette', lines: [{ who: 'ODETTE', text: 'Lookout Point, north end. Eyes open, mouth shut. Crowe owns the docks now.' }] },
      { type: 'goto', place: 'lookout', radius: 70, lines: [{ who: 'CASS', text: 'Crates moving at midnight, no manifests... Crowe is running something big through the harbor.' }] },
    ],
  },
  {
    title: 'Borrowed Wheels',
    intro: [
      { who: 'ODETTE', text: 'A Vento Coupe is sitting in the Marina Lot with the keys in it. Practically begging.' },
      { who: 'CASS', text: 'Borrowed, not stolen. I like the way you think.' },
      { who: 'ODETTE', text: 'Bring it to my garage in one piece. The cops will notice. They always do.' },
    ],
    steps: [
      { type: 'steal', place: 'marina' },
      { type: 'deliver', place: 'garageDoor', radius: 80, lines: [{ who: 'ODETTE', text: 'Beautiful. Crowe will miss this one. Now we have wheels and a problem.' }] },
    ],
  },
  {
    title: 'Run the Clock',
    intro: [
      { who: 'ODETTE', text: 'A package is waiting at the Sandy Anchor. It needs to be at the North Drop in 75 seconds. No questions.' },
      { who: 'CASS', text: 'Seventy-five seconds across town? I hope you like my driving.' },
      { who: 'ODETTE', text: 'I like you alive. Grab a fast car first.' },
    ],
    steps: [
      { type: 'pickup', place: 'beachBar', radius: 60, lines: [{ who: 'CASS', text: 'Got it. Small box, heavy promise. Clock is running.' }] },
      { type: 'timed', place: 'dropNorth', radius: 70, seconds: 75, lines: [{ who: 'ODETTE', text: 'Delivered with seconds to spare. You still drive like the devil owes you money.' }] },
    ],
  },
  {
    title: 'Harbor Heat',
    intro: [
      { who: 'ODETTE', text: 'Crowe sent his goons to lean on the dock workers. The docks are ours, Cass. Remind them.' },
      { who: 'CASS', text: 'Time to knock on some doors.' },
      { who: 'ODETTE', text: 'Take the SMG from my back room. And Cass — come back breathing.' },
    ],
    steps: [
      { type: 'clear', place: 'docks', radius: 320, count: 5, lines: [{ who: 'CASS', text: 'Docks are clear. Crowe just lost his muscle.' }] },
    ],
  },
  {
    title: "Crowe's Fall",
    intro: [
      { who: 'ODETTE', text: 'This is it. Crowe is at the warehouse with what is left of his crew.' },
      { who: 'CASS', text: 'Two years I waited for this. Port Sable is done paying his toll.' },
      { who: 'ODETTE', text: 'Finish it, Cass. The whole city is watching.' },
    ],
    steps: [
      { type: 'boss', place: 'warehouse', radius: 340, count: 4, lines: [{ who: 'CASS', text: 'It is over, Silas. Port Sable belongs to the people who live here.' }] },
    ],
  },
];

export function createMissionState() {
  return {
    index: 0,
    stepIndex: 0,
    active: false,
    done: false,
    failed: false,
    timer: 0,
    spawned: false,
    targetCar: null,
    banner: 0,
    bannerText: '',
  };
}

/** Open a typewriter dialogue box; the world pauses while it is open. */
export function openDialogue(world, lines, after) {
  world.dialogue = { lines, index: 0, shown: 0, after: after || null };
}

/** Advance the dialogue: finish the line, then the next, then close. */
export function advanceDialogue(world) {
  const d = world.dialogue;
  if (!d) return;
  const line = d.lines[d.index];
  if (d.shown < line.text.length) {
    d.shown = line.text.length;
    return;
  }
  d.index += 1;
  d.shown = 0;
  if (d.index >= d.lines.length) {
    const after = d.after;
    world.dialogue = null;
    if (after) after();
  }
}

export function typeDialogue(world, dt) {
  const d = world.dialogue;
  if (!d) return;
  const line = d.lines[d.index];
  d.shown = Math.min(line.text.length, d.shown + dt * 42);
}

/** The current objective text for the HUD. */
export function objectiveText(world) {
  const m = world.mission;
  if (!m.active) {
    if (m.done) return 'Story complete — Port Sable is yours. Free roam.';
    return 'Go to the garage and talk to Odette.';
  }
  const def = STORY[m.index];
  const step = def.steps[m.stepIndex];
  if (!step) return def.title;
  switch (step.type) {
    case 'talk': return `${def.title}: Talk to Odette at the garage`;
    case 'goto': return `${def.title}: Go to ${world.city.places[step.place].name}`;
    case 'steal': return `${def.title}: Steal the Vento Coupe at the Marina Lot`;
    case 'deliver': return `${def.title}: Deliver the coupe to the garage`;
    case 'pickup': return `${def.title}: Pick up the package at the Sandy Anchor`;
    case 'timed': return `${def.title}: Reach the North Drop — ${Math.max(0, Math.ceil(m.timer))}s left`;
    case 'clear': return `${def.title}: Clear the goons at the docks (${aliveEnemies(world)} left)`;
    case 'boss': return `${def.title}: Defeat Silas Crowe`;
    default: return def.title;
  }
}

export function aliveEnemies(world) {
  return world.combat.enemies.filter((e) => !e.dead).length;
}

/** The world position the marker and arrow should point at, or null. */
export function missionMarker(world) {
  const m = world.mission;
  if (!m.active) {
    if (m.done) return null;
    const g = world.city.places.garage;
    return { x: g.x, y: g.y, label: 'Odette' };
  }
  const def = STORY[m.index];
  const step = def.steps[m.stepIndex];
  if (!step) return null;
  if (step.type === 'steal' && m.targetCar) return { x: m.targetCar.x, y: m.targetCar.y, label: 'Coupe' };
  if (step.type === 'clear' || step.type === 'boss') {
    const alive = world.combat.enemies.filter((e) => !e.dead);
    if (alive.length > 0) return { x: alive[0].x, y: alive[0].y, label: 'Target' };
  }
  const place = world.city.places[step.place];
  if (place) return { x: place.x, y: place.y, label: place.name };
  return null;
}

function currentStep(world) {
  const m = world.mission;
  return STORY[m.index].steps[m.stepIndex];
}

function advanceStep(world) {
  const m = world.mission;
  const step = currentStep(world);
  m.stepIndex += 1;
  m.spawned = false;
  const def = STORY[m.index];
  if (m.stepIndex >= def.steps.length) {
    completeMission(world);
    return;
  }
  const next = currentStep(world);
  if (step.lines) openDialogue(world, step.lines, () => beginStep(world, next));
  else beginStep(world, next);
}

function beginStep(world, step) {
  const m = world.mission;
  if (step.type === 'steal') {
    const place = world.city.places[step.place];
    const spot = findClearSpot(world.city, place.x, place.y, 26);
    const car = createCar('coupe', spot.x, spot.y, faceAlongRoad(world.city, world.cars, spot.x, spot.y), '#b3312f');
    world.cars.push(car);
    m.targetCar = car;
  }
  if (step.type === 'timed') m.timer = step.seconds;
  if (step.type === 'clear' || step.type === 'boss') m.spawned = false;
}

function completeMission(world) {
  const m = world.mission;
  const reward = MISSION_REWARDS[m.index];
  world.player.cash += reward;
  world.audio.play('mission');
  m.banner = 3.2;
  m.bannerText = `Mission complete — $${reward}`;
  m.active = false;
  m.index += 1;
  m.stepIndex = 0;
  if (m.index === 3) {
    giveAmmo(world.player, 'smg', 180);
    world.player.weapons.smg = true;
  }
  if (m.index >= STORY.length) {
    m.done = true;
    m.bannerText = 'Story complete — Port Sable is yours!';
    m.banner = 5;
  }
  world.saveRequested = true;
}

export function failMission(world, reason) {
  const m = world.mission;
  m.failed = true;
  m.active = false;
  m.banner = 3.2;
  m.bannerText = reason || 'Mission failed';
  clearWanted(world.police);
  // Restart the mission at the garage on the next talk with Odette.
  m.stepIndex = 0;
  m.spawned = false;
  m.targetCar = null;
  world.combat.enemies = [];
}

/** Start the next mission (called when talking to Odette). */
export function startMission(world) {
  const m = world.mission;
  if (m.active || m.done) return;
  m.active = true;
  m.failed = false;
  m.stepIndex = 0;
  m.spawned = false;
  const def = STORY[m.index];
  openDialogue(world, def.intro, () => beginStep(world, def.steps[0]));
}

function spawnStepEnemies(world, step) {
  const m = world.mission;
  const place = world.city.places[step.place];
  const random = world.random;
  for (let i = 0; i < step.count; i += 1) {
    const a = random() * Math.PI * 2;
    const d = 60 + random() * 180;
    spawnEnemy(world.combat, place.x + Math.cos(a) * d, place.y + Math.sin(a) * d, {});
  }
  if (step.type === 'boss') {
    spawnEnemy(world.combat, place.x, place.y, { health: 220, speed: 185, damage: 12, boss: true, name: 'Silas Crowe', color: '#2b2b33' });
  }
  m.spawned = true;
}

/** Check the active step's objective; called every step while playing. */
export function updateMission(world, dt) {
  const m = world.mission;
  if (m.banner > 0) m.banner -= dt;
  if (!m.active) return;
  const step = currentStep(world);
  if (!step) return;
  const p = world.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;

  switch (step.type) {
    case 'talk':
      // Completed by the interact handler in world.js.
      break;
    case 'goto': {
      const place = world.city.places[step.place];
      if (Math.hypot(place.x - px, place.y - py) < (step.radius || 60)) advanceStep(world);
      break;
    }
    case 'steal': {
      if (p.car === m.targetCar) {
        addHeat(world.police, 16);
        advanceStep(world);
      }
      break;
    }
    case 'deliver': {
      const place = world.city.places[step.place];
      if (p.car === m.targetCar && Math.hypot(place.x - px, place.y - py) < (step.radius || 70)) {
        advanceStep(world);
      }
      break;
    }
    case 'pickup': {
      // Completed by the interact handler in world.js.
      break;
    }
    case 'timed': {
      m.timer -= dt;
      const place = world.city.places[step.place];
      if (Math.hypot(place.x - px, place.y - py) < (step.radius || 60)) {
        advanceStep(world);
      } else if (m.timer <= 0) {
        failMission(world, 'Too slow — the deal fell through');
      }
      break;
    }
    case 'clear':
    case 'boss': {
      const place = world.city.places[step.place];
      if (!m.spawned && Math.hypot(place.x - px, place.y - py) < (step.radius || 300)) {
        spawnStepEnemies(world, step);
      }
      if (m.spawned && aliveEnemies(world) === 0) advanceStep(world);
      break;
    }
    default:
      break;
  }
}

/** Handle the interact key for mission steps that need a press. */
export function missionInteract(world) {
  const m = world.mission;
  const p = world.player;
  if (p.car) return false;
  // Talking to Odette starts missions or advances the talk step.
  const g = world.city.places.garage;
  if (Math.hypot(g.x - p.x, g.y - p.y) < 70) {
    if (!m.active && !m.done) {
      startMission(world);
      return true;
    }
    if (m.active && currentStep(world).type === 'talk') {
      advanceStep(world);
      return true;
    }
  }
  if (m.active && currentStep(world).type === 'pickup') {
    const step = currentStep(world);
    const place = world.city.places[step.place];
    if (Math.hypot(place.x - p.x, place.y - p.y) < (step.radius || 60)) {
      addHeat(world.police, 30);
      advanceStep(world);
      return true;
    }
  }
  return false;
}

/** Scatter starting pickups around the city. */
export function placePickups(world) {
  const c = world.combat;
  const pl = world.city.places;
  spawnPickup(c, pl.garage.x - 40, pl.garage.y + 40, 'health', 50);
  spawnPickup(c, pl.beachBar.x + 50, pl.beachBar.y - 30, 'armor', 50);
  spawnPickup(c, pl.lookout.x + 40, pl.lookout.y + 40, 'ammo', 48);
  spawnPickup(c, pl.marina.x - 60, pl.marina.y + 30, 'health', 50);
  spawnPickup(c, pl.docks.x - 80, pl.docks.y + 60, 'ammo', 48);
  spawnPickup(c, 700, 700, 'cash', 60);
  spawnPickup(c, 2200, 2300, 'cash', 60);
  spawnPickup(c, 1500, 2600, 'armor', 50);
}
