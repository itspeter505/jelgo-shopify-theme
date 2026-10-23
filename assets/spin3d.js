/* jelgo 3D pouch: a puffy, sealed-edge pouch built from the front/back photos.
   Front and back are two displaced planes that meet at the seam; normal maps give the foil its shape and shine.
   theme.js owns the interaction and calls el.__spin3d(angleDeg, tiltDeg). Falls back to the flat card if WebGL fails. */
(function () {
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var els = document.querySelectorAll('[data-spin][data-3d-front]');
  if (!els.length) return;

  function webgl() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }
  if (!webgl()) return;

  function loadThree(cb) {
    if (window.THREE) return cb();
    var s = document.createElement('script');
    s.src = window.jelgoThreeUrl || THREE_URL; s.async = true; s.onload = cb;
    document.head.appendChild(s);
  }

  function build(el) {
    var T = window.THREE, d = el.dataset;
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.NoToneMapping;
    var canvas = renderer.domElement; canvas.className = 'spin-canvas'; canvas.setAttribute('aria-hidden', 'true');

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(26, 1, 0.1, 20);
    var group = new T.Group(); scene.add(group);

    scene.add(new T.HemisphereLight(0xffffff, 0xc9cbe0, 0.95));
    var key = new T.DirectionalLight(0xffffff, 0.55); key.position.set(2.2, 2.8, 4); scene.add(key);
    var keyB = new T.DirectionalLight(0xffffff, 0.55); keyB.position.set(-2.2, 2.8, -4); scene.add(keyB);
    var rim = new T.DirectionalLight(0xffffff, 0.35); rim.position.set(-4, 0.5, 1.5); scene.add(rim);
    var rimB = new T.DirectionalLight(0xffffff, 0.35); rimB.position.set(4, 0.5, -1.5); scene.add(rimB);

    var loader = new T.TextureLoader(), pending = 6, tex = {};
    var aniso = renderer.capabilities.getMaxAnisotropy();
    function load(name, url, srgb) {
      loader.load(url, function (t) {
        if (srgb) t.encoding = T.sRGBEncoding;
        t.anisotropy = aniso; tex[name] = t;
        if (--pending === 0) ready();
      }, undefined, function () { /* keep the flat card */ });
    }
    load('f', d['3dFront'], true); load('b', d['3dBack'], true);
    load('fh', d['3dFrontHeight']); load('bh', d['3dBackHeight']);
    load('fn', d['3dFrontNormal']); load('bn', d['3dBackNormal']);

    var ASPECT = 1160 / 800, DISP = 52.9 / 800;
    function ready() {
      var geo = new T.PlaneGeometry(1, ASPECT, 220, Math.round(220 * ASPECT));
      function mat(map, h, n) {
        return new T.MeshStandardMaterial({
          map: map, alphaTest: 0.5, displacementMap: h, displacementScale: DISP,
          normalMap: n, normalScale: new T.Vector2(1, 1), roughness: 0.42, metalness: 0.08
        });
      }
      var front = new T.Mesh(geo, mat(tex.f, tex.fh, tex.fn));
      var back = new T.Mesh(geo, mat(tex.b, tex.bh, tex.bn)); back.rotation.y = Math.PI;
      group.add(front); group.add(back);
      el.appendChild(canvas);
      resize();
      el.classList.add('is-3d');
      el.__spin3d = function (ry, rx) {
        group.rotation.y = ry * Math.PI / 180;
        group.rotation.x = rx * Math.PI / 180;
        renderer.render(scene, camera);
      };
      if (el.__spinRender) el.__spinRender(); else renderer.render(scene, camera);
    }

    function resize() {
      var w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var fitH = ASPECT * 0.5 * 1.04, fitW = 0.5 * 1.04 / camera.aspect;
      var half = Math.max(fitH, fitW);
      camera.position.set(0, 0, half / Math.tan(camera.fov * Math.PI / 360));
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el); else window.addEventListener('resize', resize);
  }

  function start() { loadThree(function () { els.forEach(build); }); }
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 }); else setTimeout(start, 300);
})();
