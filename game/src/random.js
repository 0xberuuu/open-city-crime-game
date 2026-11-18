// A small seeded random number generator (mulberry32): the same seed gives the
// same city, traffic and screenshot scenes, which is what makes staged shots
// repeatable and the world stable across a visit.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from the given random function. */
export function randInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of an array, picked with the given random function. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

/** Clamp a number into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** The shortest signed turn from angle `from` to angle `to`, in radians. */
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Move `from` toward `to` by at most `maxStep` along the shortest arc. */
export function turnToward(from, to, maxStep) {
  const d = angleDelta(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
