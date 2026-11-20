/* jelgo: Squeeze to unlock popup (own file so nothing else on the page can stop it). */
(function () {
  try {
  /* ---------- squeeze to unlock: hold 5 s, discount climbs to 20%, pouch bursts; then name + email reveal GETTODAY ---------- */
  (function () {
    var wrap = document.querySelector('[data-sq-popup]'); if (!wrap) return;
    var dialog = wrap.querySelector('.sq-dialog'), stage = wrap.querySelector('[data-sq-stage]');
    var pouch = wrap.querySelector('[data-sq-pouch]'), secs = wrap.querySelector('[data-sq-secs]'), pctEl = wrap.querySelector('[data-sq-pct]'), pctBox = pctEl.parentNode;
    var hint = wrap.querySelector('[data-sq-hint]'), status = wrap.querySelector('[data-sq-status]'), muteBtn = wrap.querySelector('[data-sq-mute]');
    var fx = wrap.querySelector('[data-sq-fx]'), ctx = fx.getContext && fx.getContext('2d');
    var steps = { play: wrap.querySelector('[data-sq-step="play"]'), email: wrap.querySelector('[data-sq-step="email"]'), won: wrap.querySelector('[data-sq-step="won"]') };
    var form = wrap.querySelector('[data-sq-form]'), err = wrap.querySelector('[data-sq-err]');
    var timer = wrap.querySelector('[data-sq-timer]'), pill = document.querySelector('[data-sq-pill]'), pillTimer = pill && pill.querySelector('[data-sq-pill-timer]');
    var KEY = 'jelgo-squeeze-v2', DAY = 24 * 3600 * 1000, HOLD = 5000, DRAIN = 1800;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tick = 0, lastFocus = null, held = false, p = 0, raf = 0, last = 0, done = false, step = 0, parts = [], spawnAcc = 0;
    function get(k, s) { try { return (s || localStorage).getItem(k); } catch (e) { return null; } }
    function set(k, v, s) { try { (s || localStorage).setItem(k, v); } catch (e) {} }
    var muted = get('jelgo-sq-muted') === '1'; muteBtn.setAttribute('aria-pressed', String(muted)); muteBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
    if (/[?&]squeeze=reset/.test(location.search)) { ['', '-email'].forEach(function (s) { try { localStorage.removeItem(KEY + s); } catch (e) {} }); try { sessionStorage.removeItem(KEY + '-closed'); } catch (e) {} }
    function unlockedAt() { var t = Number(get(KEY)); return t > 0 ? t : 0; }
    function revealed() { return get(KEY + '-email') === '1'; }
    function left() { var t = unlockedAt(); return t ? Math.max(0, t + DAY - Date.now()) : 0; }
    function fmt(ms) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(function (n) { return String(n).padStart(2, '0'); }).join(':'); }
    function render() {
      var ms = left(), txt = fmt(ms);
      if (timer) timer.textContent = txt;
      if (pill) { pill.hidden = !(unlockedAt() && ms > 0 && wrap.hidden); if (pillTimer) pillTimer.textContent = revealed() ? txt : 'unlock'; }
    }
    function startTick() { if (!tick) { render(); tick = setInterval(render, 1000); } }
    function show(name) {
      Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== name; });
      if (name !== 'play') startTick();
      var f = name === 'email' ? steps.email.querySelector('input[type=text]') : name === 'won' ? steps.won.querySelector('[data-copy]') : null;
      if (f) setTimeout(function () { f.focus(); }, 60);
    }
    function buzz(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

    // ---- sound (synthesized, starts only after the visitor presses) ----
    var ac = null, osc = null, gain = null;
    function audio() { if (muted) return null; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; } return ac; }
    function humStart() {
      var a = audio(); if (!a || osc) return;
      osc = a.createOscillator(); gain = a.createGain(); osc.type = 'triangle'; osc.frequency.value = 180;
      gain.gain.value = 0; gain.gain.linearRampToValueAtTime(0.05, a.currentTime + 0.08);
      osc.connect(gain).connect(a.destination); osc.start();
    }
    function humSet(v) { if (osc && ac) osc.frequency.setTargetAtTime(180 + 620 * v, ac.currentTime, 0.05); }
    function humStop() { if (!osc || !ac) return; var o = osc, g = gain; g.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(function () { try { o.stop(); } catch (e) {} }, 250); osc = null; gain = null; }
    function blip(f, d, type, vol) {
      var a = audio(); if (!a) return;
      var o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || 0.12, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (d || 0.15));
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + (d || 0.15) + 0.02);
    }
    function pop() {
      var a = audio(); if (!a) return;
      var len = a.sampleRate * 0.25, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = 0.35; s.connect(g).connect(a.destination); s.start();
      [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, 0.22, 'triangle', 0.1); }, 90 + i * 85); });
    }

    // ---- particles: jelly spray while squeezing ----
    function sizeFx() { var r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); fx.width = r.width * dpr; fx.height = r.height * dpr; if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function capPoint() { var s = stage.getBoundingClientRect(), r = pouch.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.12 }; }
    var COLORS = ['#F28C1E', '#F7A84B', '#FFC56B', '#E8505B'];
    function spawn(n, power) {
      var c = capPoint();
      for (var i = 0; i < n; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * (0.6 + power * 1.2), sp = 2.5 + Math.random() * 3 + power * 6;
        parts.push({ x: c.x + (Math.random() - 0.5) * 8, y: c.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 3 + Math.random() * 4 + power * 3, life: 1, c: COLORS[(Math.random() * COLORS.length) | 0] });
      }
    }
    function drawParts(dt) {
      if (!ctx) return; var w = fx.width, h = fx.height; ctx.clearRect(0, 0, w, h);
      for (var i = parts.length - 1; i >= 0; i--) {
        var q = parts[i]; q.vy += 0.25 * dt / 16; q.x += q.vx * dt / 16; q.y += q.vy * dt / 16; q.life -= dt / 1400;
        if (q.life <= 0 || q.y > h) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, q.life); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function paint() {
      var shake = held && !reduce ? (1.5 + 7 * p) : 0;
      pouch.style.setProperty('--sx', ((Math.random() - 0.5) * shake).toFixed(1) + 'px');
      pouch.style.setProperty('--sy', ((Math.random() - 0.5) * shake * 0.6).toFixed(1) + 'px');
      pouch.style.setProperty('--sr', ((Math.random() - 0.5) * shake * 0.5).toFixed(2) + 'deg');
      pouch.style.setProperty('--p', p.toFixed(3)); pouch.style.setProperty('--h', held ? '1' : '0');
      wrap.style.setProperty('--p', p.toFixed(3)); stage.style.setProperty('--p', p.toFixed(3));
      secs.textContent = Math.max(0, (HOLD * (1 - p)) / 1000).toFixed(1) + ' s';
      pctEl.textContent = Math.round(20 * p) + '%';
    }
    function milestone(n) {
      pctBox.classList.remove('bump'); void pctBox.offsetWidth; pctBox.classList.add('bump');
      setTimeout(function () { pctBox.classList.remove('bump'); }, 200);
      blip(440 + n * 160, 0.12, 'square', 0.06); buzz(25 + n * 10); spawn(10 + n * 6, 0.6 + n * 0.1);
    }
    function loop(now) {
      var dt = Math.min(250, now - (last || now)); last = now;
      if (done) p = 1; else if (held) p = Math.min(1, p + dt / HOLD); else p = Math.max(0, p - dt / DRAIN);
      var s = Math.floor(p * 4 + 1e-6); if (s > step && held) { step = s; if (s < 4) milestone(s); } else if (s < step) step = s;
      if (held && !reduce) { spawnAcc += dt * (0.01 + p * 0.06); var n = spawnAcc | 0; if (n) { spawn(n, p); spawnAcc -= n; } }
      humSet(p); paint(); drawParts(dt);
      if (held && !done) status.textContent = p < 0.25 ? 'Squeezing… keep holding!' : p < 0.5 ? 'It\'s climbing! Keep going!' : p < 0.75 ? 'Halfway! Don\'t let go!' : 'Almost there… last drop!';
      if (p >= 1 && !done) finish();
      if (held || (p > 0 && !done) || parts.length) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
    }
    function press(e) {
      if (done) return; if (e && e.preventDefault) e.preventDefault();
      if (held) return; held = true; pouch.classList.add('held'); hint.textContent = 'Keep holding!';
      status.classList.remove('go'); buzz(15); humStart(); sizeFx();
      if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    }
    function release() {
      if (!held) return; held = false; pouch.classList.remove('held'); humStop();
      if (!done) { hint.textContent = 'Press & hold'; if (p > 0.02) { status.textContent = 'You let go! It\'s dropping… grab it again!'; status.classList.add('go'); blip(220, 0.25, 'sawtooth', 0.05); } }
      if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    }
    function confetti() {
      if (reduce) return;
      var c = document.createElement('canvas'); c.className = 'sq-confetti'; document.body.appendChild(c);
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr;
      var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var r = pouch.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height * 0.4;
      var cols = ['#F28C1E', '#A23FC2', '#E8505B', '#8DC63F', '#7366DE'], bits = [];
      for (var i = 0; i < 170; i++) { var a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 12; bits.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: 4 + Math.random() * 7, c: cols[i % 5], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, blob: Math.random() < 0.6 }); }
      var t0 = performance.now();
      (function frame(now) {
        var t = now - t0; g.clearRect(0, 0, W, H);
        bits.forEach(function (b) { b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.rot += b.vr; g.save(); g.globalAlpha = Math.max(0, 1 - t / 2200); g.translate(b.x, b.y); g.rotate(b.rot); g.fillStyle = b.c; if (b.blob) { g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI * 2); g.fill(); } else g.fillRect(-b.r, -b.r / 3, b.r * 2, b.r * 0.66); g.restore(); });
        if (t < 2200) requestAnimationFrame(frame); else c.remove();
      })(t0);
    }
    function finish() {
      done = true; held = false; pouch.classList.remove('held'); pouch.classList.add('done'); humStop();
      p = 1; paint(); pctEl.textContent = '20%'; pctBox.classList.add('bump');
      hint.textContent = 'Empty!'; status.textContent = 'POP! You unlocked 20% off!'; wrap.classList.add('done'); dialog.classList.add('flash');
      spawn(60, 1.2); pop(); buzz([40, 40, 120]); confetti();
      set(KEY, String(Date.now()));
      setTimeout(function () { show('email'); }, 1100);
    }
    muteBtn.addEventListener('click', function () { muted = !muted; set('jelgo-sq-muted', muted ? '1' : '0'); muteBtn.setAttribute('aria-pressed', String(muted)); muteBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound'); if (muted) humStop(); });
    stage.addEventListener('pointerdown', function (e) { if (e.target.closest('[data-sq-mute]')) return; if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (x) {} } press(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { stage.addEventListener(ev, release); });
    window.addEventListener('blur', release);
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    pouch.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });
    pouch.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); });
    document.addEventListener('keydown', function (e) { if (e.key === ' ' && !wrap.hidden && !steps.play.hidden && document.activeElement !== pouch && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); press(); } });
    document.addEventListener('keyup', function (e) { if (e.key === ' ' && held && document.activeElement !== pouch) release(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var name = form.querySelector('[name="contact[first_name]"]'), email = form.querySelector('[name="contact[email]"]'), ok = form.querySelector('[name="sq_consent"]');
      if (!name.value.trim()) { err.textContent = 'Please enter your first name.'; name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { err.textContent = 'Please enter a valid email.'; email.focus(); return; }
      if (!ok.checked) { err.textContent = 'Tick the box so we can email you.'; ok.focus(); return; }
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Unlocking…';
      var fin = function () { set(KEY + '-email', '1'); show('won'); btn.disabled = false; btn.textContent = 'Reveal my code'; blip(880, 0.18, 'triangle', 0.08); };
      // saves them as a Shopify customer subscribed to email marketing (tags: newsletter, squeeze-unlock)
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { 'Accept': 'text/html' } }).then(fin, fin);
    });
    function open() {
      lastFocus = document.activeElement; wrap.hidden = false; if (pill) pill.hidden = true; sizeFx();
      if (unlockedAt()) { done = true; p = 1; paint(); pouch.classList.add('done'); hint.textContent = 'Empty!'; show(revealed() ? 'won' : 'email'); }
      else { paint(); show('play'); }
    }
    function close() { release(); humStop(); wrap.hidden = true; set(KEY + '-closed', '1', sessionStorage); render(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    wrap.querySelectorAll('[data-sq-close]').forEach(function (x) { x.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !wrap.hidden) close(); });
    window.addEventListener('resize', function () { if (!wrap.hidden) sizeFx(); });
    if (pill) pill.addEventListener('click', open);
    if (unlockedAt()) { if (left() > 0) startTick(); render(); return; }
    if (get(KEY + '-closed', sessionStorage)) return;
    setTimeout(function () { if (wrap.hidden) open(); }, 1500);
  })();
  } catch (e) { if (window.console) console.error('jelgo squeeze', e); }
})();
