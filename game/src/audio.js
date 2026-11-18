// All sound is synthesized with WebAudio: no audio files, no network. Short
// effects are noise bursts and pitched blips; the engine is a detuned pair of
// oscillators whose pitch follows speed; a slow bass line and hats keep a
// laid-back groove under the free roam. Everything starts on the first user
// gesture, as browsers require.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = 0;
  let musicStep = 0;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, endFreq, seconds, volume, type) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  function noise(seconds, volume, filterFreq, type) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(seconds);
    const filter = ctx.createBiquadFilter();
    filter.type = type || 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }

  const effects = {
    shot() {
      noise(0.12, 0.5, 1800);
      blip(220, 60, 0.1, 0.25, 'sawtooth');
    },
    punch() {
      noise(0.07, 0.35, 500);
    },
    crash() {
      noise(0.3, 0.5, 700);
      blip(120, 40, 0.25, 0.3, 'sawtooth');
    },
    honk() {
      blip(370, 370, 0.18, 0.2, 'square');
      blip(466, 466, 0.18, 0.15, 'square');
    },
    pickup() {
      blip(660, 990, 0.12, 0.25, 'sine');
    },
    cash() {
      blip(880, 880, 0.07, 0.2, 'sine');
      setTimeout(() => blip(1320, 1320, 0.1, 0.2, 'sine'), 70);
    },
    click() {
      blip(500, 300, 0.06, 0.15, 'sine');
    },
    mission() {
      blip(523, 523, 0.12, 0.22, 'triangle');
      setTimeout(() => blip(659, 659, 0.12, 0.22, 'triangle'), 110);
      setTimeout(() => blip(784, 784, 0.2, 0.25, 'triangle'), 220);
    },
    explosion() {
      noise(0.8, 0.7, 300);
      blip(90, 30, 0.7, 0.4, 'sawtooth');
    },
    wasted() {
      blip(392, 392, 0.25, 0.25, 'triangle');
      setTimeout(() => blip(311, 311, 0.25, 0.25, 'triangle'), 240);
      setTimeout(() => blip(233, 233, 0.5, 0.25, 'triangle'), 480);
    },
    sirenOn() {},
  };

  function startEngine() {
    if (!ctx || engineOsc) return;
    engineOsc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.type = 'sawtooth';
    osc2.type = 'square';
    engineOsc.frequency.value = 55;
    osc2.frequency.value = 28;
    engineOsc.connect(engineGain);
    osc2.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    osc2.start();
    engineOsc._second = osc2;
  }

  function startSiren() {
    if (!ctx || sirenOsc) return;
    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 700;
    sirenOsc.connect(sirenGain).connect(master);
    sirenOsc.start();
  }

  /** Bass line + hats: one bar of eight steps, looped while playing. */
  const BASS = [110, 110, 130.8, 110, 98, 98, 146.8, 130.8];
  function musicTick(dt, playing) {
    if (!ctx || !playing) return;
    musicTimer += dt;
    const stepLen = 0.24;
    while (musicTimer >= stepLen) {
      musicTimer -= stepLen;
      const step = musicStep % 8;
      musicStep += 1;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = BASS[step];
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepLen * 0.9);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + stepLen);
      if (step % 2 === 0) {
        const hat = ctx.createBufferSource();
        hat.buffer = noiseBuffer(0.03);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6000;
        const hg = ctx.createGain();
        hg.gain.value = 0.05;
        hat.connect(hp).connect(hg).connect(master);
        hat.start(t);
      }
    }
  }

  return {
    /** Call on the first user gesture; safe to call repeatedly. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      startEngine();
      startSiren();
    },
    play(name) {
      if (!ctx) return;
      const fn = effects[name];
      if (fn) fn();
    },
    /** Engine pitch follows speed 0..1; 0 silences it. */
    engine(speed01) {
      if (!ctx || !engineGain) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.08 : 0, t, 0.1);
      if (engineOsc) engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.1);
      if (engineOsc && engineOsc._second) engineOsc._second.frequency.setTargetAtTime(25 + speed01 * 65, t, 0.1);
    },
    /** Siren wail while wanted; silent at 0 stars. */
    siren(wanted, time) {
      if (!ctx || !sirenGain) return;
      const t = ctx.currentTime;
      sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.045 : 0, t, 0.3);
      if (wanted > 0 && sirenOsc) sirenOsc.frequency.value = 650 + Math.sin(time * 4.2) * 220;
    },
    music(dt, playing) {
      musicTick(dt, playing);
    },
  };
}
