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
        secs = p * 10; squeeze = 1 - 0.5 * p;
      } else if (state === 3) { secs = 10; squeeze = 0.5; }
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
})();
