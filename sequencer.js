/**
 * MusicPad Sequencer
 * 16-step drum grid driven by a WebAudio-clock lookahead scheduler.
 * The same scheduler also loops quantized live performances (see QuantizedLoopRecorder in recorder.js).
 */

const SEQ_STEPS = 16;

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

    this.pattern = SEQ_VOICES.map(() => new Array(SEQ_STEPS).fill(false));
    // Recorded performance, quantized: loopSteps[step] = [keyCodes]
    this.loopSteps = Array.from({ length: SEQ_STEPS }, () => []);

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
    this.pattern[voiceIndex][step] = !this.pattern[voiceIndex][step];
    return this.pattern[voiceIndex][step];
  }

  clearPattern() {
    this.pattern.forEach(row => row.fill(false));
  }

  loadDemo() {
    this.setBpm(SEQ_DEMO.bpm);
    SEQ_VOICES.forEach((v, i) => {
      this.pattern[i].fill(false);
      SEQ_DEMO[v.id].forEach(s => (this.pattern[i][s - 1] = true));
    });
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
    SEQ_VOICES.forEach((v, i) => {
      if (this.pattern[i][step]) {
        this.playBuffer(v.keyCode, time, v.maxDur);
        keyCodes.push(v.keyCode);
      }
    });
    const loopMax = this.stepDuration * SEQ_STEPS;
    this.loopSteps[step].forEach(code => {
      this.playBuffer(code, time, loopMax);
      keyCodes.push(code);
    });

    this.recentSteps.push({ step, time });
    if (this.recentSteps.length > 8) this.recentSteps.shift();
    this.visualQueue.push({ step, time, keyCodes });
  }

  playBuffer(keyCode, time, maxDur) {
    const buffer = this.buffers[keyCode];
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    const vol = this.audioManager.volume;
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
    });

    press('demo-btn', () => {
      if (this.seq.playing && this.demoActive) {
        this.stopTransport();
        return;
      }
      this.seq.loadDemo();
      $('seq-bpm').value = this.seq.bpm;
      this.syncAll();
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

    // Hand-played notes recorded into the loop may change the clear-loop state
    this.rec.onChange = () => this.syncButtons();
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
    $('seq-clearloop-btn').disabled = !this.seq.hasLoop();
  }
}
