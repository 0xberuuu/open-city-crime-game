// The HUD and the menus: minimap with blips, wanted stars, health and armor,
// cash, weapon and ammo, speedometer, objective tracker, dialogue box,
// mission banners, and the title, pause, help, wasted and busted screens.

import { FONT, FONT_DISPLAY, PALETTE, POLICE, WORLD } from './config.js';
import { missionMarker, objectiveText } from './missions.js';
import { currentWeapon } from './player.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_HELP = 'help';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';

const MAP_SIZE = 184;

/** Pre-render the static minimap: roads, water, park and beach. */
export function createMinimap(city) {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d');
  const s = MAP_SIZE / WORLD.width;
  ctx.fillStyle = '#8a7a58';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  // Park blocks.
  ctx.fillStyle = '#5d8a46';
  ctx.fillRect(460 * s, 1240 * s, 720 * s, 720 * s);
  // Beach and sea.
  ctx.fillStyle = '#e3d3a1';
  ctx.fillRect(0, 3052 * s, MAP_SIZE, 80 * s);
  ctx.fillStyle = '#3f8fb5';
  ctx.fillRect(0, 3130 * s, MAP_SIZE, 70 * s);
  ctx.fillRect(3120 * s, 0, 80 * s, 3130 * s);
  // Roads.
  ctx.strokeStyle = '#4a4a52';
  ctx.lineWidth = 104 * s + 1;
  for (let i = 0; i < 8; i += 1) {
    const v = (200 + i * 400) * s;
    ctx.beginPath();
    ctx.moveTo(v, 0);
    ctx.lineTo(v, MAP_SIZE);
    ctx.moveTo(0, v);
    ctx.lineTo(MAP_SIZE, v);
    ctx.stroke();
  }
  // Buildings.
  ctx.fillStyle = 'rgba(220, 205, 170, 0.85)';
  for (const b of city.buildings) {
    ctx.fillRect(b.x * s, b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
  }
  return canvas;
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(16, 18, 24, ${alpha ?? 0.72})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function bar(ctx, x, y, w, h, frac, color, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w * Math.max(0, Math.min(1, frac)), h, 4);
    ctx.fill();
  }
}

function star(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.gold : 'rgba(255,255,255,0.25)';
  ctx.fill();
}

export function drawMinimap(ctx, world, x, y) {
  const s = MAP_SIZE / WORLD.width;
  panel(ctx, x - 6, y - 6, MAP_SIZE + 12, MAP_SIZE + 12, 0.55);
  ctx.drawImage(world.minimap, x, y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, MAP_SIZE, MAP_SIZE);
  ctx.clip();
  // Mission marker.
  const marker = missionMarker(world);
  if (marker) {
    const pulse = 5 + Math.sin(world.time * 4) * 1.5;
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(x + marker.x * s, y + marker.y * s, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police.
  ctx.fillStyle = '#5a8cff';
  for (const car of world.police.cruisers) {
    ctx.fillRect(x + car.x * s - 2, y + car.y * s - 2, 4, 4);
  }
  for (const o of world.police.officers) {
    ctx.fillRect(x + o.x * s - 2, y + o.y * s - 2, 4, 4);
  }
  // Enemies.
  ctx.fillStyle = '#ff3b30';
  for (const e of world.combat.enemies) {
    if (!e.dead) ctx.fillRect(x + e.x * s - 2, y + e.y * s - 2, 4, 4);
  }
  // Player arrow.
  const p = world.player;
  const px = x + p.x * s;
  const py = y + p.y * s;
  ctx.translate(px, py);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawStars(ctx, world, x, y) {
  for (let i = 0; i < POLICE.maxStars; i += 1) {
    star(ctx, x + i * 24, y, 10, i < world.police.stars);
  }
}

function drawDialogue(ctx, world, w, h) {
  const d = world.dialogue;
  if (!d) return;
  const line = d.lines[d.index];
  const bw = Math.min(720, w - 80);
  const bx = (w - bw) / 2;
  const by = h - 158;
  panel(ctx, bx, by, bw, 104, 0.85);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(line.who, bx + 20, by + 28);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `17px ${FONT}`;
  const shown = line.text.slice(0, Math.floor(d.shown));
  wrapText(ctx, shown, bx + 20, by + 54, bw - 40, 23);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('E / click ▸', bx + bw - 16, by + 92);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

/** Arrow at the screen edge pointing at an off-screen marker. */
function drawMarkerArrow(ctx, world, view) {
  const marker = missionMarker(world);
  if (!marker) return;
  const cam = world.camera;
  const sx = marker.x - cam.x;
  const sy = marker.y - cam.y;
  if (sx > 40 && sx < view.width - 40 && sy > 40 && sy < view.height - 40) return;
  const cx = view.width / 2;
  const cy = view.height / 2;
  const angle = Math.atan2(sy - cy, sx - cx);
  const rx = cx + Math.cos(angle) * (Math.min(view.width, view.height) / 2 - 70);
  const ry = cy + Math.sin(angle) * (Math.min(view.width, view.height) / 2 - 70);
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(angle);
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Distance readout under the arrow.
  const p = world.player;
  const dist = Math.round(Math.hypot(marker.x - p.x, marker.y - p.y));
  ctx.fillStyle = '#fff';
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${dist}m`, rx, ry + 28);
  ctx.textAlign = 'left';
}

export function drawHud(ctx, world, view) {
  const { width: w, height: h } = view;
  const p = world.player;
  // Cash, top-left.
  panel(ctx, 14, 14, 150, 40, 0.72);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${Math.floor(p.cash)}`, 28, 42);
  // Minimap + stars, top-right.
  drawMinimap(ctx, world, w - MAP_SIZE - 20, 20);
  drawStars(ctx, world, w - MAP_SIZE - 8, MAP_SIZE + 40);
  // Objective, top-centre.
  const obj = objectiveText(world);
  ctx.font = `600 16px ${FONT}`;
  const ow = ctx.measureText(obj).width + 36;
  panel(ctx, (w - ow) / 2, 14, ow, 34, 0.72);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'center';
  ctx.fillText(obj, w / 2, 36);
  ctx.textAlign = 'left';
  // Health + armor, bottom-left.
  panel(ctx, 14, h - 84, 240, 70, 0.72);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('CASS VOSS', 28, h - 62);
  bar(ctx, 28, h - 52, 212, 12, p.health / 100, '#5ec95a');
  bar(ctx, 28, h - 32, 212, 8, p.armor / 100, '#5aa8d8');
  // Weapon + ammo, bottom-right.
  const weapon = currentWeapon(p);
  panel(ctx, w - 214, h - 84, 200, 70, 0.72);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(weapon.name, w - 200, h - 56);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  const ammoText = p.weapon === 'fists' ? '∞' : `${p.ammo[p.weapon]} rounds`;
  ctx.fillText(ammoText, w - 200, h - 32);
  ctx.fillText('Q: switch', w - 96, h - 32);
  // Speedometer while driving.
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.24);
    panel(ctx, w - 214, h - 148, 200, 52, 0.72);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, w - 66, h - 114);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('km/h', w - 28, h - 114);
    ctx.textAlign = 'left';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(p.car.spec.name, w - 200, h - 114);
  }
  // Arrest meter.
  if (world.police.arrestProgress > 0) {
    const aw = 260;
    panel(ctx, (w - aw) / 2, h - 200, aw, 40, 0.8);
    ctx.fillStyle = '#ff5a3c';
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ARREST IN PROGRESS — RUN!', w / 2, h - 184);
    bar(ctx, (w - aw) / 2 + 16, h - 176, aw - 32, 8, world.police.arrestProgress, '#ff5a3c');
    ctx.textAlign = 'left';
  }
  // Mission banner.
  if (world.mission.banner > 0) {
    const alpha = Math.min(1, world.mission.banner);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `700 34px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(world.mission.bannerText, w / 2, 120);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  // Damage flash.
  if (p.hurtTimer > 0) {
    ctx.fillStyle = `rgba(200, 30, 20, ${p.hurtTimer * 0.55})`;
    ctx.fillRect(0, 0, w, h);
  }
  // Low health pulse.
  if (p.health < 30 && !p.dead) {
    const pulse = 0.08 + Math.sin(world.time * 5) * 0.05;
    ctx.fillStyle = `rgba(200, 30, 20, ${pulse})`;
    ctx.fillRect(0, 0, w, h);
  }
  drawMarkerArrow(ctx, world, view);
  drawDialogue(ctx, world, w, h);
  // Controls hint, early on.
  if (world.time < 14 && !world.dialogue) {
    ctx.fillStyle = 'rgba(245,240,224,0.85)';
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WASD move / drive · Mouse aim · Click shoot · E enter car / talk · Q weapon · Space handbrake · Esc pause', w / 2, h - 100);
    ctx.textAlign = 'left';
  }
}

function bigTitle(ctx, w, y, text, size, color) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.fillText(text, w / 2, y);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, world, view, hasSaveGame) {
  const { width: w, height: h } = view;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(20, 16, 10, 0.25)');
  grad.addColorStop(0.6, 'rgba(20, 16, 10, 0.55)');
  grad.addColorStop(1, 'rgba(20, 16, 10, 0.82)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  bigTitle(ctx, w, 170, 'PORT SABLE', 84, '#f5edd2');
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `600 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('An open-world crime story', w / 2, 208);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `17px ${FONT}`;
  ctx.fillText('Cass Voss is back. The docks belong to Silas Crowe. Take the city back.', w / 2, 248);
  const options = hasSaveGame
    ? ['ENTER — New game', 'C — Continue story', 'H — How to play']
    : ['ENTER — New game', 'H — How to play'];
  ctx.font = `700 20px ${FONT}`;
  options.forEach((opt, i) => {
    const y = h - 150 + i * 38;
    const ow = ctx.measureText(opt).width + 44;
    panel(ctx, (w - ow) / 2, y - 26, ow, 32, 0.7);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(opt, w / 2, y - 4);
  });
  ctx.textAlign = 'left';
}

export function drawPaused(ctx, world, view, savedFlash) {
  const { width: w, height: h } = view;
  ctx.fillStyle = 'rgba(10, 12, 16, 0.62)';
  ctx.fillRect(0, 0, w, h);
  bigTitle(ctx, w, 190, 'PAUSED', 56, '#f5edd2');
  const lines = [
    'ESC — Resume',
    'S — Save game',
    'H — How to play',
    'Q — Quit to title',
  ];
  ctx.font = `700 20px ${FONT}`;
  ctx.textAlign = 'center';
  lines.forEach((line, i) => ctx.fillText(line, w / 2, 280 + i * 40));
  if (savedFlash > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('Game saved.', w / 2, 470);
  }
  ctx.textAlign = 'left';
}

export function drawHelp(ctx, view) {
  const { width: w, height: h } = view;
  ctx.fillStyle = 'rgba(10, 12, 16, 0.78)';
  ctx.fillRect(0, 0, w, h);
  bigTitle(ctx, w, 110, 'HOW TO PLAY', 44, '#f5edd2');
  const rows = [
    ['WASD / Arrows', 'Walk, or drive when in a car'],
    ['Mouse', 'Aim — the player faces the cursor'],
    ['Left click', 'Fire the current weapon'],
    ['E', 'Get in / out of a car, talk, pick up'],
    ['Q or 1-3', 'Switch weapon (fists, pistol, SMG)'],
    ['Shift', 'Sprint on foot'],
    ['Space', 'Handbrake — slide the car through turns'],
    ['Esc / P', 'Pause'],
    ['Goal', 'Follow the red marker: 5 story missions, then free roam'],
    ['Wanted stars', 'Crimes raise heat. Break line of sight to cool off'],
    ['Busted / Wasted', 'Arrest costs a fine; death costs half your cash'],
  ];
  ctx.font = `17px ${FONT}`;
  rows.forEach((row, i) => {
    const y = 170 + i * 40;
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = 'right';
    ctx.fillText(row[0], w / 2 - 30, y);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(row[1], w / 2 + 10, y);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ESC — back', w / 2, h - 60);
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, view, wasted, cashLost) {
  const { width: w, height: h } = view;
  const color = wasted ? '#d84a3a' : '#3a6fd8';
  ctx.fillStyle = wasted ? 'rgba(40, 8, 6, 0.55)' : 'rgba(8, 14, 40, 0.55)';
  ctx.fillRect(0, 0, w, h);
  bigTitle(ctx, w, h / 2 - 20, wasted ? 'WASTED' : 'BUSTED', 76, color);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(wasted ? `You lost $${cashLost}. Odette patched you up at the garage.` : `Fine: $${cashLost}. The cops dropped you at the garage.`, w / 2, h / 2 + 30);
  ctx.fillText('Press ENTER to keep playing', w / 2, h / 2 + 66);
  ctx.textAlign = 'left';
}
