/* jelgo 3D viewer for the product page.
   Pouch: a puffy, sealed-edge pouch built from the front/back photos (two displaced planes that meet at the seam,
   with normal maps for the foil shape and shine). Box: a lit cardboard box with the front and back art.
   theme.js owns the interaction and calls el.__spin3d(angleDeg, tiltDeg). If WebGL fails, the flat card stays. */
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
    var T = window.THREE, d = el.dataset, isBox = d['3dType'] === 'box';
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.outputEncoding = T.sRGBEncoding;
    var canvas = renderer.domElement; canvas.className = 'spin-canvas'; canvas.setAttribute('aria-hidden', 'true');

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(24, 1, 0.1, 30);
    var group = new T.Group(); scene.add(group);

    scene.add(new T.HemisphereLight(0xffffff, 0xd4d6e6, isBox ? 0.9 : 1.0));
    [[2.2, 2.8, 4, 0.5], [-2.2, 2.8, -4, 0.5], [-4, 0.5, 1.5, 0.3], [4, 0.5, -1.5, 0.3]].forEach(function (l) {
      var dl = new T.DirectionalLight(0xffffff, l[3]); dl.position.set(l[0], l[1], l[2]); scene.add(dl);
    });

    var loader = new T.TextureLoader(), tex = {}, names = [], aniso = renderer.capabilities.getMaxAnisotropy();
    function want(name, url, srgb) { names.push([name, url, srgb]); }
    want('f', d['3dFront'], true); want('b', d['3dBack'], true);
    if (isBox && d['3dSide']) want('s', d['3dSide'], true);
    if (!isBox) { want('fh', d['3dFrontHeight']); want('bh', d['3dBackHeight']); want('fn', d['3dFrontNormal']); want('bn', d['3dBackNormal']); }
    var pending = names.length;
    names.forEach(function (n) {
      loader.load(n[1], function (t) {
        if (n[2]) t.encoding = T.sRGBEncoding;
        t.anisotropy = aniso; tex[n[0]] = t;
        if (--pending === 0) ready();
      });
    });

    var size = { w: 1, h: 1, d: 0 };
    function ready() {
      var img = tex.f.image, aspect = img.height / img.width;
      if (isBox) {
        size = { w: 1.6, h: 1.6 * aspect, d: 0.5 };
        var cream = new T.MeshStandardMaterial({ color: new T.Color(d['3dColor'] || '#F4E0C4').convertSRGBToLinear(), roughness: 0.8 });
        function face(t) { return new T.MeshStandardMaterial({ map: t, roughness: 0.75 }); }
        // order: +x, -x, +y, -y, +z (front), -z (back)
        var side = tex.s ? face(tex.s) : cream;
        var box = new T.Mesh(new T.BoxGeometry(size.w, size.h, size.d), [side, side, cream, cream, face(tex.f), face(tex.b)]);
        group.add(box);
      } else {
        size = { w: 1, h: aspect, d: 0.15 };
        var geo = new T.PlaneGeometry(1, aspect, 240, Math.round(240 * aspect));
        var DISP = 52.9 / 800;
        function mat(map, h, n) {
          return new T.MeshStandardMaterial({ map: map, alphaTest: 0.5, displacementMap: h, displacementScale: DISP, normalMap: n, roughness: 0.42, metalness: 0.06 });
        }
        var back = new T.Mesh(geo, mat(tex.b, tex.bh, tex.bn)); back.rotation.y = Math.PI;
        group.add(new T.Mesh(geo, mat(tex.f, tex.fh, tex.fn))); group.add(back);
      }
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
      // fit the object at any rotation: its widest footprint is the diagonal of width and depth
      var halfW = Math.sqrt(size.w * size.w + size.d * size.d) / 2 * 1.02, halfH = size.h / 2 * 1.06;
      var half = Math.max(halfH, halfW / camera.aspect);
      camera.position.set(0, 0, half / Math.tan(camera.fov * Math.PI / 360) + size.d / 2);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el); else window.addEventListener('resize', resize);
  }

  function start() { loadThree(function () { els.forEach(build); }); }
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 }); else setTimeout(start, 300);
})();
