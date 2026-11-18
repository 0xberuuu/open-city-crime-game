// Particles and short-lived effects: muzzle flashes, blood puffs, smoke,
// sparks, skid marks, explosion fireballs and floating pickup text. Everything
// here is visual only and fades on its own.

export function createEffects() {
  return { particles: [], skids: [], floats: [] };
}

export function spawnParticles(fx, x, y, count, opts) {
  for (let i = 0; i < count; i += 1) {
    const a = (opts.angle ?? 0) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2);
    const speed = (opts.speed ?? 120) * (0.4 + Math.random() * 0.8);
    fx.particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: (opts.life ?? 0.5) * (0.6 + Math.random() * 0.7),
      maxLife: opts.life ?? 0.5,
      size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8),
      color: opts.color ?? '#ffffff',
      drag: opts.drag ?? 4,
      gravity: opts.gravity ?? 0,
      glow: !!opts.glow,
    });
  }
  if (fx.particles.length > 500) fx.particles.splice(0, fx.particles.length - 500);
}

export function addSkid(fx, x, y, angle) {
  fx.skids.push({ x, y, angle, life: 6 });
  if (fx.skids.length > 220) fx.skids.splice(0, fx.skids.length - 220);
}

export function addFloat(fx, x, y, text, color) {
  fx.floats.push({ x, y, text, color: color || '#f2c94c', life: 1.4 });
}

export function stepEffects(fx, dt) {
  for (let i = fx.particles.length - 1; i >= 0; i -= 1) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.vx -= p.vx * p.drag * dt;
    p.vy -= p.vy * p.drag * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = fx.skids.length - 1; i >= 0; i -= 1) {
    fx.skids[i].life -= dt;
    if (fx.skids[i].life <= 0) fx.skids.splice(i, 1);
  }
  for (let i = fx.floats.length - 1; i >= 0; i -= 1) {
    const f = fx.floats[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) fx.floats.splice(i, 1);
  }
}

export function explosion(fx, x, y) {
  spawnParticles(fx, x, y, 34, { speed: 260, life: 0.7, size: 9, color: '#f28c38', glow: true });
  spawnParticles(fx, x, y, 22, { speed: 150, life: 1.1, size: 12, color: '#f2c94c', glow: true });
  spawnParticles(fx, x, y, 18, { speed: 90, life: 1.6, size: 14, color: '#555', drag: 2 });
}

export function muzzle(fx, x, y, angle) {
  spawnParticles(fx, x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 3, {
    angle, spread: 0.5, speed: 160, life: 0.09, size: 5, color: '#ffd75e', glow: true, drag: 1,
  });
}

export function bloodPuff(fx, x, y) {
  spawnParticles(fx, x, y, 6, { speed: 110, life: 0.5, size: 4, color: '#a8231a', drag: 5 });
}

export function smokePuff(fx, x, y, big) {
  spawnParticles(fx, x, y, big ? 3 : 1, { speed: 40, life: 1.2, size: big ? 12 : 8, color: '#777', drag: 1.5 });
}

export function sparkBurst(fx, x, y) {
  spawnParticles(fx, x, y, 8, { speed: 220, life: 0.3, size: 2, color: '#ffe9a8', glow: true, drag: 3 });
}
