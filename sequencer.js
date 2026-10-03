/**
 * MusicPad Sequencer
 * 16-step drum grid driven by a WebAudio-clock lookahead scheduler.
 * The same scheduler also loops quantized live performances (see QuantizedLoopRecorder in recorder.js).
 */

const SEQ_STEPS = 16;
const SEQ_MAX_LAYERS = 3;

// Drum voices mapped to the existing sample key codes in sounds/
const SEQ_VOICES = [
  { id: 'kick',  label: 'Kick',  keyCode: 98,  maxDur: 0.5 },  // b - bass
  { id: 'snare', label: 'Snare', keyCode: 109, maxDur: 0.6 },  // m - snare
  { id: 'hat',   label: 'Hat',   keyCode: 107, maxDur: 0.15 }, // k - hihat closed (clipped, sample has a long tail)
  { id: 'perc',  label: 'Perc',  keyCode: 110, maxDur: 0.4 }   // n - rim
];

// Boom-bap demo, 1-indexed steps
const SEQ_DEMO = {
  bpm: 90,
  kick: [1, 8, 11],
  snare: [5, 13],
  hat: [2, 4, 6, 8, 10, 12, 14, 16],
  perc: []
};

class Sequencer {
  constructor(audioContext, audioManager) {
    this.ctx = audioContext;
    this.audioManager = audioManager;
    this.bpm = 90;
    this.playing = false;

    // Up to SEQ_MAX_LAYERS layers, all played together. Each owns a grid, its own
    // quantized recorded performance (loopSteps[step] = [keyCodes]) and a mute flag.
    this.layers = Array.from({ length: SEQ_MAX_LAYERS }, () => Sequencer.createLayer());
    this.activeLayer = 0; // layer selected for editing / recording

    this.lookahead = 0.15;  // seconds scheduled ahead of the audio clock
    this.tickMs = 25;       // how often the scheduler wakes up
    this.timer = null;
    this.nextStep = 0;
    this.nextStepTime = 0;
    this.recentSteps = [];  // last scheduled {step, time}, used for quantizing
    this.visualQueue = [];  // {step, time, keyCodes} drained by the UI
    this.activeSources = new Set();

    this.out = this.ctx.createGain();
    this.out.connect(this.ctx.destination);

    this.buffers = {};
    this.loading = {};
    SEQ_VOICES.forEach(v => this.loadBuffer(v.keyCode));
  }

  static createLayer() {
    return {
      pattern: SEQ_VOICES.map(() => new Array(SEQ_STEPS).fill(false)),
      loopSteps: Array.from({ length: SEQ_STEPS }, () => []),
      muted: false,
      // Humanize data (set by the beat generator): timing offset in seconds, velocity 0..1
      timing: SEQ_VOICES.map(() => new Array(SEQ_STEPS).fill(0)),
      vel: SEQ_VOICES.map(() => new Array(SEQ_STEPS).fill(1))
    };
  }

  /** The selected layer's grid / loop; the UI and recorder work against these. */
  get layer() {
    return this.layers[this.activeLayer];
  }

  get pattern() {
    return this.layer.pattern;
  }

  get loopSteps() {
    return this.layer.loopSteps;
  }

  selectLayer(i) {
    if (i >= 0 && i < this.layers.length) this.activeLayer = i;
  }

  toggleMute(i) {
    this.layers[i].muted = !this.layers[i].muted;
    return this.layers[i].muted;
  }

  get stepDuration() {
    return 60 / this.bpm / 4; // 16th notes
  }

  setBpm(bpm) {
    this.bpm = Math.max(60, Math.min(180, Math.round(bpm) || this.bpm));
  }

  /** Fetch + decode a sample once. */
  loadBuffer(keyCode) {
    if (this.buffers[keyCode]) return Promise.resolve(this.buffers[keyCode]);
    if (this.loading[keyCode]) return this.loading[keyCode];
    const url = `${this.audioManager.baseUrl}/${keyCode}.wav`;
    this.loading[keyCode] = fetch(url)
      .then(r => r.arrayBuffer())
      .then(data => new Promise((resolve, reject) => this.ctx.decodeAudioData(data, resolve, reject)))
      .then(buf => (this.buffers[keyCode] = buf))
      .catch(err => {
        console.warn(`Sequencer could not load sound ${keyCode}:`, err);
        delete this.loading[keyCode];
        return null;
      });
    return this.loading[keyCode];
  }

  toggleStep(voiceIndex, step) {
    const layer = this.layer;
    layer.pattern[voiceIndex][step] = !layer.pattern[voiceIndex][step];
    layer.timing[voiceIndex][step] = 0; // hand edits are un-humanized
    layer.vel[voiceIndex][step] = 1;
    return layer.pattern[voiceIndex][step];
  }

  clearPattern() {
    const layer = this.layer;
    layer.pattern.forEach(row => row.fill(false));
    layer.timing.forEach(row => row.fill(0));
    layer.vel.forEach(row => row.fill(1));
  }

  /**
   * Load a recipe ({bpm, kick:[], snare:[], hat:[], perc:[]}, 1-indexed) onto the
   * selected layer. opts.humanize adds timing jitter and hat velocity variation.
   */
  loadRecipe(recipe, opts = {}) {
    if (recipe.bpm) this.setBpm(recipe.bpm);
    this.clearPattern();
    const layer = this.layer;
    SEQ_VOICES.forEach((v, i) => {
      (recipe[v.id] || []).forEach(n => {
        const s = n - 1;
        layer.pattern[i][s] = true;
        if (opts.humanize) {
          layer.timing[i][s] = (Math.random() * 2 - 1) * 0.003; // +-3ms
          layer.vel[i][s] = v.id === 'hat' ? 0.65 + Math.random() * 0.35 : 0.9 + Math.random() * 0.1;
        }
      });
    });
  }

  loadDemo() {
    this.loadRecipe(SEQ_DEMO);
  }

  addLoopHit(step, keyCode) {
    if (this.loopSteps[step].indexOf(keyCode) === -1) this.loopSteps[step].push(keyCode);
    this.loadBuffer(keyCode);
  }

  clearLoop() {
    this.loopSteps.forEach(s => (s.length = 0));
  }

  hasLoop() {
    return this.loopSteps.some(s => s.length > 0);
  }

  /** Compact, URL-safe snapshot of every layer + BPM + kit (recorded loop hits are not included). v2 appends the kit byte; v1 links still decode. */
  encodeBeat() {
    const bytes = [2, this.bpm, this.layers.length];
    this.layers.forEach(l => {
      bytes.push(l.muted ? 1 : 0);
      l.pattern.forEach(row => {
        let bits = 0;
        row.forEach((on, s) => { if (on) bits |= 1 << s; });
        bytes.push(bits & 255, bits >> 8);
      });
    });
    bytes.push((typeof DesiKit !== 'undefined' && DesiKit.active) ? 1 : 0);
    return btoa(String.fromCharCode.apply(null, bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Restore from encodeBeat() output. Returns false (and changes nothing) if invalid. */
  decodeBeat(str) {
    try {
      const b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(b64 + '==='.slice((b64.length + 3) % 4));
      const bytes = Array.from(raw, c => c.charCodeAt(0));
      const ver = bytes[0];
      const n = bytes[2];
      const rowBytes = SEQ_VOICES.length * 2;
      const expectLen = 3 + n * (1 + rowBytes) + (ver === 2 ? 1 : 0);
      if ((ver !== 1 && ver !== 2) || !(n >= 1 && n <= SEQ_MAX_LAYERS) || bytes.length !== expectLen) return false;
      if (!(bytes[1] >= 60 && bytes[1] <= 180)) return false;
      this.setBpm(bytes[1]);
      let p = 3;
      this.layers.forEach((layer, li) => {
        const fresh = Sequencer.createLayer();
        if (li < n) {
          fresh.muted = bytes[p++] === 1;
          fresh.pattern.forEach(row => {
            const bits = bytes[p] | (bytes[p + 1] << 8);
            p += 2;
            for (let s = 0; s < SEQ_STEPS; s++) row[s] = !!(bits & (1 << s));
          });
        }
        this.layers[li] = fresh;
      });
      this.activeLayer = 0;
      if (ver === 2 && typeof DesiKit !== 'undefined') DesiKit.setActive(bytes[p] === 1);
      return true;
    } catch (e) {
      return false;
    }
  }

  start() {
    if (this.playing) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this.nextStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.recentSteps = [];
    this.visualQueue = [];
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.tick();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    // Fade out anything still ringing so stop feels immediate
    const now = this.ctx.currentTime;
    this.activeSources.forEach(({ src, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.03);
        src.stop(now + 0.04);
      } catch (e) { /* already ended */ }
    });
    this.visualQueue = [];
  }

  tick() {
    const horizon = this.ctx.currentTime + this.lookahead;
    while (this.nextStepTime < horizon) {
      this.scheduleStep(this.nextStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.nextStep = (this.nextStep + 1) % SEQ_STEPS;
    }
  }

  scheduleStep(step, time) {
    const keyCodes = [];
    const loopMax = this.stepDuration * SEQ_STEPS;
    this.layers.forEach(layer => {
      if (layer.muted) return;
      SEQ_VOICES.forEach((v, i) => {
        if (layer.pattern[i][step]) {
          this.playBuffer(v.keyCode, Math.max(time + layer.timing[i][step], this.ctx.currentTime), v.maxDur, layer.vel[i][step]);
          keyCodes.push(v.keyCode);
        }
      });
      layer.loopSteps[step].forEach(code => {
        this.playBuffer(code, time, loopMax);
        keyCodes.push(code);
      });
    });

    this.recentSteps.push({ step, time });
    if (this.recentSteps.length > 8) this.recentSteps.shift();
    this.visualQueue.push({ step, time, keyCodes });
  }

  playBuffer(keyCode, time, maxDur, velocity = 1) {
    const buffer = DesiKit.bufferFor(keyCode) || this.buffers[keyCode];
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    const vol = this.audioManager.volume * velocity;
    const dur = Math.min(maxDur, buffer.duration);
    gain.gain.setValueAtTime(vol, time);
    if (dur < buffer.duration) {
      // short release so clipped samples don't click
      gain.gain.setValueAtTime(vol, time + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, time + dur);
    }
    src.connect(gain);
    gain.connect(this.out);
    const entry = { src, gain };
    this.activeSources.add(entry);
    src.onended = () => {
      this.activeSources.delete(entry);
      gain.disconnect();
    };
    src.start(time);
    src.stop(time + dur + 0.01);
  }

  /** Nearest grid step to an audio-clock time (null if transport isn't running). */
  stepAtTime(t) {
    let best = null;
    let bestDist = Infinity;
    this.recentSteps.forEach(s => {
      const d = Math.abs(s.time - t);
      if (d < bestDist) {
        bestDist = d;
        best = s.step;
      }
    });
    return best;
  }
}

class SequencerUI {
  constructor(sequencer, loopRecorder) {
    this.seq = sequencer;
    this.rec = loopRecorder;
    this.cells = [];        // cells[voice][step]
    this.lastColumn = -1;
    this.raf = null;
  }

  init() {
    this.build();
    this.bind();
    this.readHash();
    this.syncAll();
  }

  build() {
    const panel = document.createElement('div');
    panel.className = 'seq-panel';

    const rows = SEQ_VOICES.map((v, i) => `
      <div class="seq-label">${v.label}</div>
      ${Array.from({ length: SEQ_STEPS }, (_, s) =>
        `<button class="seq-cell${s % 4 === 0 ? ' beat' : ''}" data-voice="${i}" data-step="${s}" aria-pressed="false" aria-label="${v.label} step ${s + 1}"></button>`
      ).join('')}
    `).join('');

    panel.innerHTML = `
      <div class="seq-bar">
        <button id="demo-btn" class="control-btn seq-demo"><i class="fas fa-play"></i> Play demo</button>
        <button id="seq-play-btn" class="control-btn"><i class="fas fa-play"></i> Play</button>
        <div class="seq-bpm">
          <label for="seq-bpm">BPM <span id="seq-bpm-val">90</span></label>
          <input type="range" id="seq-bpm" min="60" max="180" value="90">
        </div>
        <button id="seq-clear-btn" class="control-btn">Clear grid</button>
        <button id="seq-rec-btn" class="control-btn"><i class="fas fa-circle"></i> Rec loop</button>
        <button id="seq-clearloop-btn" class="control-btn" disabled>Clear loop</button>
      </div>
      <div class="seq-bar seq-layers">
        ${Array.from({ length: SEQ_MAX_LAYERS }, (_, i) => `
          <span class="seq-layer" data-layer="${i}">
            <button class="control-btn seq-layer-tab" data-layer="${i}">Layer ${i + 1}</button>
            <button class="control-btn seq-layer-mute" data-layer="${i}" aria-label="Mute layer ${i + 1}" title="Mute layer ${i + 1}"><i class="fas fa-volume-up"></i></button>
          </span>`).join('')}
        <button id="seq-copy-btn" class="control-btn"><i class="fas fa-link"></i> Copy link</button>
      </div>
      <div class="seq-bar seq-ai">
        <button id="seq-gen-btn" class="control-btn"><i class="fas fa-magic"></i> Generate</button>
        ${['trap', 'boombap', 'house', 'bhangra'].map(v =>
          `<button class="control-btn seq-chip" data-vibe="${v}">${{ trap: 'Trap', boombap: 'Boom bap', house: 'House', bhangra: 'Bhangra' }[v]}</button>`).join('')}
        <form id="seq-describe" class="seq-describe">
          <input type="text" id="seq-describe-input" maxlength="200" placeholder="Describe a beat, e.g. dark late-night rap" autocomplete="off">
          <button type="submit" class="control-btn">Go</button>
        </form>
        <span id="seq-ai-hint" class="seq-loop-badge"></span>
      </div>
      <div class="seq-grid">${rows}</div>
    `;

    const controls = document.querySelector('.control-panel');
    const header = document.querySelector('.sectionh');
    const anchor = header || controls;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else {
      document.body.insertBefore(panel, document.body.firstChild);
    }
    this.panel = panel;

    panel.querySelectorAll('.seq-cell').forEach(c => {
      const v = +c.dataset.voice;
      (this.cells[v] = this.cells[v] || [])[+c.dataset.step] = c;
    });

    const style = document.createElement('style');
    style.textContent = `
      .seq-panel { position: relative; z-index: 10; width: 90%; max-width: 1000px; margin: 20px auto;
        padding: 15px 20px; border-radius: 12px; background: rgba(10, 10, 30, 0.7);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3); color: white; }
      .seq-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
      .seq-demo { background: rgba(255, 140, 0, 0.55); font-weight: 700; }
      .seq-bpm { display: flex; align-items: center; gap: 8px; font-size: 14px; }
      .seq-bpm input { width: 120px; }
      .seq-grid { display: grid; grid-template-columns: 52px repeat(16, minmax(18px, 1fr)); gap: 4px;
        align-items: center; overflow-x: auto; }
      .seq-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
      .seq-cell { height: 30px; padding: 0; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;
        background: rgba(255,255,255,0.07); cursor: pointer; }
      .seq-cell.beat { background: rgba(255,255,255,0.14); }
      .seq-cell.on { background: #ff9d1c; border-color: #ffd08a; }
      .seq-cell.head { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.85); }
      .seq-layer { display: inline-flex; gap: 2px; }
      .seq-layer-tab.selected { background: rgba(255, 157, 28, 0.6); font-weight: 700; }
      .seq-layer.muted .seq-layer-tab { opacity: 0.45; }
      .seq-chip.selected { background: rgba(255, 157, 28, 0.6); }
      .seq-describe { display: flex; gap: 6px; flex: 1 1 220px; }
      .seq-describe input { flex: 1; min-width: 0; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.08); color: white; }
      .seq-loop-badge { font-size: 12px; opacity: 0.8; }
      @media (max-width: 600px) {
        .seq-grid { grid-template-columns: 40px repeat(16, minmax(20px, 1fr)); }
        .seq-bpm input { width: 90px; }
      }
    `;
    document.head.appendChild(style);
  }

  bind() {
    const $ = id => document.getElementById(id);
    const press = (id, fn) => $(id).addEventListener('click', e => {
      fn();
      e.currentTarget.blur(); // keep Space from re-triggering a focused button
    });

    this.panel.querySelector('.seq-grid').addEventListener('click', e => {
      const cell = e.target.closest('.seq-cell');
      if (!cell) return;
      const on = this.seq.toggleStep(+cell.dataset.voice, +cell.dataset.step);
      this.paintCell(cell, on);
      cell.blur();
      this.writeHash();
    });

    press('demo-btn', () => {
      if (this.seq.playing && this.demoActive) {
        this.stopTransport();
        return;
      }
      this.seq.loadDemo();
      $('seq-bpm').value = this.seq.bpm;
      this.syncAll();
      this.writeHash();
      this.demoActive = true;
      if (!this.seq.playing) this.startTransport();
      this.syncButtons();
    });

    press('seq-play-btn', () => {
      if (this.seq.playing) this.stopTransport();
      else this.startTransport();
    });

    $('seq-bpm').addEventListener('input', e => {
      this.seq.setBpm(+e.target.value);
      $('seq-bpm-val').textContent = this.seq.bpm;
    });

    press('seq-clear-btn', () => {
      this.seq.clearPattern();
      this.demoActive = false;
      this.syncAll();
      this.writeHash();
    });

    press('seq-rec-btn', () => {
      if (this.rec.isLoopRecording) {
        this.rec.stopLoopRecording();
      } else {
        if (!this.seq.playing) this.startTransport();
        this.rec.startLoopRecording();
      }
      this.syncButtons();
    });

    press('seq-clearloop-btn', () => {
      this.rec.clearLoop();
      this.syncButtons();
    });

    this.panel.querySelectorAll('.seq-layer-tab').forEach(b =>
      b.addEventListener('click', () => {
        this.seq.selectLayer(+b.dataset.layer);
        b.blur();
        this.syncAll();
      }));
    this.panel.querySelectorAll('.seq-layer-mute').forEach(b =>
      b.addEventListener('click', () => {
        this.seq.toggleMute(+b.dataset.layer);
        b.blur();
        this.syncButtons();
        this.writeHash();
      }));

    press('seq-copy-btn', () => {
      this.writeHash();
      const url = location.href;
      const done = () => this.hint('Link copied');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, () => this.hint(url));
      } else {
        this.hint(url);
      }
    });

    // Local smart brain: Generate re-rolls the current vibe (default Boom bap)
    this.vibe = this.vibe || 'boombap';
    press('seq-gen-btn', () => this.applyRecipe(BeatEngine.localRecipe(this.vibe)));
    this.panel.querySelectorAll('.seq-chip').forEach(c =>
      c.addEventListener('click', () => {
        this.vibe = c.dataset.vibe;
        this.applyRecipe(BeatEngine.localRecipe(this.vibe));
        c.blur();
      }));

    $('seq-describe').addEventListener('submit', async e => {
      e.preventDefault();
      const text = $('seq-describe-input').value.trim();
      if (!text) return;
      const recipe = await BeatEngine.fromDescription(text);
      this.vibe = BeatEngine.vibeFromText(text);
      this.applyRecipe(recipe);
    });
    $('seq-describe-input').addEventListener('keydown', e => e.stopPropagation()); // typing must not trigger pads
    $('seq-describe-input').addEventListener('keypress', e => e.stopPropagation());
    if (!GEMINI_API_KEY) this.hint('Describe box needs a Gemini key (see ai.js); Generate and the vibe chips work offline.', true);

    // Hand-played notes recorded into the loop may change the clear-loop state
    this.rec.onChange = () => this.syncButtons();
  }

  /** Load a recipe onto the selected layer (humanized), keep it editable, and start playing. */
  applyRecipe(recipe) {
    this.seq.loadRecipe(recipe, { humanize: true });
    this.demoActive = false;
    this.syncAll();
    this.writeHash();
    if (!this.seq.playing) this.startTransport();
  }

  hint(msg, sticky) {
    const el = document.getElementById('seq-ai-hint');
    el.textContent = msg;
    clearTimeout(this.hintTimer);
    if (!sticky) this.hintTimer = setTimeout(() => this.hint(this.stickyHint || '', true), 2500);
    else this.stickyHint = msg;
  }

  writeHash() {
    history.replaceState(null, '', '#b=' + this.seq.encodeBeat());
  }

  /** Restore a shared beat from the URL hash, if present and valid. */
  readHash() {
    const m = /^#b=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (m && this.seq.decodeBeat(m[1])) this.syncAll();
  }

  startTransport() {
    this.seq.start();
    this.raf = requestAnimationFrame(() => this.frame());
    this.syncButtons();
  }

  stopTransport() {
    if (this.rec.isLoopRecording) this.rec.stopLoopRecording();
    this.seq.stop();
    this.demoActive = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.setHead(-1);
    this.syncButtons();
  }

  /** Playhead + pad flashes, one rAF loop only while the transport runs. */
  frame() {
    if (!this.seq.playing) return;
    const now = this.seq.ctx.currentTime;
    const q = this.seq.visualQueue;
    while (q.length && q[0].time <= now) {
      const ev = q.shift();
      if (!q.length || q[0].time > now) {
        this.setHead(ev.step);
        ev.keyCodes.forEach(k => this.flashPad(k));
      }
    }
    this.raf = requestAnimationFrame(() => this.frame());
  }

  setHead(col) {
    if (this.lastColumn >= 0) this.cells.forEach(row => row[this.lastColumn].classList.remove('head'));
    if (col >= 0) this.cells.forEach(row => row[col].classList.add('head'));
    this.lastColumn = col;
  }

  flashPad(keyCode) {
    const pad = document.getElementById(`pad-${keyCode}`);
    if (!pad) return;
    pad.classList.remove('playing');
    void pad.offsetWidth;
    pad.classList.add('playing');
    setTimeout(() => pad.classList.remove('playing'), 200);
  }

  paintCell(cell, on) {
    cell.classList.toggle('on', on);
    cell.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  syncAll() {
    this.cells.forEach((row, v) => row.forEach((cell, s) => this.paintCell(cell, this.seq.pattern[v][s])));
    document.getElementById('seq-bpm').value = this.seq.bpm;
    document.getElementById('seq-bpm-val').textContent = this.seq.bpm;
    this.syncButtons();
  }

  syncButtons() {
    const $ = id => document.getElementById(id);
    const playing = this.seq.playing;
    $('seq-play-btn').innerHTML = playing
      ? '<i class="fas fa-stop"></i> Stop' : '<i class="fas fa-play"></i> Play';
    $('seq-play-btn').classList.toggle('active-play', playing);
    $('demo-btn').innerHTML = playing && this.demoActive
      ? '<i class="fas fa-stop"></i> Stop demo' : '<i class="fas fa-play"></i> Play demo';
    const rec = this.rec.isLoopRecording;
    $('seq-rec-btn').classList.toggle('active', rec);
    $('seq-rec-btn').innerHTML = rec
      ? '<i class="fas fa-square"></i> Stop rec' : '<i class="fas fa-circle"></i> Rec loop';
    this.panel.querySelectorAll('.seq-layer').forEach(el => {
      const i = +el.dataset.layer;
      const muted = this.seq.layers[i].muted;
      el.classList.toggle('muted', muted);
      el.querySelector('.seq-layer-tab').classList.toggle('selected', i === this.seq.activeLayer);
      el.querySelector('.seq-layer-mute').innerHTML = `<i class="fas fa-volume-${muted ? 'mute' : 'up'}"></i>`;
    });
    this.panel.querySelectorAll('.seq-chip').forEach(c => c.classList.toggle('selected', c.dataset.vibe === this.vibe));
    $('seq-clearloop-btn').disabled = !this.seq.hasLoop();
  }
}
