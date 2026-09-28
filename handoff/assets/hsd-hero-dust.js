/* ==========================================================================
   Herbs & Spices — "Spice Dust" hero, in 3D
   Coloured powder settles into each spice's name, blows apart towards the
   viewer, and re-forms as the next one. The grains live in a real 3D volume
   seen through a perspective camera: the scene turns with the pointer (or
   phone tilt), out-of-focus grains blur, and as the hero scrolls away the word
   bursts towards the viewer and dissolves. The dust is only ever drawn inside
   the word's own band of the hero, never over text. Plain WebGL2, no libraries.

   Loading rules (Shopify performance + accessibility):
   - The big word is real HTML first. This file only adds the canvas on top.
   - Nothing starts until the hero is on screen and the browser is idle.
   - Reduced motion, Save-Data, no WebGL2 or a slow device → HTML words only.
   - Rendering stops when the hero is off screen or the tab is hidden.
   - A visible Pause button stops all motion (WCAG 2.2.2).
   ========================================================================== */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const DISPLAY_FONT = '"Big Shoulders Display", "Arial Narrow", sans-serif';
const MORPH_MS = 1400;
const GRAINS_PER_PX = 0.012; // full-quality density: ~7,000 grains on a 1300 x 450 desktop stage
const MIN_GRAINS = 900;      // below this the word stops reading as a word
const FULL_WIDTH = 1100;     // word band width (CSS px) at which grains are full size
// On narrower screens the letters are smaller, so grains shrink with them
// (uGrain) and there are more of them per px, to keep letter strokes filled.
const grainScale = (width) => clamp(width / FULL_WIDTH, 0.42, 1);
const ATMOSPHERE = 0.12;     // share of grains that float in a halo around the word
const FOCAL = 900;           // camera distance to the word, in CSS px
const MAX_YAW = 0.23;        // radians the scene can turn left/right (~13°)
const MAX_PITCH = 0.14;      // radians up/down (~8°)

/**
 * Who gets the spice dust, and at what quality. The grain count is worked out
 * from the stage size afterwards, so this only decides the quality level.
 *
 * @param {object} device
 * @param {number} device.width     hero width in CSS px
 * @param {number} device.dpr       devicePixelRatio
 * @param {number} device.memory    navigator.deviceMemory in GB (8 if unknown; Safari/Firefox never report it)
 * @param {number} device.cores     navigator.hardwareConcurrency (4 if unknown)
 * @param {boolean} device.saveData visitor turned on data saver
 * @param {boolean} device.coarse   touch-first device (phone/tablet)
 * @returns {number} 0 = no WebGL (HTML words only), 0.5 = light, 1 = full
 */
function dustBudget(device) {
  // TODO(owner): decide who gets the dust. Temporary rule so the hero works:
  return device.saveData ? 0 : 1;
}

/* ---------------------------------------------------------------- shaders */
// World space: x right, y down, z away from the viewer, 1 unit = 1 CSS px at
// the word's depth. The word sits at z = 0, centred on uCenter.
const VERT = `#version 300 es
in vec3 aFrom;
in vec3 aTo;
in vec4 aSeed;
uniform vec2 uView;
uniform vec2 uCenter;
uniform vec2 uRot;
uniform vec3 uMouse;
uniform vec3 uColorFrom;
uniform vec3 uColorTo;
uniform float uTime;
uniform float uMorph;
uniform float uPush;
uniform float uFade;
uniform float uDpr;
uniform float uGrain;
uniform float uFocal;
uniform int uWordCount;
out vec4 vColor;
out float vSoft;

void hide() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 0.0;
  vColor = vec4(0.0);
  vSoft = 0.0;
}

void main() {
  float atm = gl_VertexID >= uWordCount ? 1.0 : 0.0;

  // Each grain starts its trip at a slightly different moment.
  float t = clamp((uMorph - aSeed.x * 0.3) / 0.9, 0.0, 1.0);
  float e = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(aFrom, aTo, e);

  // Mid-trip the word's grains puff up, sideways and towards the viewer.
  float gust = sin(3.14159 * t) * (1.0 - atm);
  p += vec3(aSeed.y - 0.35, aSeed.z - 0.75, -0.6 - aSeed.x) * gust * vec3(150.0, 150.0, 240.0) * uGrain;

  // Drift: a shimmer for the word, slow wandering for the air.
  float amp = mix((0.8 + 1.8 * aSeed.z) * uGrain, 14.0 + 22.0 * aSeed.z, atm);
  float sp = mix(1.0, 0.35, atm);
  p += vec3(sin(uTime * 0.9 * sp + aSeed.w * 6.2831), cos(uTime * 0.7 * sp + aSeed.y * 6.2831), sin(uTime * 0.5 * sp + aSeed.x * 6.2831)) * amp;

  // Cursor / finger wind pushes grains away, and a little towards the viewer.
  vec2 d = p.xy - uMouse.xy;
  float push = uMouse.z * smoothstep(140.0, 0.0, length(d));
  p.xy += normalize(d + 0.0001) * push * (36.0 + 64.0 * aSeed.x);
  p.z -= push * 80.0 * aSeed.y;

  // Flying through: the cloud opens up as the camera pushes in.
  p.xy *= 1.0 + (uPush / uFocal) * (0.3 + 0.9 * aSeed.z);

  // Turn the scene: yaw around y, then pitch around x.
  float cy = cos(uRot.x), sy = sin(uRot.x), cp = cos(uRot.y), spn = sin(uRot.y);
  p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  p = vec3(p.x, cp * p.y - spn * p.z, spn * p.y + cp * p.z);

  // Perspective. Grains right in front of the lens are dropped, not drawn huge.
  float depth = p.z + uFocal - uPush;
  if (depth < 120.0) { hide(); return; }
  float scale = uFocal / depth;
  vec2 screen = uCenter + p.xy * scale;
  vec2 clip = screen / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  // Depth of field: sharp at the word, soft and faint in front and behind.
  float focusDist = max(uFocal - uPush, 240.0);
  float coc = min(abs(depth - focusDist) / focusDist * 2.2, 1.0);
  float size = (1.8 + 2.6 * aSeed.w) * uGrain * scale * (1.0 + coc * 3.0) * (1.0 + push * 0.5);
  gl_PointSize = min(size, 48.0) * uDpr;

  vec3 c = mix(uColorFrom, uColorTo, e);
  c *= 0.72 + 0.5 * aSeed.y;                                        // grain-to-grain tone
  c = mix(c, vec3(0.98, 0.94, 0.85), step(0.965, aSeed.w) * 0.75);  // a few pale specks
  float a = (0.7 + 0.3 * aSeed.z) * mix(1.0, 0.32, atm) / (1.0 + coc * 2.4);
  vColor = vec4(c, a * uFade);
  vSoft = coc;
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec4 vColor;
in float vSoft;
// Visible band, in device px from the top of the viewport: between the hero's top
// and the top of the heading/search, so dust never sits over text people read.
uniform float uClipTop;
uniform float uClipBottom;
uniform float uViewPxH;
out vec4 outColor;
void main() {
  float fromTop = uViewPxH - gl_FragCoord.y;
  if (fromTop < uClipTop || fromTop > uClipBottom) discard;
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (r > 1.0) discard;
  float edge = mix(0.2, 1.0, vSoft);                                  // crisp grain … soft bokeh disc
  float a = vColor.a * (1.0 - smoothstep(1.0 - edge, 1.0, r));
  vec3 col = vColor.rgb * (1.0 + 0.6 * (1.0 - r) * (1.0 - vSoft));     // warm hot core = slight glow
  outColor = vec4(col * a, a);
}`;

/* ---------------------------------------------------------------- helpers */
const hexToRgb = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0xe0a21b;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

/**
 * Sample points inside the word's letters.
 * Returns `count` x/y/z triples, centred on the stage middle, with a little
 * depth so the letters have thickness.
 */
function sampleWord(word, width, height, count) {
  const g = grainScale(width);
  const text = word.toUpperCase();
  const c = document.createElement('canvas');
  c.width = Math.ceil(width);
  c.height = Math.ceil(height);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  // Try one line, and two lines for multi-word names; keep whichever is bigger.
  const layouts = [[text]];
  if (text.includes(' ')) {
    const i = text.indexOf(' ', Math.floor(text.length / 2) - 2);
    const cut = i > -1 ? i : text.lastIndexOf(' ');
    layouts.push([text.slice(0, cut), text.slice(cut + 1)]);
  }
  let best = null;
  // A little extra letter spacing keeps grains of neighbouring letters from merging.
  const TRACK = 0.06; // em
  for (const lines of layouts) {
    ctx.font = `900 100px ${DISPLAY_FONT}`;
    ctx.letterSpacing = `${100 * TRACK}px`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const size = Math.min((width * 0.94 * 100) / widest, (height * 0.92) / (lines.length * 0.86));
    if (!best || size > best.size) best = { lines, size };
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${best.size}px ${DISPLAY_FONT}`;
  ctx.letterSpacing = `${best.size * TRACK}px`;
  const lh = best.size * 0.86;
  const top = height / 2 - (lh * (best.lines.length - 1)) / 2;
  best.lines.forEach((l, i) => ctx.fillText(l, width / 2, top + i * lh));
  // Thicken the strokes a little: condensed letters are thin, and dust reads as a word
  // only when every stroke is several grains wide.
  ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = best.size * 0.025;
  best.lines.forEach((l, i) => ctx.strokeText(l, width / 2, top + i * lh));

  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const step = Math.max(2, Math.round(Math.sqrt((width * height) / (count * 6))));
  const hits = [];
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(y * c.width + x) * 4 + 3] > 128) hits.push(x, y);
    }
  }
  const out = new Float32Array(count * 3);
  const n = hits.length / 2 || 1;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n) * 2;
    out[i * 3] = (hits[j] ?? width / 2) + (Math.random() - 0.5) * step - width / 2;
    out[i * 3 + 1] = (hits[j + 1] ?? height / 2) + (Math.random() - 0.5) * step - height / 2;
    out[i * 3 + 2] = (Math.random() - 0.5) * 40 * g;
  }
  return out;
}

/** Random points in a halo around the word: a little wider, taller and deeper than it. */
function sampleAir(count, w, h) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = (Math.random() - 0.5) * w * 1.25;
    out[i * 3 + 1] = (Math.random() - 0.5) * h * 1.15;
    out[i * 3 + 2] = -320 + Math.random() * 1100;
  }
  return out;
}

/* ------------------------------------------------------------ the section */
class SpiceDust {
  constructor(section) {
    this.section = section;
    this.stage = section.querySelector('.hsd-hero__stage');
    this.canvas = section.querySelector('.hsd-hero__canvas');
    this.link = section.querySelector('[data-hsd-dust-link]');
    this.wordEl = section.querySelector('[data-hsd-dust-word]');
    this.langEl = section.querySelector('[data-hsd-dust-lang]');
    this.meaningEl = section.querySelector('[data-hsd-dust-meaning]');
    this.pauseBtn = section.querySelector('[data-hsd-dust-pause]');
    this.picks = [...section.querySelectorAll('[data-hsd-pick]')];
    this.words = [...section.querySelectorAll('.hsd-hero__words li')].map((li) => ({ ...li.dataset, el: li }));
    this.interval = Number(section.dataset.interval) || 5000;
    this.followPointer = section.dataset.motion === 'full';
    this.index = 0;
    this.paused = false;
    this.inView = false;
    this.gl = null;
    this.raf = 0;
    this.timer = 0;
    this.mouse = { x: -9999, y: -9999, z: 0, target: 0 };
    this.tilt = { x: 0, y: 0, tx: 0, ty: 0 }; // pointer / phone tilt, -1 … 1

    if (!this.stage || this.words.length === 0 || REDUCED.matches) return;

    this.io = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      if (this.inView && !this.started) {
        this.started = true;
        idle(() => this.start());
      }
      this.syncLoop();
    }, { rootMargin: '200px' });
    this.io.observe(section);

    this.onVisibility = () => this.syncLoop();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onReducedChange = () => { if (REDUCED.matches) this.destroy(); };
    REDUCED.addEventListener('change', this.onReducedChange);
  }

  async start() {
    if (this.destroyed) return;
    if (this.pauseBtn && this.words.length > 1) {
      this.pauseBtn.hidden = false;
      this.pauseBtn.addEventListener('click', () => this.setPaused(!this.paused));
    }
    this.schedule();

    const rect = this.stage.getBoundingClientRect();
    const conn = navigator.connection || {};
    const quality = dustBudget({
      width: rect.width,
      dpr: window.devicePixelRatio || 1,
      memory: navigator.deviceMemory || 8,
      cores: navigator.hardwareConcurrency || 4,
      saveData: Boolean(conn.saveData),
      coarse: window.matchMedia('(pointer: coarse)').matches,
    });
    this.quality = Math.min(quality, 1);
    const g = grainScale(rect.width);
    const density = GRAINS_PER_PX / (g * g); // grains are g× smaller, so fill with 1/g² as many
    this.count = quality > 0 ? Math.max(MIN_GRAINS, Math.round(rect.width * rect.height * density * this.quality)) : 0;
    if (!this.count || !this.canvas) return; // HTML words only

    try {
      await Promise.race([document.fonts.load(`900 100px ${DISPLAY_FONT}`), new Promise((r) => setTimeout(r, 1500))]);
      this.initGL();
    } catch (err) {
      console.warn('[hsd-hero-dust] falling back to HTML words:', err);
      this.dropGL();
    }
  }

  /* ---------- word cycling (works with or without WebGL) ---------- */
  schedule() {
    clearTimeout(this.timer);
    if (this.paused || this.words.length < 2) return;
    this.timer = setTimeout(() => {
      // Hold the word while someone is pointing at or tabbing through its product card.
      if (this.picks.some((el) => !el.hidden && el.matches(':hover, :focus-within'))) { this.schedule(); return; }
      this.show((this.index + 1) % this.words.length);
    }, this.interval);
  }

  show(i) {
    const w = this.words[i];
    this.index = i;
    this.wordEl.textContent = w.word;
    this.langEl.textContent = w.lang;
    this.meaningEl.textContent = w.meaning;
    this.link.href = w.link;
    this.link.style.setProperty('--hsd-word-color', w.color);
    this.picks.forEach((el) => { el.hidden = Number(el.dataset.hsdPick) !== i; });
    if (this.gl) this.morphTo(w);
    else {
      this.link.classList.remove('is-swapping');
      void this.link.offsetWidth; // restart the CSS fade
      this.link.classList.add('is-swapping');
    }
    this.schedule();
  }

  setPaused(paused) {
    this.paused = paused;
    this.pauseBtn.setAttribute('aria-pressed', String(paused));
    this.pauseBtn.querySelector('[data-hsd-dust-pause-label]').textContent = paused ? 'Play motion' : 'Pause motion';
    this.schedule();
    this.syncLoop();
  }

  /* ---------- WebGL ---------- */
  initGL() {
    // The canvas becomes a fixed, click-through layer over the whole viewport,
    // so the cloud can drift over the next sections while the camera flies through.
    document.body.appendChild(this.canvas);
    this.canvas.classList.add('hsd-dust-layer');

    const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) { this.restoreCanvas(); return; }
    this.gl = gl;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);
    this.u = {};
    ['uView', 'uCenter', 'uRot', 'uMouse', 'uColorFrom', 'uColorTo', 'uTime', 'uMorph', 'uPush', 'uFade', 'uDpr', 'uGrain', 'uFocal', 'uWordCount', 'uClipTop', 'uClipBottom', 'uViewPxH']
      .forEach((n) => { this.u[n] = gl.getUniformLocation(prog, n); });

    this.airCount = Math.round(this.count * ATMOSPHERE);
    this.wordCount = this.count - this.airCount;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.bufFrom = this.attrib('aFrom', 3);
    this.bufTo = this.attrib('aTo', 3);
    const seeds = new Float32Array(this.count * 4).map(() => Math.random());
    this.bufSeed = this.attrib('aSeed', 4, seeds);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.resizeView();
    this.measureStage();
    this.air = sampleAir(this.airCount, this.stageW, this.stageH);

    this.onResize = () => this.resizeView();
    window.addEventListener('resize', this.onResize);
    this.ro = new ResizeObserver(() => this.onStageResize());
    this.ro.observe(this.stage);

    this.onLost = (e) => { e.preventDefault(); this.dropGL(); };
    this.canvas.addEventListener('webglcontextlost', this.onLost);

    if (this.followPointer) {
      this.onPointer = (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.target = 1;
        this.tilt.tx = clamp((e.clientX / this.viewW) * 2 - 1, -1, 1);
        this.tilt.ty = clamp((e.clientY / this.viewH) * 2 - 1, -1, 1);
      };
      this.onLeave = () => { this.mouse.target = 0; this.tilt.tx = 0; this.tilt.ty = 0; };
      this.section.addEventListener('pointermove', this.onPointer, { passive: true });
      this.section.addEventListener('pointerleave', this.onLeave);
      // Phone tilt where the browser allows it without a permission prompt (Android).
      // iOS asks for permission first; we never trigger that prompt.
      if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        this.onTilt = (e) => {
          if (e.gamma == null) return;
          if (this.baseBeta == null) this.baseBeta = e.beta;
          this.tilt.tx = clamp(e.gamma / 25, -1, 1);
          this.tilt.ty = clamp((e.beta - this.baseBeta) / 25, -1, 1);
        };
        window.addEventListener('deviceorientation', this.onTilt, { passive: true });
      }
    }

    // Intro: dust is thrown in from the air and settles into the first word.
    this.targets = this.withAir(sampleWord(this.words[this.index].word, this.stageW, this.stageH, this.wordCount));
    const intro = new Float32Array(this.count * 3);
    intro.set(sampleAir(this.wordCount, this.stageW, this.stageH));
    intro.set(this.air, this.wordCount * 3);
    this.setBuffers(intro, this.targets);
    this.colorFrom = hexToRgb(this.words[this.index].color);
    this.colorTo = this.colorFrom;
    this.morphStart = performance.now();

    this.frames = 0;
    this.slowFrames = 0;
    this.section.classList.add('is-live');
    requestAnimationFrame(() => this.canvas.classList.add('is-on'));
    this.syncLoop();
  }

  /** Word points followed by the (fixed) air points. */
  withAir(word) {
    const all = new Float32Array(this.count * 3);
    all.set(word);
    all.set(this.air, this.wordCount * 3);
    return all;
  }

  attrib(name, size, data) {
    const gl = this.gl;
    const buf = gl.createBuffer();
    const loc = gl.getAttribLocation(this.prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data || new Float32Array(this.count * size), data ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buf;
  }

  setBuffers(from, to) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufFrom);
    gl.bufferData(gl.ARRAY_BUFFER, from, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTo);
    gl.bufferData(gl.ARRAY_BUFFER, to, gl.DYNAMIC_DRAW);
  }

  morphTo(w) {
    const next = this.withAir(sampleWord(w.word, this.stageW, this.stageH, this.wordCount));
    this.setBuffers(this.targets, next);
    this.targets = next;
    this.colorFrom = this.colorTo;
    this.colorTo = hexToRgb(w.color);
    this.morphStart = performance.now();
    this.syncLoop();
  }

  measureStage() {
    const r = this.stage.getBoundingClientRect();
    this.stageW = r.width;
    this.stageH = r.height;
  }

  resizeView() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.quality < 1 ? 1 : 1.5);
    this.viewW = document.documentElement.clientWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.round(this.viewW * this.dpr);
    this.canvas.height = Math.round(this.viewH * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.targets) this.draw(performance.now());
  }

  onStageResize() {
    const w = this.stageW, h = this.stageH;
    this.measureStage();
    if (!this.targets || (Math.abs(w - this.stageW) < 2 && Math.abs(h - this.stageH) < 2)) return;
    this.targets = this.withAir(sampleWord(this.words[this.index].word, this.stageW, this.stageH, this.wordCount));
    this.setBuffers(this.targets, this.targets);
    this.colorFrom = this.colorTo;
    this.draw(performance.now());
  }

  syncLoop() {
    const run = this.gl && this.inView && !document.hidden && !this.paused;
    if (run && !this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
    if (!run && this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (this.gl && !this.inView) this.clear();
  }

  frame(now) {
    this.raf = 0;
    const dt = now - (this.last || now);
    this.last = now;
    // Slow-device guard: if frames keep taking longer than ~30 fps, fall back to HTML words.
    if (++this.frames > 30 && dt > 34) this.slowFrames++;
    if (this.slowFrames > 45) { this.dropGL(); return; }
    this.draw(now);
    this.syncLoop();
  }

  clear() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  draw(now) {
    const gl = this.gl;
    if (!gl) return;
    const secs = now / 1000;

    // Pointer wind decays when the pointer stops.
    const m = this.mouse;
    m.z += (m.target - m.z) * 0.08;
    m.target *= 0.96;

    // Camera turn: pointer/tilt plus a slow idle sway so it never looks flat.
    const tl = this.tilt;
    tl.x += (tl.tx - tl.x) * 0.05;
    tl.y += (tl.ty - tl.y) * 0.05;
    const yaw = tl.x * MAX_YAW + Math.sin(secs * 0.31) * 0.07;
    const pitch = -tl.y * MAX_PITCH + Math.cos(secs * 0.23) * 0.045;

    // Scroll: the word rides up with the page and, as it leaves, bursts towards the viewer and dissolves.
    // p = 0 at the top of the page, 1 once the word's band has scrolled out of view.
    const hero = this.section.getBoundingClientRect();
    const stage = this.stage.getBoundingClientRect();
    const p = clamp(window.scrollY / Math.max(stage.bottom + window.scrollY, 1), 0, 1);
    const cx = stage.left + stage.width / 2;
    const cy = stage.top + stage.height / 2;
    const push = p * p * FOCAL * 0.7;
    const fade = 1 - smooth(0.35, 0.95, p);

    this.clear();
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.u.uView, this.viewW, this.viewH);
    gl.uniform2f(this.u.uCenter, cx, cy);
    gl.uniform2f(this.u.uRot, yaw, pitch);
    gl.uniform3f(this.u.uMouse, m.x - cx, m.y - cy, m.z);
    gl.uniform3fv(this.u.uColorFrom, this.colorFrom);
    gl.uniform3fv(this.u.uColorTo, this.colorTo);
    gl.uniform1f(this.u.uTime, secs);
    gl.uniform1f(this.u.uMorph, Math.min((now - this.morphStart) / MORPH_MS, 1.5));
    gl.uniform1f(this.u.uPush, push);
    gl.uniform1f(this.u.uFade, fade);
    gl.uniform1f(this.u.uDpr, this.dpr);
    gl.uniform1f(this.u.uGrain, grainScale(this.stageW));
    gl.uniform1f(this.u.uFocal, FOCAL);
    gl.uniform1i(this.u.uWordCount, this.wordCount);
    const bottom = this.textTop();
    gl.uniform1f(this.u.uClipTop, Math.max(hero.top, 0) * this.dpr);
    gl.uniform1f(this.u.uClipBottom, Math.max(bottom, 0) * this.dpr);
    gl.uniform1f(this.u.uViewPxH, this.canvas.height);
    if (fade > 0.001) gl.drawArrays(gl.POINTS, 0, this.count);
  }

  /** Top edge (viewport px) of the first text row below the word (caption strip, else heading). */
  textTop() {
    const el = this.bottomEl || (this.bottomEl = this.section.querySelector('.hsd-hero__strip, .hsd-hero__bottom'));
    return el ? el.getBoundingClientRect().top : this.viewH;
  }

  /** Put the canvas back inside the hero (hidden) so the markup is as the server sent it. */
  restoreCanvas() {
    this.canvas.classList.remove('hsd-dust-layer', 'is-on');
    this.stage.prepend(this.canvas);
  }

  /** Stop WebGL and show the HTML words again (they keep cycling). */
  dropGL() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.section.classList.remove('is-live');
    if (this.ro) this.ro.disconnect();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.onTilt) window.removeEventListener('deviceorientation', this.onTilt);
    if (this.onPointer) {
      this.section.removeEventListener('pointermove', this.onPointer);
      this.section.removeEventListener('pointerleave', this.onLeave);
    }
    if (this.gl) {
      const lose = this.gl.getExtension('WEBGL_lose_context');
      this.gl = null;
      if (lose) lose.loseContext();
    }
    if (this.canvas && this.canvas.parentNode === document.body) this.restoreCanvas();
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
    this.dropGL();
    if (this.io) this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    REDUCED.removeEventListener('change', this.onReducedChange);
    if (this.pauseBtn) this.pauseBtn.hidden = true;
  }
}

/* ------------------------------------------------- boot + theme editor */
const instances = new Map();
const mount = (root) => root.querySelectorAll('[data-hsd-dust]').forEach((el) => {
  if (!instances.has(el)) instances.set(el, new SpiceDust(el));
});
mount(document);

document.addEventListener('shopify:section:load', (e) => mount(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  e.target.querySelectorAll('[data-hsd-dust]').forEach((el) => {
    instances.get(el)?.destroy();
    instances.delete(el);
  });
});
// Selecting a "Spice word" block in the editor shows that word and holds it.
document.addEventListener('shopify:block:select', (e) => {
  const inst = instances.get(e.target.closest('[data-hsd-dust]'));
  if (!inst || !inst.words) return;
  const i = inst.words.findIndex((w) => w.el === e.target);
  if (i > -1) { inst.held = true; inst.show(i); clearTimeout(inst.timer); }
});
document.addEventListener('shopify:block:deselect', (e) => {
  const inst = instances.get(e.target.closest('[data-hsd-dust]'));
  if (inst?.held) { inst.held = false; inst.schedule(); }
});
