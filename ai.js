/**
 * MusicPad AI beat engine.
 * Local "smart brain" (offline, free, default) + optional Gemini describe box.
 */

// >>> GEMINI API KEY <<<
// Paste your Gemini key here; in Google Cloud Console restrict it to HTTP referrer vrdevil44.github.io/*
const GEMINI_API_KEY = '';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const BEAT_RECIPES = {
  trap:    { bpm: 140, kick: [1, 7, 10], snare: [9],      hat: [1, 3, 5, 7, 9, 11, 13, 15],  perc: [4, 12] },
  boombap: { bpm: 90,  kick: [1, 8, 11], snare: [5, 13],  hat: [2, 4, 6, 8, 10, 12, 14, 16], perc: [16] },
  house:   { bpm: 122, kick: [1, 5, 9, 13], snare: [5, 13], hat: [3, 7, 11, 15],            perc: [2, 6, 10, 14] },
  bhangra: { bpm: 100, kick: [1, 5, 9, 13], snare: [5, 13], hat: [2, 4, 6, 8, 10, 12, 14, 16], perc: [3, 7, 11, 15] }
};

const VIBE_KEYWORDS = [
  ['trap', /trap|dark|hiphop|rap/],
  ['bhangra', /punjabi|bhangra|desi|dhol/],
  ['boombap', /boom|jazz|old school|90s/],
  ['house', /house|dance|edm|party|club/]
];

const BeatEngine = {
  vibeFromText(text) {
    const t = String(text || '').toLowerCase();
    const hit = VIBE_KEYWORDS.find(([, re]) => re.test(t));
    return hit ? hit[0] : 'boombap';
  },

  /** Local recipe for a vibe name or free text (copy, so callers can't mutate the map). */
  localRecipe(vibeOrText) {
    const key = BEAT_RECIPES[vibeOrText] ? vibeOrText : this.vibeFromText(vibeOrText);
    return JSON.parse(JSON.stringify(BEAT_RECIPES[key]));
  },

  /** Strict validation of untrusted model output. Returns a clean recipe or null. */
  validate(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const bpm = obj.bpm;
    if (typeof bpm !== 'number' || !isFinite(bpm) || bpm < 60 || bpm > 180) return null;
    const out = { bpm: Math.round(bpm) };
    for (const id of ['kick', 'snare', 'hat', 'perc']) {
      const arr = obj[id];
      if (!Array.isArray(arr) || arr.length > 16) return null;
      if (!arr.every(n => Number.isInteger(n) && n >= 1 && n <= 16)) return null;
      out[id] = Array.from(new Set(arr)).sort((a, b) => a - b);
    }
    return out.kick.length + out.snare.length + out.hat.length + out.perc.length ? out : null;
  },

  /** Ask Gemini; resolves to a validated recipe or null on any failure (never throws). */
  async gemini(description) {
    if (!GEMINI_API_KEY) return null;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are a drum pattern generator for a 16-step sequencer. Respond with ONLY a JSON object, no prose, no markdown: ' +
                '{"bpm": number 60-180, "kick": [], "snare": [], "hat": [], "perc": []}. ' +
                'Each array lists the active steps as integers from 1 to 16 (1-indexed). Match the vibe the user describes.'
            }]
          },
          contents: [{ role: 'user', parts: [{ text: String(description).slice(0, 200) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.8 }
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      return this.validate(JSON.parse(text.trim().replace(/^```(?:json)?|```$/g, '')));
    } catch (e) {
      return null;
    }
  },

  /** Describe -> Gemini if keyed, otherwise (or on any failure) the local engine. */
  async fromDescription(description) {
    return (await this.gemini(description)) || this.localRecipe(description);
  }
};
