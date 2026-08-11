/* ============================================================
 * _vm.js — harness compartilhado das suítes Node.
 * Sobe o jogo inteiro (data·fx·engine·pixi·main·selftest) num
 * jsdom real + canvas 2D stub — sem browser, rápido, determinístico.
 *
 *   const { boot } = require('./_vm');
 *   const { window, R } = boot();      // R('1+1') avalia no contexto do jogo
 *
 * Regra: as suítes NÃO entram no git? ENTRAM SIM — tests/ é trackeado
 * (já perdemos as suítes uma vez pelo wipe do sandbox + gitignore).
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('node:module');
const req = createRequire(path.join(process.env.HOME, '.uitest', 'package.json'));
const { JSDOM } = req('jsdom');

const REPO = path.join(__dirname, '..');

/* canvas 2D stub: qualquer método = no-op; gradientes/pattern devolvem objeto;
   propriedades aceitam qualquer valor (proxy cômodo p/ o loop render) */
function makeCtxStub() {
  const grad = { addColorStop() {} };
  const base = {
    canvas: null,
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
  };
  return new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      return (t[k] = () => {});
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function boot(opts) {
  opts = opts || {};
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8')
    .replace(/<script[^>]*src=[^>]*><\/script>/g, '');   // scripts rodam via bundle
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + (opts.query || ''),
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // canvas: jsdom não tem ctx — injeta stub
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this.__stub) { this.__stub = makeCtxStub(); this.__stub.canvas = this; }
    return this.__stub;
  };
  // rAF determinístico o suficiente p/ os testes
  let rafQ = [];
  window.requestAnimationFrame = (fn) => { rafQ.push(fn); return rafQ.length; };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  window.AudioContext = undefined; window.webkitAudioContext = undefined;   // SFX vira no-op
  window.scrollTo = window.scrollTo || (() => {});

  const ctx = vm.createContext(window);
  const files = ['js/data.js', 'js/fx.js', 'js/engine.js', 'js/pixi.js', 'js/main.js', 'js/selftest.js'];
  const bundle = files.map(f => fs.readFileSync(path.join(REPO, f), 'utf8')).join('\n;\n');
  vm.runInContext(bundle, ctx, { filename: 'bundle.js' });

  const R = (expr) => vm.runInContext('(' + expr + ')', ctx);
  const run = (code) => vm.runInContext(code, ctx);

  // pump dos rAFs com dt controlado — o boot já enfileira o loop
  const pumped = { frames: 0 };
  function pump(n, dtMs) {
    for (let i = 0; i < (n || 1); i++) {
      const q = rafQ; rafQ = [];
      for (const fn of q) fn(performance.now() + pumped.frames * (dtMs || 16.7));
      pumped.frames++;
    }
  }
  return { window, dom, R, run, pump, REPO };
}

/* micro-framework de assert compartilhado */
function makeSuite(name) {
  let pass = 0, fail = 0;
  function chk(label, cond, extra) {
    if (cond) { pass++; console.log('OK ', label); }
    else { fail++; console.log('FALHA ', label, extra !== undefined ? '→ ' + extra : ''); }
  }
  function done() {
    console.log(`== ${name}: ${pass} passaram, ${fail} falharam ==`);
    process.exitCode = fail ? 1 : 0;
  }
  return { chk, done, get pass() { return pass; }, get fail() { return fail; } };
}

module.exports = { boot, makeSuite, REPO };
