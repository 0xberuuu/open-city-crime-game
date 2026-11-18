// Saving and loading: one slot in localStorage, written on mission complete,
// on pause-menu save, and at the safehouse garage. It keeps the story
// progress, cash, weapons, health and the player's spot — never anything the
// player did not earn in this browser.

import { SAVE_KEY } from './config.js';

export function saveGame(world) {
  const p = world.player;
  const data = {
    version: 1,
    missionIndex: world.mission.index,
    storyDone: world.mission.done,
    x: p.x,
    y: p.y,
    health: p.health,
    armor: p.armor,
    cash: p.cash,
    weapon: p.weapon,
    weapons: p.weapons,
    ammo: p.ammo,
    seed: world.city.seed,
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

/** Apply a loaded save to a fresh world. */
export function applySave(world, data) {
  const p = world.player;
  p.x = data.x;
  p.y = data.y;
  p.health = data.health;
  p.armor = data.armor;
  p.cash = data.cash;
  p.weapon = data.weapon;
  p.weapons = data.weapons;
  p.ammo = data.ammo;
  world.mission.index = data.missionIndex;
  world.mission.done = data.storyDone;
  world.mission.active = false;
}
