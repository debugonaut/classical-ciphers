/* Classical Ciphers — interface, geometry and motion. */
(function () {
  'use strict';

  var C = window.Cipher;
  var ALPHA = C.ALPHA;
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'power3.out';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ══════════════════════════════════════════════════ routing ══════════════ */

  var PANELS = ['substitution', 'transposition'];
  var active = null;

  function goTo(id, animate) {
    if (PANELS.indexOf(id) < 0) id = 'substitution';
    if (id === active) return;

    var from = active ? document.getElementById(active) : null;
    var to = document.getElementById(id);
    active = id;

    $$('.nav').forEach(function (n) { n.classList.toggle('is-on', n.dataset.panel === id); });

    if (from) {
      if (animate !== false && !REDUCE) {
        gsap.to(from, {
          opacity: 0, y: -10, duration: 0.18, ease: 'power2.in',
          onComplete: function () {
            from.hidden = true;
            gsap.set(from, { clearProps: 'opacity,transform' });
            reveal(to);
          }
        });
      } else {
        from.hidden = true;
        reveal(to);
      }
      return;
    }
    reveal(to);
  }

  function reveal(panel) {
    panel.hidden = false;
    if (!REDUCE) {
      gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'none' });
      gsap.fromTo(Array.prototype.slice.call(panel.children), { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: EASE,
        clearProps: 'transform,opacity'
      });
    }
    if (panel.id === 'transposition') {
      renderRail(false);
      playRail();
    }
  }

  $$('.nav').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (history.pushState) history.pushState(null, '', '#' + a.dataset.panel);
      goTo(a.dataset.panel, true);
    });
  });

  window.addEventListener('popstate', function () {
    goTo((location.hash || '').slice(1), true);
  });

  /* ══════════════════════════════════════════════════ module 01 ════════════ */

  var sub = {
    text: 'ATTACK AT DAWN',
    mode: 'caesar',
    k: 3,
    pfKey: 'MONARCHY',
    vKey: 'LEMON',
    pad: ''
  };
  var prevKey = 3;
  var lastPFKey = null;

  function letterCount(t) {
    var n = 0;
    for (var i = 0; i < t.length; i++) if (C.indexOf(t[i]) >= 0) n++;
    return n;
  }

  function padFor() {
    var n = letterCount(sub.text);
    if (!sub.pad || sub.pad.length !== n) sub.pad = C.randomPad(n);
    return sub.pad;
  }

  function cipherText() {
    switch (sub.mode) {
      case 'caesar': return C.caesar(sub.text, sub.k);
      case 'playfair': return C.playfair(sub.text, sub.pfKey, false);
      case 'vigenere': return C.vigenere(sub.text, sub.vKey, false);
      case 'vernam': return C.vernam(sub.text, padFor(), false);
    }
    return sub.text;
  }

  /* ---------- cipher ring (Caesar) ---------- */

  var R_OUT = 150, R_IN = 116, STEP = 360 / 26;

  function polar(r, slot) {
    var a = (slot * STEP - 90) * Math.PI / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  }
  function polarDeg(r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  }

  var ring = {
    svg: null, inner: null, innerLetters: [], outer: [], hits: [], link: null,
    p: { v: -3 * STEP }
  };

  function buildRing() {
    var svg = ring.svg = $('#ringSvg');
    svg.textContent = '';

    [R_OUT + 13, R_OUT - 13, R_IN + 12, R_IN - 12].forEach(function (r) {
      svg.appendChild(svgEl('circle', { r: r, cx: 0, cy: 0, class: 'ring-guide' }));
    });

    var ticks = svgEl('g', { class: 'ring-ticks' });
    for (var i = 0; i < 26; i++) {
      var a = polar(R_IN + 12, i), b = polar(R_OUT - 13, i);
      ticks.appendChild(svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
    }
    svg.appendChild(ticks);

    var gOut = svgEl('g', { class: 'ring-outer' });
    var gHit = svgEl('g', { class: 'ring-hits' });
    for (i = 0; i < 26; i++) {
      var pt = polar(R_OUT, i);
      var t = svgEl('text', {
        x: pt[0], y: pt[1], class: 'ring-ltr',
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      t.textContent = ALPHA[i];
      gOut.appendChild(t);
      ring.outer[i] = t;

      var hit = svgEl('circle', { cx: pt[0], cy: pt[1], r: 10.5, fill: 'transparent', class: 'ring-hit' });
      hit.dataset.i = i;
      gHit.appendChild(hit);
      ring.hits[i] = hit;
    }
    svg.appendChild(gHit);
    svg.appendChild(gOut);

    var gIn = svgEl('g', { class: 'ring-inner' });
    for (i = 0; i < 26; i++) {
      var ip = polar(R_IN, i);
      var it = svgEl('text', {
        x: ip[0], y: ip[1], class: 'ring-ltr ring-ltr-in',
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      it.textContent = ALPHA[i];
      gIn.appendChild(it);
      ring.innerLetters[i] = { el: it, x: ip[0], y: ip[1] };
    }
    svg.appendChild(gIn);
    ring.inner = gIn;

    ring.link = svgEl('line', { class: 'ring-link', x1: 0, y1: 0, x2: 0, y2: 0 });
    svg.appendChild(ring.link);

    var m1 = polarDeg(R_OUT + 21, -3.2), m2 = polarDeg(R_OUT + 21, 3.2);
    svg.appendChild(svgEl('path', {
      d: 'M ' + m1[0] + ' ' + m1[1] + ' A ' + (R_OUT + 21) + ' ' + (R_OUT + 21) + ' 0 0 1 ' + m2[0] + ' ' + m2[1],
      class: 'ring-mark'
    }));

    ring.hits.forEach(function (h) {
      h.addEventListener('mouseenter', function () { hot(h.dataset.i | 0); });
      h.addEventListener('mouseleave', clearHot);
    });
  }

  function paintRing() {
    var deg = ring.p.v;
    ring.inner.setAttribute('transform', 'rotate(' + deg + ' 0 0)');
    for (var i = 0; i < 26; i++) {
      var o = ring.innerLetters[i];
      if (o.el.textContent !== ALPHA[i]) o.el.textContent = ALPHA[i];
      o.el.setAttribute('transform', 'rotate(' + (-deg) + ' ' + o.x + ' ' + o.y + ')');
    }
  }

  function syncRingK() {
    var k = C.mod(Math.round(-ring.p.v / STEP), 26);
    var node = $('#ringK');
    if (node.textContent !== String(k)) node.textContent = k;
  }

  /*
   * The wheel must land on a slot boundary every time. The target is anchored to
   * the grid position of the shift we are coming from, not to ring.p.v, because a
   * spin interrupted mid-tween leaves ring.p.v a fraction of a slot off and that
   * error used to accumulate: the letters ended up sitting between the ticks with
   * the number in the core disagreeing with them.
   */
  function spin(deltaSlots, anchor) {
    var target = anchor - deltaSlots * STEP;
    if (REDUCE) { ring.p.v = target; paintRing(); syncRingK(); return; }
    gsap.killTweensOf(ring.p);
    gsap.to(ring.p, {
      v: target, duration: 0.62, ease: 'power3.out',
      onUpdate: function () { paintRing(); syncRingK(); },
      onComplete: function () { ring.p.v = target; paintRing(); syncRingK(); }
    });
  }

  function hot(i) {
    ring.outer[i].classList.add('is-hot');
    ring.innerLetters[(i + sub.k) % 26].el.classList.add('is-hot');

    var a = polar(R_OUT - 16, i), b = polar(R_IN + 14, i);
    ring.link.setAttribute('x1', a[0]);
    ring.link.setAttribute('y1', a[1]);
    ring.link.setAttribute('x2', b[0]);
    ring.link.setAttribute('y2', b[1]);
    gsap.to(ring.link, { opacity: 1, duration: 0.16, overwrite: true });
  }

  function clearHot() {
    $$('.ring-ltr.is-hot').forEach(function (n) { n.classList.remove('is-hot'); });
    gsap.to(ring.link, { opacity: 0, duration: 0.2, overwrite: true });
  }

  /* ---------- playfair square ---------- */

  function buildPF() {
    var grid = $('#pfGrid');
    grid.textContent = '';
    var sq = C.squareLetters(sub.pfKey);
    var kw = C.cleanKeyword(sub.pfKey).replace(/J/g, 'I');

    for (var i = 0; i < sq.length; i++) {
      var ch = sq.charAt(i);
      var cell = el('div', 'pf-cell', ch === 'I' ? 'I/J' : ch);
      if (kw.indexOf(ch) >= 0) cell.classList.add('is-key');
      grid.appendChild(cell);
    }

    $('#pfHint').textContent = 'Square from “' + (kw || 'alphabet') + '” — hover a digraph below.';

    if (!REDUCE) {
      gsap.fromTo($$('.pf-cell'), { opacity: 0, scale: 0.82 }, {
        opacity: 1, scale: 1, duration: 0.34, stagger: 0.012, ease: 'back.out(2)'
      });
    }
  }

  function pfHighlight(d) {
    var cells = $$('.pf-cell');
    cells.forEach(function (c) { c.classList.remove('is-in', 'is-out'); });
    if (!d) return;
    d.inn.forEach(function (i) { if (cells[i]) cells[i].classList.add('is-in'); });
    d.out.forEach(function (i) { if (cells[i]) cells[i].classList.add('is-out'); });
  }

  /* ---------- trace ---------- */

  var traceRefs = [];
  var TRACE_LIMIT = 64;
  var PAIR_LIMIT = 24;

  function buildTrace() {
    var wrap = $('#trace');
    wrap.textContent = '';
    traceRefs = [];

    if (sub.mode === 'playfair') return buildPairTrace(wrap);

    var chars = Array.from(sub.text).slice(0, TRACE_LIMIT);

    chars.forEach(function (ch, pos) {
      var idx = C.indexOf(ch);
      var isSpace = ch === ' ';
      var cell = el('div', idx < 0 ? 'tc is-skip' : 'tc');
      cell.appendChild(el('span', 'tc-in', isSpace ? '·' : ch));
      var m = el('span', 'tc-math', '—');
      var b = el('span', 'tc-out', isSpace ? '·' : ch);
      cell.appendChild(m);
      cell.appendChild(b);
      wrap.appendChild(cell);
      traceRefs.push({ idx: idx, pos: pos, math: m, out: b, ch: ch });
    });

    if (Array.from(sub.text).length > TRACE_LIMIT) {
      wrap.appendChild(el('span', 'tc-more', '+' + (Array.from(sub.text).length - TRACE_LIMIT)));
    }

    if (!REDUCE) {
      gsap.fromTo(wrap.children, { opacity: 0, y: 7 }, {
        opacity: 1, y: 0, duration: 0.34, stagger: 0.012, ease: 'power2.out'
      });
    }
  }

  function buildPairTrace(wrap) {
    var detail = C.playfairDetail(sub.text, sub.pfKey, false);
    var shown = detail.slice(0, PAIR_LIMIT);

    shown.forEach(function (d, i) {
      var cell = el('div', 'tc is-pair');
      var a = el('span', 'tc-in', d.plain);
      var m = el('span', 'tc-math', '');
      var b = el('span', 'tc-out', d.cipher);
      cell.appendChild(a);
      cell.appendChild(m);
      cell.appendChild(b);
      cell.addEventListener('mouseenter', function () {
        pfHighlight(traceRefs[i] ? traceRefs[i].detail : null);
      });
      cell.addEventListener('mouseleave', function () { pfHighlight(null); });
      wrap.appendChild(cell);
      traceRefs.push({ detail: d, math: m, out: b, in: a });
    });

    if (detail.length > PAIR_LIMIT) {
      wrap.appendChild(el('span', 'tc-more', '+' + (detail.length - PAIR_LIMIT)));
    }

    if (!REDUCE) {
      gsap.fromTo(wrap.children, { opacity: 0, y: 7 }, {
        opacity: 1, y: 0, duration: 0.34, stagger: 0.014, ease: 'power2.out'
      });
    }
  }

  function updateTrace() {
    if (sub.mode === 'playfair') {
      var detail = C.playfairDetail(sub.text, sub.pfKey, false);
      traceRefs.forEach(function (r, i) {
        var d = detail[i];
        if (!d) return;
        r.detail = d;
        r.in.textContent = d.plain;
        r.out.textContent = d.cipher;
        r.math.textContent = d.rule === 'row' ? 'same row' : d.rule === 'col' ? 'same column' : 'rectangle';
      });
      $('#traceTag').textContent = detail.length + (detail.length === 1 ? ' digraph' : ' digraphs');
      return;
    }

    var cipher = cipherText();
    var shifts = null;

    if (sub.mode === 'vigenere') shifts = C.vigenereShifts(sub.text, sub.vKey);
    if (sub.mode === 'vernam') {
      var pad = padFor(), j = 0;
      shifts = [];
      for (var c = 0; c < sub.text.length; c++) {
        shifts.push(C.indexOf(sub.text[c]) < 0 ? null : ALPHA.indexOf(pad[j++]));
      }
    }

    traceRefs.forEach(function (r) {
      if (r.idx < 0) { r.out.textContent = cipher[r.pos]; return; }
      var shift = sub.mode === 'caesar' ? sub.k : (shifts ? shifts[r.pos] : 0);
      var out = C.mod(r.idx + (shift || 0), 26);
      r.math.textContent = r.idx + ' + ' + (shift || 0) + '\n≡ ' + out;
      r.out.textContent = cipher[r.pos];
    });

    var letters = letterCount(sub.text);
    $('#traceTag').textContent = letters + (letters === 1 ? ' letter' : ' letters');
  }

  /* ---------- formula ---------- */

  function paintFormula() {
    var l1, l2, l3;

    if (sub.mode === 'caesar') {
      l1 = 'C = (P + k) mod 26';
      l2 = 'C = (P + ' + sub.k + ') mod 26';
      l3 = 'P = (C − ' + sub.k + ') mod 26';
    } else if (sub.mode === 'playfair') {
      var kw = C.cleanKeyword(sub.pfKey).replace(/J/g, 'I');
      l1 = 'C₁C₂ = rule(P₁P₂)';
      l2 = 'square from “' + (kw || 'alphabet') + '” · I/J merged';
      l3 = 'decryption runs each rule backwards';
    } else if (sub.mode === 'vigenere') {
      var vk = C.cleanKeyword(sub.vKey);
      l1 = 'Cᵢ = (Pᵢ + Kᵢ) mod 26';
      l2 = 'K = ' + (vk || '—') + ' · period ' + (vk.length || 0);
      l3 = 'Pᵢ = (Cᵢ − Kᵢ) mod 26';
    } else {
      l1 = 'Cᵢ = (Pᵢ + Kᵢ) mod 26';
      l2 = 'K random · ' + padFor().length + ' letters · used once';
      l3 = 'every key equally likely';
    }

    $('#f1').textContent = l1;
    $('#f2').textContent = l2;
    $('#f3').textContent = l3;
  }

  /* ---------- render ---------- */

  function renderMode() {
    $$('.mode').forEach(function (b) {
      var on = b.dataset.mode === sub.mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('.key-pane').forEach(function (p) { p.hidden = p.dataset.pane !== sub.mode; });

    $('#ringCard').hidden = sub.mode !== 'caesar';
    $('#pfCard').hidden = sub.mode !== 'playfair';
    $('#subGrid').classList.toggle('is-single', sub.mode === 'vigenere' || sub.mode === 'vernam');

    $('#xTag').textContent = {
      caesar: 'Caesar', playfair: 'Playfair', vigenere: 'Vigenère', vernam: 'One-time pad'
    }[sub.mode];
  }

  function renderSub(opts) {
    opts = opts || {};

    $('#cipherOut').textContent = cipherText();

    var letters = letterCount(sub.text);
    $('#subCount').textContent = sub.text.length + (sub.text.length === 1 ? ' character' : ' characters') +
      ' · ' + letters + (letters === 1 ? ' letter' : ' letters');

    if (sub.mode === 'playfair' && (sub.pfKey !== lastPFKey || !$('#pfGrid').childElementCount)) {
      buildPF();
      lastPFKey = sub.pfKey;
    }

    paintFormula();
    $('#padTag').textContent = padFor().length + ' letters';
    updateTrace();
  }

  function applyKey(k, opts) {
    opts = opts || {};
    k = C.mod(Math.round(k), 26);
    var from = prevKey;
    var delta = ((k - from + 39) % 26) - 13;
    sub.k = k;
    prevKey = k;

    var range = $('#subKey');
    range.value = k;
    range.style.setProperty('--p', (k / 25 * 100) + '%');
    range.setAttribute('aria-valuetext', 'shift ' + k);
    $('#subKeyOut').textContent = k;

    if (opts.instant) {
      ring.p.v = -k * STEP;
      paintRing();
      syncRingK();
    } else {
      spin(delta, -from * STEP);
    }
    renderSub(opts);
  }

  /* ---------- wiring: module 01 ---------- */

  $$('.mode').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.mode === sub.mode) return;
      sub.mode = b.dataset.mode;
      renderMode();
      buildTrace();
      renderSub({});
      buildDemo(sub.mode);
      if (!REDUCE) gsap.fromTo($('#keyCard'), { opacity: 0.4 }, { opacity: 1, duration: 0.3 });
    });
  });

  $('#subText').addEventListener('input', function (e) {
    sub.text = e.target.value;
    buildTrace();
    renderSub({});
  });

  $('#subKey').addEventListener('input', function (e) {
    applyKey(+e.target.value, {});
  });

  $('#subSample').addEventListener('click', function () {
    sub.text = 'ATTACK AT DAWN';
    $('#subText').value = sub.text;
    buildTrace();
    renderSub({});
  });

  $('#subClear').addEventListener('click', function () {
    sub.text = '';
    $('#subText').value = '';
    buildTrace();
    renderSub({});
    $('#subText').focus();
  });

  $('#pfKey').addEventListener('input', function (e) {
    sub.pfKey = e.target.value;
    lastPFKey = null;
    renderSub({});
  });

  $('#vKey').addEventListener('input', function (e) {
    sub.vKey = e.target.value;
    renderSub({});
  });

  $('#padNew').addEventListener('click', function () {
    sub.pad = C.randomPad(Math.max(1, letterCount(sub.text)));
    renderSub({});
  });

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('is-done');
      setTimeout(function () {
        btn.textContent = old;
        btn.classList.remove('is-done');
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = el('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
      done();
    }
  }

  $('#copyCipher').addEventListener('click', function () {
    copyText($('#cipherOut').textContent, this);
  });

  /* ══════════════════════════════════════════════════ explainer demos ══════ */

  var demoTL = null;
  var railTLdemo = null;

  function tile(ch, kind) {
    return el('span', 'tile' + (kind ? ' ' + kind : ''), ch);
  }

  function cap(node, text, dotsNode, step) {
    node.textContent = text;
    if (!dotsNode) return;
    Array.prototype.forEach.call(dotsNode.children, function (d, i) {
      d.classList.toggle('is-on', i === step);
    });
  }

  function row(labels, cls) {
    var r = el('div', 'demo-row');
    if (labels) r.appendChild(el('span', 'dlabel', labels));
    return r;
  }

  function flyGhost(grid, from, to, ch, delay) {
    if (REDUCE) return;
    var g = tile(ch, 'c');
    g.classList.add('ghost');
    g.style.left = from.offsetLeft + 'px';
    g.style.top = from.offsetTop + 'px';
    grid.appendChild(g);
    gsap.to(g, {
      left: to.offsetLeft, top: to.offsetTop, duration: 0.55, ease: 'power3.inOut', delay: delay || 0,
      onComplete: function () {
        gsap.to(g, {
          opacity: 0, duration: 0.25, delay: 0.12,
          onComplete: function () { g.remove(); }
        });
      }
    });
  }

  function demoCaesar(stage, capNode, dots) {
    var START = 20, N = 12, K = 3;
    var top = row('alphabet');
    var bot = row('shifted');
    var botCells = [];
    var i;

    for (i = 0; i < N; i++) top.appendChild(tile(ALPHA[(START + i) % 26], 'x'));
    for (i = 0; i < N; i++) {
      var t = tile(ALPHA[(START + i) % 26], 'c');
      bot.appendChild(t);
      botCells.push(t);
    }
    stage.appendChild(top);
    stage.appendChild(bot);

    function setRow(k) {
      return function () {
        botCells.forEach(function (cell, idx) {
          cell.textContent = ALPHA[(START + idx + k) % 26];
          if (REDUCE) return;
          gsap.fromTo(cell, { y: -7, opacity: 0.2 }, {
            y: 0, opacity: 1, duration: 0.32, delay: idx * 0.022, ease: 'power2.out'
          });
        });
      };
    }

    cap(capNode, 'Two copies of the same alphabet. Nothing is hidden yet.', dots, 0);

    if (REDUCE) {
      setRow(K)();
      cap(capNode, 'Every plaintext letter is replaced by the letter k places further along the alphabet. Z wraps round to C — that is the mod 26.', dots, 1);
      return null;
    }

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.0 });
    tl.call(function () { cap(capNode, 'Two copies of the same alphabet. Nothing is hidden yet.', dots, 0); });
    tl.call(setRow(0), [], 0.05);
    tl.to({}, { duration: 1.15 });
    tl.call(function () { cap(capNode, 'Slide the cipher row three places. Every letter now stands for a different one.', dots, 1); });
    tl.call(setRow(K), [], '<');
    tl.to({}, { duration: 1.6 });
    tl.call(function () {
      cap(capNode, 'Z falls off the end and wraps round to C. Only 25 shifts exist — which is the whole weakness.', dots, 2);
      gsap.fromTo(botCells[5], { scale: 1 }, { scale: 1.3, duration: 0.26, yoyo: true, repeat: 3, ease: 'power2.inOut' });
    });
    tl.to({}, { duration: 1.8 });
    return tl;
  }

  function demoPlayfair(stage, capNode, dots) {
    var sq = C.squareLetters('MONARCHY');
    var grid = el('div', 'pf-demo');
    var cells = [];
    var i;

    for (i = 0; i < 25; i++) {
      var ch = sq.charAt(i);
      var c = el('div', 'pf-dcell', ch === 'I' ? 'I/J' : ch);
      grid.appendChild(c);
      cells.push(c);
    }
    stage.appendChild(grid);

    function clear() {
      cells.forEach(function (c) { c.classList.remove('is-src', 'is-dst'); });
    }

    function step(fromA, fromB, toA, toB, chA, chB) {
      return function () {
        clear();
        cells[fromA].classList.add('is-src');
        cells[fromB].classList.add('is-src');
        cells[toA].classList.add('is-dst');
        cells[toB].classList.add('is-dst');
        flyGhost(grid, cells[fromA], cells[toA], chA, 0);
        flyGhost(grid, cells[fromB], cells[toB], chB, 0.1);
      };
    }

    cap(capNode, 'A 5×5 square holds the key. Letters are taken in pairs.', dots, 0);

    if (REDUCE) {
      cap(capNode, 'Same row: shift right. Same column: shift down. Rectangle: swap columns.', dots, 1);
      return null;
    }

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
    tl.call(clear, [], 0);
    tl.call(function () { cap(capNode, 'A 5×5 square holds the key. Letters are taken in pairs.', dots, 0); });
    tl.to({}, { duration: 1.2 });

    tl.call(function () { cap(capNode, 'Same row — each letter takes the cell to its right.', dots, 1); });
    tl.call(step(2, 3, 3, 4, 'A', 'R'), [], '<');
    tl.to({}, { duration: 2.0 });

    tl.call(function () { cap(capNode, 'Same column — each letter takes the cell below.', dots, 2); });
    tl.call(step(0, 5, 5, 10, 'C', 'E'), [], '<');
    tl.to({}, { duration: 2.0 });

    tl.call(function () { cap(capNode, 'Rectangle — each keeps its row and takes the other column.', dots, 2); });
    tl.call(step(3, 6, 1, 8, 'O', 'B'), [], '<');
    tl.to({}, { duration: 2.0 });
    return tl;
  }

  function demoVigenere(stage, capNode, dots) {
    var msg = 'ATTACKATDAWN';
    var key = 'LEMONLEMONLE';
    var out = C.vigenere(msg, 'LEMON', false);

    var rp = row('plain'), rk = row('key'), rc = row('cipher');
    var pTiles = [], kTiles = [], cTiles = [];
    var i;

    for (i = 0; i < msg.length; i++) {
      var a = tile(msg[i], 'p'); rp.appendChild(a); pTiles.push(a);
      var b = tile(key[i], 'k'); rk.appendChild(b); kTiles.push(b);
      var c = tile(out[i], 'c'); rc.appendChild(c); cTiles.push(c);
    }
    stage.appendChild(rp);
    stage.appendChild(rk);
    stage.appendChild(rc);

    function revealRow(tiles) {
      return function () {
        tiles.forEach(function (t, idx) {
          if (REDUCE) { gsap.set(t, { opacity: 1, y: 0 }); return; }
          gsap.to(t, { opacity: 1, y: 0, duration: 0.26, delay: idx * 0.03, ease: 'power2.out' });
        });
      };
    }

    cap(capNode, 'Start with the message.', dots, 0);

    if (!REDUCE) gsap.set(kTiles.concat(cTiles), { opacity: 0, y: 6 });

    if (REDUCE) {
      cap(capNode, 'A keyword repeats under the message. Each letter is shifted by its own key letter, so the same plaintext letter can encrypt to different results.', dots, 1);
      return null;
    }

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.0 });
    tl.call(function () { cap(capNode, 'Start with the message.', dots, 0); });
    tl.call(revealRow(pTiles), [], 0.05);
    tl.to({}, { duration: 1.0 });
    tl.call(function () { cap(capNode, 'Repeat the keyword underneath — one shift per letter.', dots, 1); });
    tl.call(revealRow(kTiles), [], '<');
    tl.to({}, { duration: 1.3 });
    tl.call(function () { cap(capNode, 'The same letter, twice, with two different keys — two different results.', dots, 2); });
    tl.call(revealRow(cTiles), [], '<');
    tl.to({}, { duration: 1.2 });
    tl.call(function () {
      gsap.fromTo([pTiles[1], pTiles[2]], { scale: 1 }, { scale: 1.25, duration: 0.3, yoyo: true, repeat: 2, ease: 'power2.inOut' });
      gsap.fromTo([cTiles[1], cTiles[2]], { scale: 1 }, { scale: 1.25, duration: 0.3, yoyo: true, repeat: 2, ease: 'power2.inOut', delay: 0.1 });
    }, [], '<');
    tl.to({}, { duration: 2.0 });
    return tl;
  }

  function demoVernam(stage, capNode, dots) {
    var CIPHER = 'QXZM';
    var states = [
      { p: 'SEND', k: 'YTMJ' },
      { p: 'HOLD', k: 'JJOJ' }
    ];

    var rp = row('message'), rk = row('pad'), rc = row('cipher');
    var pTiles = [], kTiles = [], cTiles = [];
    var i;

    for (i = 0; i < 4; i++) {
      var a = tile(states[0].p[i], 'p'); rp.appendChild(a); pTiles.push(a);
      var b = tile(states[0].k[i], 'k'); rk.appendChild(b); kTiles.push(b);
      var c = tile(CIPHER[i], 'c'); rc.appendChild(c); cTiles.push(c);
    }
    stage.appendChild(rp);
    stage.appendChild(rk);
    stage.appendChild(rc);

    function apply(state) {
      return function () {
        pTiles.concat(kTiles).forEach(function (t, idx) {
          var next = idx < 4 ? state.p[idx] : state.k[idx - 4];
          if (REDUCE) { t.textContent = next; return; }
          gsap.to(t, {
            y: -6, opacity: 0, duration: 0.14, delay: (idx % 4) * 0.04,
            onComplete: function () {
              t.textContent = next;
              gsap.to(t, { y: 0, opacity: 1, duration: 0.2 });
            }
          });
        });
      };
    }

    cap(capNode, 'Message goes in, a random pad just as long goes alongside.', dots, 0);

    if (REDUCE) {
      cap(capNode, 'A random pad as long as the message. The same ciphertext read with a different key is a different message — every key is equally likely.', dots, 1);
      return null;
    }

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
    tl.call(function () { cap(capNode, 'Message goes in, a random pad just as long goes alongside.', dots, 0); });
    tl.call(function () {
      pTiles.concat(kTiles, cTiles).forEach(function (t, idx) {
        gsap.fromTo(t, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.26, delay: idx * 0.03, ease: 'power2.out' });
      });
    }, [], 0.05);
    tl.to({}, { duration: 2.0 });

    tl.call(function () { cap(capNode, 'Same ciphertext. A different key gives a completely different message.', dots, 1); });
    tl.call(apply(states[1]), [], '<');
    tl.to({}, { duration: 2.4 });

    tl.call(function () { cap(capNode, 'Every key is equally likely, so every message is. That is perfect secrecy.', dots, 2); });
    tl.call(apply(states[0]), [], '<');
    tl.to({}, { duration: 2.2 });
    return tl;
  }

  var DEMOS = {
    caesar: demoCaesar,
    playfair: demoPlayfair,
    vigenere: demoVigenere,
    vernam: demoVernam
  };

  function buildDemo(mode) {
    if (demoTL) { demoTL.kill(); demoTL = null; }
    var stage = $('#demo');
    stage.textContent = '';
    var build = DEMOS[mode];
    if (!build) return;
    demoTL = build(stage, $('#demoCap'), $('#demoDots'));
  }

  /* ---------- rail fence explainer ---------- */

  function demoRail(stage, capNode, dots) {
    var text = 'ATTACKATDAWN';
    var rails = 3;
    var rows = C.railPattern(text.length, rails);
    var idx = text.split('').map(function (_, i) { return i; });
    var order = idx.slice().sort(function (a, b) { return rows[a] - rows[b] || a - b; });
    var rank = {};
    order.forEach(function (v, k) { rank[v] = k; });

    var PITCH = 29, GAPY = 47, N = text.length;

    var plane = el('div', 'demo-plane');
    plane.style.width = (N * PITCH) + 'px';
    plane.style.height = '74px';

    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < N; c++) {
        var slot = el('span', 'dslot');
        slot.style.left = (c * PITCH) + 'px';
        slot.style.top = (r * GAPY) + 'px';
        plane.appendChild(slot);
      }
    }

    var labA = el('span', 'dlabel demo-abs', 'plaintext');
    labA.style.left = '-58px'; labA.style.top = '4px';
    plane.appendChild(labA);
    var labB = el('span', 'dlabel demo-abs', 'row order');
    labB.style.left = '-58px'; labB.style.top = (GAPY + 4) + 'px';
    plane.appendChild(labB);

    var tiles = [];
    for (var i = 0; i < N; i++) {
      var t = tile(text[i], 'p');
      t.classList.add('abs');
      t.style.left = '0px';
      t.style.top = '0px';
      plane.appendChild(t);
      gsap.set(t, { x: i * PITCH, y: 0 });
      tiles.push(t);
    }

    stage.appendChild(plane);

    cap(capNode, 'Every letter is present, in its original order.', dots, 0);

    if (REDUCE) {
      tiles.forEach(function (t, i) {
        gsap.set(t, { x: rank[i] * PITCH, y: GAPY });
        t.classList.add('c');
      });
      cap(capNode, 'The letters never change. Rail fence only moves them: the same characters, read off in a different order.', dots, 1);
      return null;
    }

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
    tl.call(function () { cap(capNode, 'Every letter is present, in its original order.', dots, 0); });
    tl.to({}, { duration: 1.2 });
    tl.call(function () { cap(capNode, 'Nothing is substituted — the letters only change places.', dots, 1); });
    tiles.forEach(function (t, i) {
      tl.to(t, {
        x: rank[i] * PITCH, y: GAPY, duration: 0.55, ease: 'power3.inOut',
        onStart: function () { t.classList.remove('p'); t.classList.add('c'); }
      }, '<' + (i * 0.025));
    });
    tl.to({}, { duration: 2.2 });
    tl.call(function () { cap(capNode, 'Same characters, different order. That is the whole cipher.', dots, 2); });
    tl.call(function () {
      tiles.forEach(function (t, i) {
        t.classList.remove('c');
        t.classList.add('p');
        gsap.set(t, { x: i * PITCH, y: 0 });
      });
    }, [], '<');
    tl.to({}, { duration: 1.4 });
    return tl;
  }

  /* ══════════════════════════════════════════════════ module 02 ════════════ */

  var railState = { text: 'ATTACKATDAWN', rails: 3, mode: 'encrypt' };
  var railView = null;
  var railTL = null;

  function renderRail(play) {
    var stage = $('#railStage');
    var scroller = $('#railScroll');
    var outEl = $('#railOut');
    var rowsEl = $('#railRows');

    if (railTL) { railTL.kill(); railTL = null; }
    if (railView) gsap.killTweensOf(railView.cells.map(function (c) { return c.el; }));

    stage.textContent = '';
    rowsEl.textContent = '';
    railView = null;

    var chars = Array.from(railState.text).slice(0, 120);
    var rails = railState.rails;
    var dec = railState.mode === 'decrypt';

    if (!chars.length) {
      stage.style.width = '0px';
      stage.style.height = '0px';
      outEl.textContent = '';
      $('#railStat').textContent = 'empty';
      return;
    }

    var n = chars.length;
    var rows = C.railPattern(n, rails);

    var cells = [];
    for (var i = 0; i < n; i++) cells.push({ i: i, row: rows[i], ch: '', readRank: 0 });

    var rowMajor = cells.slice().sort(function (a, b) { return a.row - b.row || a.i - b.i; });
    var output = '';

    if (!dec) {
      for (i = 0; i < n; i++) cells[i].ch = chars[i];
      output = rowMajor.map(function (c) { return c.ch; }).join('');
    } else {
      for (i = 0; i < n; i++) rowMajor[i].ch = chars[i];
      output = cells.map(function (c) { return c.ch; }).join('');
    }

    var fillOrder = dec ? rowMajor : cells;
    var readOrder = dec ? cells : rowMajor;

    var gutter = 22, gap = 3;
    var avail = Math.max(200, scroller.clientWidth - gutter - 4);
    var cw = Math.floor((avail - gap * (n - 1)) / n);
    cw = Math.max(15, Math.min(38, cw));
    var chh = 32;
    var W = gutter + n * cw + (n - 1) * gap;
    var H = rails * chh + (rails - 1) * gap;

    stage.style.width = W + 'px';
    stage.style.height = H + 'px';

    for (var r = 0; r < rails; r++) {
      var band = el('div', 'rband' + (r % 2 ? ' is-odd' : ''));
      band.style.cssText = 'top:' + (r * (chh + gap)) + 'px;height:' + chh + 'px;width:' + W + 'px';
      stage.appendChild(band);

      var lab = el('span', 'rlabel', String(r + 1));
      lab.style.cssText = 'top:' + (r * (chh + gap)) + 'px;height:' + chh + 'px';
      stage.appendChild(lab);
    }

    var svg = svgEl('svg', { class: 'rail-svg', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H });
    var pts = cells.map(function (c) {
      return (gutter + c.i * (cw + gap) + cw / 2) + ',' + (c.row * (chh + gap) + chh / 2);
    }).join(' ');
    var poly = svgEl('polyline', { points: pts });
    svg.appendChild(poly);
    stage.appendChild(svg);

    var dot = el('div', 'rail-dot');
    stage.appendChild(dot);

    var fontSize = Math.max(10, Math.min(14, cw * 0.42));

    cells.forEach(function (c) {
      var x = gutter + c.i * (cw + gap);
      var y = c.row * (chh + gap);
      var d = el('div', 'rcell' + (c.ch === ' ' ? ' is-space' : ''));
      d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + cw + 'px;height:' + chh + 'px';
      var glyph = el('span', 'rc-char', c.ch === ' ' ? '␣' : c.ch);
      glyph.style.fontSize = fontSize + 'px';
      d.appendChild(glyph);
      d.appendChild(el('span', 'rc-badge', ''));
      d.addEventListener('click', function () { flashCell(c); });
      stage.appendChild(d);
      c.el = d;
    });

    readOrder.forEach(function (c, idx) { c.readRank = idx + 1; });

    var pillRefs = [];
    for (r = 0; r < rails; r++) {
      var rw = el('div', 'rrow');
      rw.appendChild(el('b', null, String(r + 1)));
      var letters = cells.filter(function (c) { return c.row === r; })
        .map(function (c) { return c.ch === ' ' ? '␣' : c.ch; }).join(' ');
      rw.appendChild(el('span', null, letters));
      rowsEl.appendChild(rw);
      pillRefs.push(rw);
    }

    $('#railStat').textContent = n + ' chars · ' + rails + ' rails';

    railView = {
      cells: cells, fillOrder: fillOrder, readOrder: readOrder,
      poly: poly, dot: dot, output: output, pillRefs: pillRefs
    };

    outEl.textContent = output;

    if (play) playRail();
  }

  function flashCell(c) {
    if (!c.el) return;
    gsap.fromTo(c.el, { backgroundColor: 'rgba(233,182,103,.34)' }, {
      backgroundColor: '#0b0e11', duration: 0.55, ease: 'power2.out', overwrite: 'auto'
    });
  }

  function playRail() {
    var v = railView;
    if (!v) return;
    if (railTL) railTL.kill();

    var outEl = $('#railOut');
    var els = v.cells.map(function (c) { return c.el; });

    v.pillRefs.forEach(function (p) { p.classList.remove('is-on'); });

    if (REDUCE) {
      gsap.set(els, { opacity: 1, scale: 1, y: 0 });
      v.cells.forEach(function (c) {
        c.el.classList.add('is-read');
        c.el.querySelector('.rc-badge').textContent = String(c.readRank);
      });
      outEl.textContent = v.output;
      return;
    }

    gsap.set(els, { opacity: 0, scale: 0.82, y: 8 });
    els.forEach(function (e) {
      e.classList.remove('is-read', 'is-fill');
      e.querySelector('.rc-badge').textContent = '';
    });
    outEl.textContent = '';

    var polyLen = 0;
    try { polyLen = v.poly.getTotalLength(); } catch (err) { polyLen = 0; }
    gsap.set(v.poly, { strokeDasharray: polyLen || 1, strokeDashoffset: polyLen || 1, opacity: 0 });
    gsap.set(v.dot, { opacity: 0, left: 0, top: 0 });

    var n = v.cells.length;
    var fillStep = Math.max(0.012, Math.min(0.05, 0.9 / n));
    var readStep = Math.max(0.011, Math.min(0.04, 0.8 / n));
    var fillDur = fillStep * n + 0.34;
    var readDur = readStep * n;
    var tl = gsap.timeline();
    railTL = tl;

    v.fillOrder.forEach(function (c, i) {
      var at = i * fillStep;
      tl.to(c.el, { opacity: 1, scale: 1, y: 0, duration: 0.34, ease: 'back.out(2.4)' }, at);
      tl.call(function () { c.el.classList.add('is-fill'); }, [], at);
    });

    var dotP = { p: 0 };
    function moveDot() {
      if (!polyLen) return;
      try {
        var pt = v.poly.getPointAtLength(Math.min(polyLen, dotP.p * polyLen));
        v.dot.style.left = pt.x + 'px';
        v.dot.style.top = pt.y + 'px';
      } catch (err) {}
    }

    var zigzagPhase = railState.mode === 'decrypt' ? 'read' : 'fill';
    if (zigzagPhase === 'fill') {
      tl.to(v.poly, { strokeDashoffset: 0, opacity: 1, duration: fillDur, ease: 'none' }, 0);
      tl.to(v.dot, { opacity: 1, duration: 0.12 }, 0);
      tl.to(dotP, { p: 1, duration: fillDur, ease: 'none', onUpdate: moveDot }, 0);
      tl.to(v.dot, { opacity: 0, duration: 0.2 }, fillDur);
    }

    var t0 = fillDur + 0.14;
    var buf = '';

    v.readOrder.forEach(function (c, i) {
      tl.call(function () {
        c.el.classList.remove('is-fill');
        c.el.classList.add('is-read');
        c.el.querySelector('.rc-badge').textContent = String(i + 1);

        v.pillRefs.forEach(function (p) { p.classList.remove('is-on'); });
        v.pillRefs[c.row].classList.add('is-on');

        buf += c.ch;
        outEl.textContent = buf;
      }, [], t0 + i * readStep);
    });

    if (zigzagPhase === 'read') {
      tl.to(v.poly, { strokeDashoffset: 0, opacity: 1, duration: readDur, ease: 'none' }, t0);
      tl.to(v.dot, { opacity: 1, duration: 0.12 }, t0);
      tl.to(dotP, { p: 1, duration: readDur, ease: 'none', onUpdate: moveDot }, t0);
      tl.to(v.dot, { opacity: 0, duration: 0.2 }, t0 + readDur);
    }

    tl.call(function () {
      outEl.textContent = v.output;
      v.pillRefs.forEach(function (p) { p.classList.remove('is-on'); });
    }, [], t0 + (n - 1) * readStep + 0.2);
  }

  /* ---------- wiring: module 02 ---------- */

  function updateRailLabels() {
    var dec = railState.mode === 'decrypt';
    $('#railTextLabel').textContent = dec ? 'Ciphertext' : 'Plaintext';
    $('#railOutLabel').textContent = dec ? 'Plaintext' : 'Ciphertext';
    $$('.seg [data-mode]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.mode === railState.mode);
    });
  }

  $('#railText').addEventListener('input', function (e) {
    railState.text = e.target.value;
    renderRail(false);
  });

  $$('[data-rails]').forEach(function (b) {
    b.addEventListener('click', function () {
      railState.rails = +b.dataset.rails;
      $$('[data-rails]').forEach(function (o) { o.classList.toggle('is-on', o === b); });
      renderRail(true);
    });
  });

  $$('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.mode === railState.mode) return;
      var carry = railView ? railView.output : '';
      railState.mode = b.dataset.mode;
      if (carry) {
        railState.text = carry;
        $('#railText').value = carry;
      }
      updateRailLabels();
      renderRail(true);
    });
  });

  $('#railPlay').addEventListener('click', function () { renderRail(true); });

  $('#railSample').addEventListener('click', function () {
    railState.text = 'ATTACKATDAWN';
    $('#railText').value = railState.text;
    renderRail(true);
  });

  $('#copyRail').addEventListener('click', function () {
    copyText($('#railOut').textContent, this);
  });

  /* ══════════════════════════════════════════════════ boot ═════════════════ */

  function intro() {
    if (REDUCE) return;
    var tl = gsap.timeline();
    tl.fromTo('.bar-in', { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE });
    tl.fromTo('.rail .nav', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.06, ease: EASE }, 0.12);
    tl.fromTo('#substitution > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.055, ease: EASE, clearProps: 'transform,opacity' }, 0.18);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (railView) renderRail(false);
    }, 160);
  });

  function boot() {
    buildRing();
    paintRing();
    syncRingK();
    buildPF();

    sub.text = $('#subText').value;
    renderMode();
    buildTrace();
    applyKey(3, { instant: true });

    buildDemo(sub.mode);
    railTLdemo = demoRail($('#demoRail'), $('#demoRailCap'), $('#demoRailDots'));

    renderRail(false);
    updateRailLabels();

    var start = (location.hash || '').slice(1);
    goTo(PANELS.indexOf(start) >= 0 ? start : 'substitution', false);
    intro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
