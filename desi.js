/**
 * MusicPad Desi kit.
 * Dhol / tabla style percussion synthesized with WebAudio: no samples, no downloads.
 * Each voice is rendered once into an AudioBuffer, so the pads and the sequencer
 * scheduler both play it like any other sample.
 */

const DESI_LEN = 0.6; // seconds rendered per voice

// Which pad key plays which Desi voice while the kit is active
const DESI_PADS = {
  98:  { id: 'dhol-bass',   label: 'dhol bass' },   // b  (sequencer kick)
  109: { id: 'dhol-treble', label: 'dhol treble' }, // m  (sequencer snare)
  107: { id: 'tabla-na',    label: 'tabla na' },    // k  (sequencer hat)
  110: { id: 'chatt',       label: 'chatt' },       // n  (sequencer perc)
  44:  { id: 'tabla-ge',    label: 'tabla ge' }     // ,  (bonus pad voice)
};

/** Gain with a sharp attack and exponential decay, patched into out. */
function desiEnv(ctx, out, peak, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, 0);
  g.gain.exponentialRampToValueAtTime(0.001, decay);
  g.connect(out);
  return g;
}

/** Oscillator gliding f0 -> f1 over glide seconds. */
function desiTone(ctx, out, type, f0, f1, glide, peak, decay) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, 0);
  o.frequency.exponentialRampToValueAtTime(f1, glide);
  o.connect(desiEnv(ctx, out, peak, decay));
  o.start(0);
  o.stop(decay);
}

/** Short filtered noise burst. */
function desiNoise(ctx, out, filterType, freq, peak, decay) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * decay), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  src.buffer = buf;
  src.connect(f);
  f.connect(desiEnv(ctx, out, peak, decay));
  src.start(0);
}

const DESI_VOICES = {
  'dhol-bass':   (c, o) => { desiTone(c, o, 'sine', 70, 45, 0.12, 1, 0.45); desiNoise(c, o, 'lowpass', 400, 0.5, 0.04); },
  'dhol-treble': (c, o) => { desiTone(c, o, 'sine', 180, 120, 0.06, 0.9, 0.3); desiNoise(c, o, 'bandpass', 2500, 0.45, 0.05); },
  'tabla-na':    (c, o) => { desiTone(c, o, 'triangle', 600, 580, 0.2, 0.8, 0.3); desiNoise(c, o, 'bandpass', 3000, 0.25, 0.03); },
  'tabla-ge':    (c, o) => { desiTone(c, o, 'sine', 110, 70, 0.4, 0.9, 0.5); desiNoise(c, o, 'lowpass', 600, 0.15, 0.05); },
  'chatt':       (c, o) => { desiNoise(c, o, 'highpass', 5000, 0.7, 0.09); }
};

const DesiKit = {
  active: false,
  ctx: null,
  buffers: {},      // voice id -> AudioBuffer
  ready: null,      // Promise resolved once every voice is rendered
  onChange: null,   // called after the kit is switched

  init(ctx) {
    this.ctx = ctx;
    const rate = ctx.sampleRate;
    this.ready = Promise.all(Object.keys(DESI_VOICES).map(async id => {
      const off = new OfflineAudioContext(1, Math.ceil(rate * DESI_LEN), rate);
      DESI_VOICES[id](off, off.destination);
      this.buffers[id] = await off.startRendering();
    })).catch(err => console.warn('Desi kit render failed:', err));
    return this.ready;
  },

  /** AudioBuffer replacing a pad's sample while the kit is active, else null. */
  bufferFor(keyCode) {
    const pad = this.active && DESI_PADS[keyCode];
    return pad ? this.buffers[pad.id] || null : null;
  },

  /** True when the pad's sound is currently supplied by this kit. */
  has(keyCode) {
    return this.active && !!DESI_PADS[keyCode];
  },

  /** Play a pad hit live (outside the sequencer clock). */
  play(keyCode, volume = 1) {
    const buffer = this.bufferFor(keyCode);
    if (!buffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.onended = () => gain.disconnect();
    src.start();
  },

  setActive(on) {
    this.active = !!on;
    this.relabelPads();
    if (this.onChange) this.onChange(this.active);
  },

  relabelPads() {
    Object.keys(DESI_PADS).forEach(code => {
      const small = document.querySelector(`#pad-${code} small`);
      if (!small) return;
      if (small.dataset.orig === undefined) small.dataset.orig = small.textContent;
      small.textContent = this.active ? DESI_PADS[code].label : small.dataset.orig;
    });
  },

  /** Original / Desi switcher, inserted right above the pads. */
  buildSwitcher() {
    const bar = document.createElement('div');
    bar.className = 'kit-switcher';
    bar.innerHTML = `
      <span class="kit-label">Kit</span>
      <button class="control-btn kit-btn selected" data-kit="original">Original</button>
      <button class="control-btn kit-btn" data-kit="desi">Desi</button>`;
    const pads = document.querySelector('.section1');
    if (pads && pads.parentNode) pads.parentNode.insertBefore(bar, pads);
    else document.body.insertBefore(bar, document.body.firstChild);

    const style = document.createElement('style');
    style.textContent = `
      .kit-switcher { position: relative; z-index: 10; display: flex; justify-content: center; align-items: center;
        gap: 8px; margin: 10px auto; color: white; }
      .kit-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
      .kit-btn.selected { background: rgba(255, 157, 28, 0.6); font-weight: 700; }
    `;
    document.head.appendChild(style);

    bar.addEventListener('click', e => {
      const b = e.target.closest('.kit-btn');
      if (!b) return;
      this.setActive(b.dataset.kit === 'desi');
      bar.querySelectorAll('.kit-btn').forEach(x => x.classList.toggle('selected', x === b));
      b.blur(); // keep Space from re-triggering a focused button
    });
  }
};
