(function () {
  var T = window.jelgo || {};
  var root = T.root || '/';
  if (root.slice(-1) !== '/') root += '/';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- money ---------- */
  function fmt(cents) {
    var f = T.moneyFormat || '${{amount}}';
    cents = Number(cents) || 0;
    function withDelims(n, prec, thou, dec) {
      var parts = (n / 100).toFixed(prec).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thou);
      return parts.join(dec);
    }
    return f.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return withDelims(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return withDelims(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelims(cents, 0, '.', ',');
        default: return withDelims(cents, 2, ',', '.');
      }
    });
  }
  window.jelgoMoney = fmt;

  /* ---------- accent ---------- */
  function setAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--p', color);
    var hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    if (isNaN(n)) return;
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    document.documentElement.style.setProperty('--on-p', lum > 0.6 ? '#15172A' : '#FFFFFF');
  }
  setAccent(getComputedStyle(document.documentElement).getPropertyValue('--p').trim());

  /* ---------- header shadow ---------- */
  var header = $('header.top');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  /* ---------- hero carousel ---------- */
  $$('[data-hero]').forEach(function (hero) {
    var slides = $$('.slide', hero), dots = $$('.dot', hero);
    if (!slides.length) return;
    var stage = $('.stage', hero), cur = 0, timer = null, paused = false;
    var dur = Number(hero.getAttribute('data-interval')) || 4000;
    function stop() { clearTimeout(timer); timer = null; }
    function go(i) {
      var n = slides.length; cur = (i + n) % n;
      slides.forEach(function (s, k) {
        var d = (k - cur + n) % n; if (d > n / 2) d -= n;
        s.setAttribute('data-pos', (d === 0 || d === 1 || d === -1) && n > 1 ? String(d) : (d === 0 ? '0' : 'hide'));
        s.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      });
      dots.forEach(function (d, k) {
        d.classList.remove('on', 'done'); void d.offsetWidth;
        if (k < cur) d.classList.add('done');
        d.setAttribute('aria-selected', k === cur ? 'true' : 'false');
        if (k === cur) d.classList.add('on');
      });
      var s = slides[cur];
      setAccent(s.getAttribute('data-color'));
      var nm = $('[data-tag-name]', hero), fl = $('[data-tag-flav]', hero), ln = $('[data-tag-link]', hero);
      if (nm) nm.textContent = s.getAttribute('data-name');
      if (fl) fl.textContent = s.getAttribute('data-flav');
      if (ln) { ln.href = s.getAttribute('data-url'); ln.setAttribute('aria-label', 'View ' + s.getAttribute('data-name')); }
      stop();
      if (!reduce && !paused && slides.length > 1) timer = setTimeout(function () { go(cur + 1); }, dur);
    }
    slides.forEach(function (s, k) {
      s.addEventListener('click', function () { if (k === cur) window.location.href = s.getAttribute('data-url'); else go(k); });
    });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    stage.addEventListener('mouseenter', function () { paused = true; hero.classList.add('paused'); stop(); });
    stage.addEventListener('mouseleave', function () { paused = false; hero.classList.remove('paused'); go(cur); });
    var sx = null;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (!paused) go(cur); });
    go(0);
  });

  /* ---------- how it works: scroll-driven scene ---------- */
  var sq = $('[data-squeeze]');
  if (sq) {
    var steps = $$('.step', sq), stick = $('.squeeze-stick', sq), ticking = false;
    var label = $('[data-scene-label]', sq), timerEl = $('[data-scene-timer]', sq), bar = $('[data-scene-bar]', sq);
    var names = ['Twist', 'Squeeze', 'Go'];
    var tick = function () {
      ticking = false;
      if (!steps.length || !stick) return;
      var mid = window.innerHeight * 0.55, active = 0;
      steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < mid) active = i; });
      steps.forEach(function (s, i) { s.classList.toggle('active', i === active); });
      var state = Math.min(active, 2) + 1, secs = 0, squeeze = 1;
      if (state === 2 && steps[1]) {
        var r = steps[1].getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
        secs = p * 10; squeeze = 1 - 0.28 * p;
      } else if (state === 3) { secs = 10; squeeze = 0.72; }
      stick.setAttribute('data-state', String(state));
      stick.style.setProperty('--sq', squeeze.toFixed(3));
      if (label) label.textContent = 'Step ' + state + ' · ' + (names[state - 1] || '');
      if (timerEl) timerEl.textContent = state === 3 ? 'Done in 10 s' : secs.toFixed(1) + ' s';
      if (bar) bar.style.width = (secs * 10).toFixed(1) + '%';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  /* ---------- collection filter ---------- */
  $$('[data-filters]').forEach(function (bar) {
    var grid = document.getElementById(bar.getAttribute('data-filters'));
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      var f = b.getAttribute('data-f');
      $$('[data-f]', bar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('[data-goal]', grid).forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-goal') === f); });
    });
  });

  /* ---------- product form ---------- */
  $$('[data-product-form]').forEach(function (form) {
    var addBtn = $('[data-add]', form), perEl = $('[data-per]', form.parentNode) || $('[data-per]');
    var qtyIn = $('input[name="quantity"]', form);
    function selectedVariant() { return $('input[name="id"]:checked', form) || $('input[name="id"]', form); }
    function selectedPlan() { return $('input[name="selling_plan"]:checked', form); }
    function update() {
      var v = selectedVariant(); if (!v) return;
      var price = Number(v.getAttribute('data-price'));
      var pack = Number(v.getAttribute('data-pack')) || 0;
      var avail = v.getAttribute('data-available') === 'true';
      var plan = selectedPlan(), pct = plan ? Number(plan.getAttribute('data-pct')) || 0 : 0;
      var unit = Math.round(price * (1 - pct / 100));
      var qty = Math.max(1, Number(qtyIn && qtyIn.value) || 1);
      $$('[data-plan-price]', form).forEach(function (el) {
        var p = Number(el.getAttribute('data-plan-pct')) || 0;
        el.textContent = fmt(Math.round(price * (1 - p / 100)));
      });
      if (addBtn) {
        addBtn.disabled = !avail;
        addBtn.textContent = avail ? 'Add to bag · ' + fmt(unit * qty) : 'Sold out';
      }
      if (perEl && pack) perEl.textContent = fmt(Math.round(unit / pack)) + ' per pouch';
      var hint = $('[data-ship-hint]');
      if (hint && T.freeShip) {
        var left = T.freeShip - (window.jelgoCartTotal || 0) - unit * qty;
        hint.textContent = left > 0 ? 'Add ' + fmt(left) + ' more after this for free shipping.' : 'This order ships free.';
      }
      try {
        var url = new URL(window.location.href); url.searchParams.set('variant', v.value);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {}
    }
    form.addEventListener('change', update);
    $$('[data-qty]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Number(b.getAttribute('data-qty'));
        qtyIn.value = Math.min(99, Math.max(1, (Number(qtyIn.value) || 1) + d)); update();
      });
    });
    if (qtyIn) qtyIn.addEventListener('input', update);
    update();
  });

  /* ---------- cart drawer ---------- */
  var drawer = $('#drawer'), scrim = $('#scrim');
  function openBag() {
    if (!drawer) return;
    drawer.classList.add('on'); drawer.setAttribute('aria-hidden', 'false'); scrim.classList.add('on');
    setTimeout(function () { var c = $('#closeBag'); if (c) c.focus(); }, 60);
  }
  function closeBag() { if (!drawer) return; drawer.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true'); scrim.classList.remove('on'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function renderCart(cart) {
    window.jelgoCartTotal = cart.total_price;
    $$('[data-cart-count]').forEach(function (el) { el.textContent = cart.item_count; });
    if (!drawer) return;
    $('#drSub').textContent = fmt(cart.total_price);
    var fb = $('#freebar');
    if (fb && T.freeShip) {
      var left = Math.max(0, T.freeShip - cart.total_price);
      fb.innerHTML = (left > 0 ? "You're <b class=\"tnum\">" + fmt(left) + '</b> away from free shipping.' : '<b>Free shipping unlocked.</b>') +
        '<div class="track"><i style="width:' + Math.min(100, cart.total_price / T.freeShip * 100) + '%"></i></div>';
    }
    var box = $('#drItems');
    if (!cart.items.length) {
      box.innerHTML = '<div class="empty"><p>Your bag is empty.</p><a class="btn btn-ink" style="margin-top:16px" href="' + root + 'collections/all">Shop pouches</a></div>';
    } else {
      box.innerHTML = cart.items.map(function (it) {
        var color = (T.pouchColors || {})[it.handle] || '#F5B21C';
        var thumb = it.image ? '<img src="' + esc(it.image) + '" alt="" width="64" height="64" loading="lazy">' : '<i style="background:' + color + '"></i>';
        var plan = it.selling_plan_allocation ? esc(it.selling_plan_allocation.selling_plan.name) : 'One-time';
        var vt = it.variant_title ? esc(it.variant_title) + ' · ' : '';
        return '<div class="li"><a class="th" href="' + esc(it.url) + '" style="background:color-mix(in oklab,' + color + ' 22%, #fff)">' + thumb + '</a>' +
          '<div><b>' + esc(it.product_title) + '</b><small>' + vt + plan + '</small>' +
          '<div class="mini"><button class="q" data-change="' + esc(it.key) + '" data-to="' + (it.quantity - 1) + '" aria-label="Decrease">−</button><span class="tnum">' + it.quantity + '</span>' +
          '<button class="q" data-change="' + esc(it.key) + '" data-to="' + (it.quantity + 1) + '" aria-label="Increase">+</button>' +
          '<button class="rm" data-change="' + esc(it.key) + '" data-to="0">Remove</button></div></div>' +
          '<span class="lp tnum">' + fmt(it.final_line_price) + '</span></div>';
      }).join('');
    }
    var co = $('#toCheckout'); if (co) co.toggleAttribute('disabled', !cart.items.length);
  }
  function fetchCart() { return fetch(root + 'cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(renderCart); }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-ajax-add]');
    if (!form) return;
    e.preventDefault();
    var btn = $('[type="submit"]', form), err = $('[data-form-err]', form);
    if (btn) btn.setAttribute('aria-busy', 'true');
    if (err) err.textContent = '';
    fetch(root + 'cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (btn) btn.removeAttribute('aria-busy');
        if (!res.ok) { var m = res.j.description || res.j.message || 'Could not add this item. Try again.'; if (err) err.textContent = m; else toast(m); return; }
        var c = $('.bag-count'); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
        toast((res.j.product_title || 'Item') + ' added to your bag');
        return fetchCart().then(openBag);
      })
      .catch(function () { if (btn) btn.removeAttribute('aria-busy'); toast('Network problem. Check your connection and try again.'); });
  });

  document.addEventListener('click', function (e) {
    var ch = e.target.closest('[data-change]');
    if (ch) {
      fetch(root + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: ch.getAttribute('data-change'), quantity: Number(ch.getAttribute('data-to')) }) })
        .then(function (r) { return r.json(); }).then(renderCart);
      return;
    }
    if (e.target.closest('[data-open-bag]')) { e.preventDefault(); fetchCart().then(openBag); }
  });
  if (scrim) scrim.addEventListener('click', closeBag);
  var cb = $('#closeBag'); if (cb) cb.addEventListener('click', closeBag);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBag(); });
  var tc = $('#toCheckout'); if (tc) tc.addEventListener('click', function () { window.location.href = root + 'checkout'; });

  if (drawer) fetchCart().catch(function () {});

  /* ---------- 360 pouch viewer: drag, flick, tilt, keys, front/back buttons ----------
     Drives a CSS card by default; assets/spin3d.js swaps in a real 3D pouch and listens via el.__spin3d. */
  document.querySelectorAll('[data-spin]').forEach(function (el) {
    var card = el.querySelector('[data-spin-card]');
    var media = el.parentElement;
    var hint = media.querySelector('.spin-hint');
    var btns = media.querySelectorAll('[data-spin-to]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var angle = 0, tilt = 0, vel = 0, raf = 0, drag = null, touched = false;

    function render() {
      card.style.setProperty('--ry', angle.toFixed(2));
      card.style.setProperty('--rx', tilt.toFixed(2));
      var c = Math.abs(Math.cos(angle * Math.PI / 180));
      el.style.setProperty('--sw', (0.55 + 0.45 * c).toFixed(3));
      var back = Math.cos(angle * Math.PI / 180) < 0;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.spinTo === '180') === back)); });
      if (el.__spin3d) el.__spin3d(angle, tilt);
    }
    el.__spinRender = render;
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    function nearest(a) { return Math.round(a / 180) * 180; }
    function tween(to, ms, done) {
      stop();
      var from = angle, tilt0 = tilt, t0 = performance.now();
      if (reduce) ms = 1;
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        angle = from + (to - from) * e; tilt = tilt0 * (1 - e); render();
        if (t < 1) raf = requestAnimationFrame(step); else { raf = 0; if (done) done(); }
      })(t0);
    }
    function coast() {
      stop();
      (function step() {
        angle += vel; vel *= 0.94; tilt *= 0.9; render();
        if (Math.abs(vel) > 0.25) raf = requestAnimationFrame(step);
        else tween(nearest(angle), 500);
      })();
    }
    function firstTouch() { if (!touched) { touched = true; if (hint) hint.classList.add('gone'); } }

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      stop(); firstTouch();
      drag = { x: e.clientX, y: e.clientY, a: angle, lx: e.clientX, lt: performance.now() };
      vel = 0; el.classList.add('dragging');
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now(), dx = e.clientX - drag.lx, dt = Math.max(1, now - drag.lt);
      angle = drag.a + (e.clientX - drag.x) * 0.55;
      if (e.pointerType === 'mouse') tilt = Math.max(-22, Math.min(22, -(e.clientY - drag.y) * 0.25));
      vel = (dx * 0.55) / dt * 16;
      drag.lx = e.clientX; drag.lt = now; render();
    });
    function end() {
      if (!drag) return;
      drag = null; el.classList.remove('dragging');
      if (Math.abs(vel) > 1.5) coast(); else tween(nearest(angle), 500);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); firstTouch();
        tween(nearest(angle) + (e.key === 'ArrowRight' ? 180 : -180), 700);
      }
    });
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        firstTouch();
        var want = Number(b.dataset.spinTo), base = nearest(angle);
        var isBack = Math.cos(angle * Math.PI / 180) < 0;
        if ((want === 180) !== isBack) tween(base + 180, 750);
      });
    });
    render();

    // one slow turn when the pouch first comes into view, so people know it moves
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          io.disconnect();
          setTimeout(function () { if (!touched) tween(360, 2600, function () { angle = 0; render(); }); }, 1200);
        }
      }, { threshold: 0.5 });
      io.observe(el);
    }
  });

  /* ---------- label zoom: opens a sharp, flat photo of the side you're looking at ---------- */
  document.querySelectorAll('.spin-zoom').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var media = btn.closest('.pdp-media');
      var backOn = media.querySelector('[data-spin-to="180"]').getAttribute('aria-pressed') === 'true';
      var dlg = document.getElementById('zoom-dlg');
      if (!dlg) {
        dlg = document.createElement('dialog'); dlg.id = 'zoom-dlg'; dlg.className = 'zoom-dlg';
        dlg.innerHTML = '<div class="zoom-bar"><span><span data-zt></span> <small>Tap the image to zoom</small></span><button type="button" aria-label="Close">×</button></div><div class="zoom-scroll"><img alt=""></div>';
        document.body.appendChild(dlg);
        dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        var sc = dlg.querySelector('.zoom-scroll');
        sc.addEventListener('click', function (e) {
          var r = sc.getBoundingClientRect(), fx = (e.clientX - r.left + sc.scrollLeft) / sc.scrollWidth, fy = (e.clientY - r.top + sc.scrollTop) / sc.scrollHeight;
          sc.classList.toggle('big');
          sc.scrollLeft = fx * sc.scrollWidth - r.width / 2; sc.scrollTop = fy * sc.scrollHeight - r.height / 2;
        });
      }
      var img = dlg.querySelector('img');
      img.src = backOn ? btn.dataset.zoomBack : btn.dataset.zoomFront;
      img.alt = (backOn ? 'Back' : 'Front') + ' of the label';
      dlg.querySelector('[data-zt]').textContent = backOn ? 'Back of the label' : 'Front';
      dlg.querySelector('.zoom-scroll').classList.remove('big');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    });
  });

  /* ---------- copy buttons on the test-card note ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    var done = function () { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, done); else done();
  });

  /* ---------- nutrient flip cards: click or tap to see more ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-flip]'); if (!b) return;
    var open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open));
    var name = b.querySelector('.in-top b');
    b.setAttribute('aria-label', (name ? name.textContent : 'Nutrient') + (open ? ': show more' : ': show less'));
  });

  /* ---------- scroll effects: progress bar, reveals, pinned moments, hero parallax ---------- */
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var root = document.documentElement;
    root.classList.add('js-rv');

    var bar = document.createElement('div'); bar.className = 'scroll-bar'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    // what reveals, and how
    var groups = [
      ['.sec-head h2', ''], ['.sec-head p', ''],
      ['.in-card', 'rv-pop'], ['.in-side', 'rv-right'],
      ['.cmp', 'rv-pop'], ['.lineup .card', ''], ['.moment', 'rv-right'],
      ['.faq details', ''], ['.cta-band, .cta', 'rv-pop'], ['.honest', ''],
      ['.st-steps li', 'rv-pop'], ['.st-team', ''], ['.st-values > div', ''], ['.st-cta', 'rv-pop'],
      ['.pdp-more .jg-card', '']
    ];
    var items = [];
    groups.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el, i) {
        if (el.closest('.hero') || el.classList.contains('rv')) return;
        el.classList.add('rv'); if (g[1]) el.classList.add(g[1]);
        el.style.setProperty('--i', String(i % 6));
        items.push(el);
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });

    // moments: scroll down, cards travel sideways (desktop only)
    var pin = document.querySelector('[data-mo-pin]'), track = pin && pin.querySelector('[data-mo-track]');
    var moBar = pin && pin.querySelector('[data-mo-bar]'), dist = 0;
    function setupPin() {
      if (!pin) return;
      pin.classList.remove('pinned'); pin.style.height = ''; track.style.transform = '';
      if (window.innerWidth < 900) { dist = 0; return; }
      pin.classList.add('pinned');
      dist = Math.max(0, track.scrollWidth - track.clientWidth + 40);
      if (dist < 40) { pin.classList.remove('pinned'); dist = 0; return; }
      pin.style.height = (window.innerHeight + dist) + 'px';
    }

    var hero = document.querySelector('.hero'), stage = hero && hero.querySelector('.stage');
    var ticking = false;
    function onScroll() {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      bar.style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      if (pin && dist) {
        var r = pin.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / dist));
        track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
        if (moBar) pin.style.setProperty('--mp', p.toFixed(3));
      }
      if (stage && window.scrollY < window.innerHeight) {
        stage.style.transform = 'translate3d(0,' + (window.scrollY * 0.12).toFixed(1) + 'px,0)';
      }
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
    setupPin(); onScroll();
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', function () { setupPin(); req(); });
    window.addEventListener('load', function () { setupPin(); req(); });
  })();

  /* ---------- spin the wheel: lands on 20% off, then name + email unlock the code ---------- */
  (function () {
    var wrap = document.querySelector('[data-spin-wheel]'); if (!wrap) return;
    var wheel = wrap.querySelector('[data-sw-wheel]'), spinBtn = wrap.querySelector('[data-sw-spin]');
    var steps = { play: wrap.querySelector('[data-sw-step="play"]'), email: wrap.querySelector('[data-sw-step="email"]'), won: wrap.querySelector('[data-sw-step="won"]') };
    var form = wrap.querySelector('[data-sw-form]'), err = wrap.querySelector('[data-sw-err]');
    var timer = wrap.querySelector('[data-sw-timer]'), pill = document.querySelector('[data-sw-pill]'), pillTimer = pill && pill.querySelector('[data-sw-pill-timer]');
    var KEY = 'jelgo-spin-v1', DAY = 24 * 3600 * 1000, tick = 0, lastFocus = null;
    function get(k, store) { try { return (store || localStorage).getItem(k); } catch (e) { return null; } }
    function set(k, v, store) { try { (store || localStorage).setItem(k, v); } catch (e) {} }
    function spunAt() { var t = Number(get(KEY)); return t > 0 ? t : 0; }
    function revealed() { return get(KEY + '-email') === '1'; }
    function left() { var t = spunAt(); return t ? Math.max(0, t + DAY - Date.now()) : 0; }
    function fmt(ms) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(function (n) { return String(n).padStart(2, '0'); }).join(':'); }
    function render() {
      var ms = left(), txt = fmt(ms);
      if (timer) timer.textContent = txt;
      if (pill) { pill.hidden = !(spunAt() && ms > 0 && wrap.hidden); if (pillTimer) pillTimer.textContent = revealed() ? txt : 'unlock'; }
    }
    function startTick() { if (!tick) { render(); tick = setInterval(render, 1000); } }
    function show(name) {
      Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== name; });
      wrap.classList.toggle('won', name !== 'play');
      if (name !== 'play') startTick();
      var f = steps[name].querySelector(name === 'email' ? 'input[type=text]' : name === 'won' ? '[data-copy]' : '[data-sw-spin]');
      if (f) setTimeout(function () { f.focus(); }, 60);
    }
    function open() {
      lastFocus = document.activeElement; wrap.hidden = false; if (pill) pill.hidden = true;
      if (spunAt()) { wheel.style.transition = 'none'; wheel.style.transform = 'rotate(-45deg)'; show(revealed() ? 'won' : 'email'); }
      else show('play');
    }
    function close() { wrap.hidden = true; set(KEY + '-closed', '1', sessionStorage); render(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    spinBtn.addEventListener('click', function () {
      spinBtn.disabled = true; spinBtn.textContent = 'Spinning…';
      // the 20% slice is centred at 45 degrees; bring it under the pointer after five full turns, with a little wobble
      var end = 360 * 5 - 45 + (Math.random() * 40 - 20);
      wheel.style.transform = 'rotate(' + end + 'deg)';
      var fired = false, done = function () { if (fired) return; fired = true; set(KEY, String(Date.now())); show('email'); };
      wheel.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 5200);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var name = form.querySelector('[name="contact[first_name]"]'), email = form.querySelector('[name="contact[email]"]'), ok = form.querySelector('[name="sw_consent"]');
      if (!name.value.trim()) { err.textContent = 'Please enter your first name.'; name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { err.textContent = 'Please enter a valid email.'; email.focus(); return; }
      if (!ok.checked) { err.textContent = 'Tick the box so we can email you.'; ok.focus(); return; }
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Unlocking…';
      var finish = function () { set(KEY + '-email', '1'); show('won'); btn.disabled = false; btn.textContent = 'Reveal my code'; };
      // saves them as a Shopify customer subscribed to email marketing (tags: newsletter, spin-wheel)
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { 'Accept': 'text/html' } })
        .then(finish, finish);
    });
    wrap.querySelectorAll('[data-sw-close]').forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !wrap.hidden) close(); });
    if (pill) pill.addEventListener('click', open);
    if (spunAt()) { if (left() > 0) startTick(); render(); return; }
    if (get(KEY + '-closed', sessionStorage)) return;
    setTimeout(function () { if (wrap.hidden) open(); }, 4000);
  })();
})();
