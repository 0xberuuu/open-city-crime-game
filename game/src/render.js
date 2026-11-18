// The renderer: a pre-rendered ground canvas (roads, blocks, beach, sea),
// buildings drawn with a raised-roof pseudo-3D look, and everything else —
// cars, people, pickups, particles — depth-sorted by its south edge so the
// near side of the world correctly overlaps the far side. A warm afternoon
// light and a vignette finish the frame.

import { GRID, PALETTE, WORLD } from './config.js';
import { STREET_LINES } from './city.js';
import { carCorners } from './vehicles.js';

export const VIEW = { width: 1280, height: 800 };

function isParkBlock(col, row) {
  return col >= 1 && col <= 2 && row >= 3 && row <= 4;
}

/** Paint the whole ground once: blocks, roads, markings, beach, sea, park. */
export function createGround(city) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  const ctx = canvas.getContext('2d');
  const half = GRID.road / 2;

  // Base ground.
  ctx.fillStyle = '#b39a68';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // City blocks.
  for (let col = 0; col < GRID.count - 1; col += 1) {
    for (let row = 0; row < GRID.count - 1; row += 1) {
      const x = STREET_LINES[col] + half;
      const y = STREET_LINES[row] + half;
      const w = GRID.pitch - GRID.road;
      const h = GRID.pitch - GRID.road;
      ctx.fillStyle = isParkBlock(col, row) ? PALETTE.parkGrass : '#c2b18c';
      ctx.fillRect(x, y, w, h);
      if (isParkBlock(col, row)) {
        // Park paths.
        ctx.strokeStyle = '#d8cba4';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();
        // Pond.
        ctx.fillStyle = '#6fa8c8';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.3, y + h * 0.3, 52, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sidewalk border.
        ctx.strokeStyle = PALETTE.sidewalk;
        ctx.lineWidth = 16;
        ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
      }
    }
  }

  // Harbor concrete on the east strip.
  ctx.fillStyle = '#9a9484';
  ctx.fillRect(3052, 0, 68, 3130);
  // Beach sand on the south strip.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 3052, WORLD.width, 78);
  // Sea.
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, 3130, WORLD.width, 70);
  ctx.fillRect(3120, 0, 80, 3130);
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(0, 3160, WORLD.width, 40);
  ctx.fillRect(3160, 0, 40, 3130);
  // Wet sand line.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 3124, WORLD.width, 6);
  ctx.fillRect(3114, 0, 6, 3130);
  // Beach umbrellas.
  for (let i = 0; i < 10; i += 1) {
    const ux = 200 + i * 300 + (i % 3) * 40;
    const uy = 3080 + (i % 2) * 22;
    ctx.fillStyle = i % 2 ? '#d84a3a' : '#f2c94c';
    ctx.beginPath();
    ctx.arc(ux, uy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ux, uy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const s of STREET_LINES) {
    ctx.fillRect(0, s - half, WORLD.width, GRID.road);
    ctx.fillRect(s - half, 0, GRID.road, WORLD.height);
  }
  // Lane dashes.
  ctx.strokeStyle = PALETTE.lane;
  ctx.lineWidth = 4;
  ctx.setLineDash([26, 30]);
  for (const s of STREET_LINES) {
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(WORLD.width, s);
    ctx.moveTo(s, 0);
    ctx.lineTo(s, WORLD.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Crosswalks: four short zebra stripes on each approach, clear of the corners.
  ctx.fillStyle = PALETTE.crosswalk;
  for (const sx of STREET_LINES) {
    for (const sy of STREET_LINES) {
      for (let i = 0; i < 4; i += 1) {
        const off = -30 + i * 20;
        ctx.fillRect(sx - half + 6, sy + off - 4, 18, 8);
        ctx.fillRect(sx + half - 24, sy + off - 4, 18, 8);
        ctx.fillRect(sx + off - 4, sy - half + 6, 8, 18);
        ctx.fillRect(sx + off - 4, sy + half - 24, 8, 18);
      }
    }
  }
  return canvas;
}

export function createRenderer(canvas, city) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  const ground = createGround(city);
  const vignette = document.createElement('canvas');
  vignette.width = VIEW.width;
  vignette.height = VIEW.height;
  const vctx = vignette.getContext('2d');
  const warm = vctx.createLinearGradient(0, 0, 0, VIEW.height);
  warm.addColorStop(0, 'rgba(255,220,150,0.10)');
  warm.addColorStop(1, 'rgba(255,180,90,0.16)');
  vctx.fillStyle = warm;
  vctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const grad = vctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(20,10,0,0.34)');
  vctx.fillStyle = grad;
  vctx.fillRect(0, 0, VIEW.width, VIEW.height);

  function drawBuilding(b) {
    const shift = b.height * 0.55;
    const ox = -shift * 0.35;
    const oy = -shift;
    // South face.
    ctx.fillStyle = b.tower ? PALETTE.towerSide : PALETTE.buildingSide;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.h);
    ctx.lineTo(b.x + b.w, b.y + b.h);
    ctx.lineTo(b.x + b.w + ox, b.y + b.h + oy);
    ctx.lineTo(b.x + ox, b.y + b.h + oy);
    ctx.closePath();
    ctx.fill();
    // East face.
    ctx.fillStyle = shade(b.tower ? PALETTE.towerSide : PALETTE.buildingSide, -18);
    ctx.beginPath();
    ctx.moveTo(b.x + b.w, b.y);
    ctx.lineTo(b.x + b.w, b.y + b.h);
    ctx.lineTo(b.x + b.w + ox, b.y + b.h + oy);
    ctx.lineTo(b.x + b.w + ox, b.y + oy);
    ctx.closePath();
    ctx.fill();
    // Roof.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + ox, b.y + oy, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + ox, b.y + oy, b.w, b.h);
    // Inset roof border and a faint panel grid so big roofs are not blank.
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + ox + 10, b.y + oy + 10, b.w - 20, b.h - 20);
    ctx.beginPath();
    for (let gx = b.x + ox + 34; gx < b.x + ox + b.w - 10; gx += 34) {
      ctx.moveTo(gx, b.y + oy + 10);
      ctx.lineTo(gx, b.y + oy + b.h - 10);
    }
    for (let gy = b.y + oy + 34; gy < b.y + oy + b.h - 10; gy += 34) {
      ctx.moveTo(b.x + ox + 10, gy);
      ctx.lineTo(b.x + ox + b.w - 10, gy);
    }
    ctx.stroke();
    // Roof details.
    if (b.helipad) {
      ctx.strokeStyle = '#f5f0e0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x + ox + b.w / 2, b.y + oy + b.h / 2, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f5f0e0';
      ctx.font = '700 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('H', b.x + ox + b.w / 2, b.y + oy + b.h / 2 + 11);
      ctx.textAlign = 'left';
    } else if (b.tower) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(b.x + ox + 18 + i * 30, b.y + oy + 16, 18, 12);
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(b.x + ox + 14, b.y + oy + 14, 22, 16);
      ctx.fillRect(b.x + ox + b.w - 40, b.y + oy + b.h - 34, 26, 20);
    }
    // Windows on the south face for towers.
    if (b.tower) {
      ctx.fillStyle = 'rgba(240,245,250,0.5)';
      for (let wx = b.x + 16; wx < b.x + b.w - 14; wx += 26) {
        ctx.fillRect(wx, b.y + b.h - shift * 0.55, 14, 10);
      }
    }
  }

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function drawTree(t, time) {
    const sway = Math.sin(time * 0.8 + t.x * 0.01) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.palm) {
      ctx.strokeStyle = '#8a6b45';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.quadraticCurveTo(t.x + 4, t.y - 18, t.x + 8 + sway, t.y - 30);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + sway * 0.05;
        ctx.beginPath();
        ctx.ellipse(t.x + 8 + Math.cos(a) * 12, t.y - 30 + Math.sin(a) * 8, 13, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#7a5a38';
      ctx.fillRect(t.x - 3, t.y - 6, 6, 10);
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(t.x + sway, t.y - 12, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.treeDark;
      ctx.beginPath();
      ctx.arc(t.x + sway - 4, t.y - 16, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car, time) {
    const corners = carCorners(car);
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const { length, width } = car.spec;
    const hl = length / 2;
    const hw = width / 2;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.roundRect(-hl + 3, -hw + 4, length, width, 8);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#1a1a1a';
    const wy = hw - 3;
    ctx.fillRect(-hl + 8, -wy - 4, 14, 7);
    ctx.fillRect(-hl + 8, wy - 3, 14, 7);
    ctx.fillRect(hl - 22, -wy - 4, 14, 7);
    ctx.fillRect(hl - 22, wy - 3, 14, 7);
    // Body.
    ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
    ctx.beginPath();
    ctx.roundRect(-hl, -hw, length, width, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Cabin.
    ctx.fillStyle = car.dead ? '#222' : '#2a3542';
    ctx.beginPath();
    ctx.roundRect(-hl * 0.35, -hw + 5, length * 0.42, width - 10, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,210,235,0.5)';
    ctx.fillRect(hl * 0.02, -hw + 7, 8, width - 14);
    // Headlights / taillights.
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(hl - 3, -hw + 4, 3, 7);
    ctx.fillRect(hl - 3, hw - 11, 3, 7);
    ctx.fillStyle = '#d83a2a';
    ctx.fillRect(-hl, -hw + 4, 3, 7);
    ctx.fillRect(-hl, hw - 11, 3, 7);
    // Taxi sign and band.
    if (car.type === 'taxi') {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = '#f2c94c';
      ctx.font = '700 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
      ctx.textAlign = 'left';
    }
    // Police light bar.
    if (car.type === 'police') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-hl + 6, -hw + 3, length - 12, width - 6);
      ctx.fillStyle = '#1d2733';
      ctx.font = '700 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 4);
      ctx.textAlign = 'left';
      const phase = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#ff3b30' : '#3a6fd8';
      ctx.fillRect(-4, -hw + 2, 10, 6);
      ctx.fillStyle = phase ? '#3a6fd8' : '#ff3b30';
      ctx.fillRect(-4, hw - 8, 10, 6);
    }
    // Damage: dents show as dark patches.
    if (car.health < car.maxHealth * 0.6) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(-hl * 0.5, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void corners;
  }

  function drawPerson(x, y, angle, shirt, opts) {
    const o = opts || {};
    const bob = o.moving ? Math.sin(o.phase || 0) * 2 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.down) {
      // Lying flat.
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.roundRect(-6, -14, 12, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#e8b98f';
      ctx.beginPath();
      ctx.arc(0, -18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(angle);
    // Feet.
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-4, -7 + bob, 7, 4);
    ctx.fillRect(-4, 3 - bob, 7, 4);
    // Body.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius || 11, 0, Math.PI * 2);
    ctx.fill();
    if (o.outline) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Shoulders.
    ctx.fillStyle = shade(shirt.startsWith('#') ? shirt : '#888888', -20);
    ctx.beginPath();
    ctx.arc(-3, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath();
    ctx.arc(3, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Gun.
    if (o.gun) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(20, 4);
      ctx.stroke();
    }
    if (o.cap) {
      ctx.fillStyle = '#1d2733';
      ctx.beginPath();
      ctx.arc(3, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b98f';
      ctx.beginPath();
      ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPickup(p, time) {
    const bob = Math.sin(p.bob + time * 2) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.kind === 'health') {
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.roundRect(-11, -11, 22, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#d83a2a';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else if (p.kind === 'armor') {
      ctx.fillStyle = '#3a6fd8';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, -6);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 13);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-10, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -6, 4, 10);
    } else if (p.kind === 'ammo') {
      ctx.fillStyle = '#4e7d3a';
      ctx.beginPath();
      ctx.roundRect(-11, -8, 22, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(-7, -4, 3, 8);
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillRect(5, -4, 3, 8);
    } else {
      ctx.fillStyle = '#2e7d4f';
      ctx.beginPath();
      ctx.roundRect(-11, -7, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 5);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawMarkerRing(marker, time) {
    if (!marker) return;
    const pulse = 26 + Math.sin(time * 4) * 5;
    ctx.strokeStyle = 'rgba(255,90,60,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(marker.x, marker.y, pulse, pulse * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Bouncing beacon arrow above the marker.
    const bounce = Math.sin(time * 3) * 6;
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.moveTo(marker.x, marker.y - 58 + bounce);
    ctx.lineTo(marker.x - 11, marker.y - 74 + bounce);
    ctx.lineTo(marker.x + 11, marker.y - 74 + bounce);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return {
    draw(world, screen) {
      const cam = world.camera;
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      // Ground: only the visible slice.
      ctx.drawImage(
        ground,
        Math.round(cam.x), Math.round(cam.y), VIEW.width, VIEW.height,
        0, 0, VIEW.width, VIEW.height,
      );
      // Animated sea shimmer over visible water, batched into one stroke.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      const t = world.time;
      ctx.beginPath();
      for (const w of world.city.water) {
        const x0 = Math.max(w.x, cam.x);
        const x1 = Math.min(w.x + w.w, cam.x + VIEW.width);
        const y0 = Math.max(w.y, cam.y);
        const y1 = Math.min(w.y + w.h, cam.y + VIEW.height);
        for (let y = y0 + 12; y < y1; y += 22) {
          for (let x = x0 + 10; x < x1; x += 60) {
            const wob = Math.sin(t * 1.6 + x * 0.05 + y * 0.08) * 4;
            ctx.moveTo(x - cam.x - 12 + wob, y - cam.y);
            ctx.lineTo(x - cam.x + 12 + wob, y - cam.y);
          }
        }
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      // Skid marks under everything.
      for (const skid of world.fx.skids) {
        ctx.save();
        ctx.translate(skid.x, skid.y);
        ctx.rotate(skid.angle);
        ctx.fillStyle = `rgba(20,20,20,${Math.min(0.5, skid.life * 0.12)})`;
        ctx.fillRect(-10, -2, 20, 3);
        ctx.restore();
      }

      // Depth-sorted draw list: buildings, trees, crates, piers, people, cars.
      const items = [];
      // Buildings turn translucent when the player stands behind one, so the
      // player is never hidden by a roof overhang.
      const focus = world.player.car || world.player;
      for (const b of world.city.buildings) {
        if (b.x + b.w < cam.x - 120 || b.x > cam.x + VIEW.width + 120 || b.y + b.h < cam.y - 160 || b.y > cam.y + VIEW.height + 60) continue;
        const shift = b.height * 0.55;
        const behind = focus.x > b.x - 14 && focus.x < b.x + b.w + 14 && focus.y > b.y - shift - 14 && focus.y < b.y + b.h;
        items.push({
          y: b.y + b.h,
          draw: () => {
            if (behind) ctx.globalAlpha = 0.45;
            drawBuilding(b);
            ctx.globalAlpha = 1;
          },
        });
      }
      for (const tr of world.city.trees) {
        if (tr.x < cam.x - 40 || tr.x > cam.x + VIEW.width + 40 || tr.y < cam.y - 60 || tr.y > cam.y + VIEW.height + 40) continue;
        items.push({ y: tr.y, draw: () => drawTree(tr, t) });
      }
      for (const c of world.city.crates) {
        if (c.x < cam.x - 40 || c.x > cam.x + VIEW.width + 40 || c.y < cam.y - 40 || c.y > cam.y + VIEW.height + 40) continue;
        items.push({
          y: c.y + c.h,
          draw: () => {
            ctx.fillStyle = '#a8844e';
            ctx.fillRect(c.x, c.y, c.w, c.h);
            ctx.strokeStyle = '#7a5f36';
            ctx.lineWidth = 2;
            ctx.strokeRect(c.x, c.y, c.w, c.h);
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(c.x + c.w, c.y + c.h);
            ctx.moveTo(c.x + c.w, c.y);
            ctx.lineTo(c.x, c.y + c.h);
            ctx.stroke();
          },
        });
      }
      for (const pier of world.city.piers) {
        items.push({
          y: pier.y + pier.h,
          draw: () => {
            ctx.fillStyle = '#8a6b45';
            ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
            ctx.strokeStyle = '#6b4f30';
            ctx.lineWidth = 2;
            for (let x = pier.x; x < pier.x + pier.w; x += 16) {
              ctx.beginPath();
              ctx.moveTo(x, pier.y);
              ctx.lineTo(x, pier.y + pier.h);
              ctx.stroke();
            }
          },
        });
      }
      // Mission marker ring on the ground.
      const marker = world.marker;
      if (marker) {
        items.push({ y: marker.y - 1, draw: () => drawMarkerRing(marker, t) });
      }
      for (const p of world.combat.pickups) {
        items.push({ y: p.y, draw: () => drawPickup(p, t) });
      }
      // Odette at the garage.
      const odette = world.odette;
      items.push({
        y: odette.y,
        draw: () => {
          drawPerson(odette.x, odette.y, odette.angle, '#c95a7d', { radius: 12 });
          if (world.showOdetteMark) {
            ctx.fillStyle = '#f2c94c';
            ctx.font = '700 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', odette.x, odette.y - 34 + Math.sin(t * 3) * 3);
            ctx.textAlign = 'left';
          }
        },
      });
      for (const ped of world.peds) {
        items.push({
          y: ped.y,
          draw: () => drawPerson(ped.x, ped.y, ped.angle, ped.color, { moving: !!ped.target, phase: ped.phase, down: ped.down > 0 }),
        });
      }
      for (const e of world.combat.enemies) {
        if (e.dead) continue;
        items.push({
          y: e.y,
          draw: () => {
            drawPerson(e.x, e.y, e.angle, e.color, { gun: true, radius: e.radius, moving: true, phase: t * 8 });
            // Health bar for the boss.
            if (e.boss) {
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.fillRect(e.x - 26, e.y - 32, 52, 6);
              ctx.fillStyle = '#d84a3a';
              ctx.fillRect(e.x - 26, e.y - 32, 52 * (e.health / e.maxHealth), 6);
              ctx.fillStyle = '#fff';
              ctx.font = '700 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('SILAS CROWE', e.x, e.y - 38);
              ctx.textAlign = 'left';
            }
          },
        });
      }
      for (const o of world.police.officers) {
        items.push({
          y: o.y,
          draw: () => drawPerson(o.x, o.y, o.angle, '#2a3a5c', { cap: true, gun: true, moving: true, phase: t * 8 }),
        });
      }
      for (const car of world.cars) {
        items.push({ y: car.y + car.spec.width / 2, draw: () => drawCar(car, t) });
      }
      const player = world.player;
      if (!player.car && !player.dead) {
        items.push({
          y: player.y,
          draw: () => drawPerson(player.x, player.y, player.angle, '#2f6fb3', {
            gun: player.weapon !== 'fists',
            moving: player.moving,
            phase: t * (player.running ? 14 : 9),
            radius: 13,
            outline: true,
          }),
        });
      }
      items.sort((a, b) => a.y - b.y);
      for (const item of items) item.draw();

      // Bullets as tracers.
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 2;
      for (const b of world.combat.bullets) {
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Particles.
      for (const p of world.fx.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        if (p.glow) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;

      // Floating texts.
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'center';
      for (const f of world.fx.floats) {
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.fillStyle = f.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';

      ctx.restore();

      // Warm afternoon light + vignette, blitted from the pre-rendered overlay.
      ctx.drawImage(vignette, 0, 0);
      void screen;
    },
  };
}
