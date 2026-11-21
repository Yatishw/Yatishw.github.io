/* hero3d.js — lightweight 3D earth (no displacement, no stars, no CDN data) */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('scene3d');
  if (!canvas || reduce || typeof THREE === 'undefined') return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0.6, 16);
  var hero = canvas.closest('.hero');

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  var R = 4.6;
  var globe = new THREE.Group();
  scene.add(globe);

  /* Sphere: basic material, one local texture — the cheapest real earth */
  var earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  globe.add(earth);
  new THREE.TextureLoader().load('images/earth.jpg', function (tex) {
    earth.material.map = tex;
    earth.material.needsUpdate = true;
  });
  var halo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.05, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.055, side: THREE.BackSide })
  );
  globe.add(halo);

  /* Glow sprite texture */
  var gc = document.createElement('canvas'); gc.width = gc.height = 48;
  var gx = gc.getContext('2d');
  var grad = gx.createRadialGradient(24, 24, 0, 24, 24, 24);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = grad; gx.fillRect(0, 0, 48, 48);
  var tex = new THREE.CanvasTexture(gc);

  function point(lat, lon, r) {
    var phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180, rr = r || R;
    return new THREE.Vector3(-rr * Math.sin(phi) * Math.cos(th), rr * Math.cos(phi), rr * Math.sin(phi) * Math.sin(th));
  }
  function sprite(color, size) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1);
    return s;
  }

  var CITIES = [
    [51.5,-0.1],[40.7,-74],[43.7,-79.4],[34,-118.2],[39.5,-98.4],[-23.5,-46.6],[6.5,3.4],[-26.2,28],
    [48.9,2.35],[52.5,13.4],[41,28.9],[55.8,37.6],[25.2,55.3],[28.6,77.2],[19.1,72.9],
    [39.9,116.4],[31.2,121.5],[22.3,114.2],[35.7,139.7],[37.5,127],[1.35,103.8],[-6.2,106.8],[-33.9,151.2]
  ];

  /* Only 20 blips (was 60) */
  var blips = [];
  for (var b = 0; b < 20; b++) {
    var c = CITIES[(b * 7) % CITIES.length];
    var s = sprite(Math.random() < 0.6 ? 0x60a5fa : 0xa78bfa, 0.18 + Math.random() * 0.12);
    s.position.copy(point(c[0], c[1], R * 1.02));
    s.userData = { phase: Math.random() * 6.28, speed: 1 + Math.random(), base: s.scale.x };
    globe.add(s);
    blips.push(s);
  }

  /* Strikes: thin THREE.Line (not tube mesh), max 6 */
  var attacks = [], impacts = [], next = 0;

  function addImpact(pos, color) {
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 24),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(pos); ring.lookAt(0, 0, 0); globe.add(ring);
    impacts.push({ obj: ring, age: 0, grow: 2.2, life: 1.3 });
  }

  function spawn() {
    var a = CITIES[Math.floor(Math.random() * CITIES.length)];
    var bb = CITIES[Math.floor(Math.random() * CITIES.length)];
    var from = point(a[0], a[1], R * 1.02), to = point(bb[0], bb[1], R * 1.02);
    var mid = from.clone().add(to).multiplyScalar(0.5).normalize();
    mid.multiplyScalar(R + from.distanceTo(to) * 0.3 + 0.7);
    var curve = new THREE.QuadraticBezierCurve3(from, mid, to);

    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
      new THREE.LineBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    globe.add(line);
    var packet = sprite(0xffd9a0, 0.32);
    globe.add(packet);
    var flash = sprite(0xff5a1f, 0.6); flash.position.copy(from); globe.add(flash);
    impacts.push({ obj: flash, age: 0, grow: 0.4, life: 0.9 });
    attacks.push({ curve: curve, line: line, packet: packet, t: 0, speed: 0.005 + Math.random() * 0.002 });
  }

  function dispose(o) {
    globe.remove(o);
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  }

  function layout() {
    var compact = window.innerWidth <= 980;
    globe.position.set(compact ? 3.1 : 8.3, compact ? 3.6 : 0.15, compact ? -6.6 : -3.4);
    globe.scale.setScalar(compact ? 0.95 : 1.32);
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  var pointer = { x: 0, y: 0 };
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width - 0.5;
    pointer.y = (e.clientY - r.top) / r.height - 0.5;
  }, { passive: true });

  var t = 0;
  function frame() {
    t += 0.016;
    globe.rotation.y += 0.0034;

    for (var i = 0; i < blips.length; i++) {
      var q = blips[i], u = q.userData;
      var blink = Math.max(0, Math.sin(t * u.speed + u.phase));
      q.material.opacity = blink * blink;
      q.scale.setScalar(u.base * (0.75 + blink * 0.5));
    }

    if (t >= next && attacks.length < 6) { spawn(); next = t + 0.5 + Math.random() * 0.8; }

    for (var j = attacks.length - 1; j >= 0; j--) {
      var a = attacks[j];
      a.t += a.speed;
      if (a.t >= 1) {
        addImpact(a.curve.getPointAt(1), 0xff6b2b);
        dispose(a.line); dispose(a.packet);
        attacks.splice(j, 1);
        continue;
      }
      a.packet.position.copy(a.curve.getPointAt(a.t));
      a.line.material.opacity = 0.22 + 0.3 * Math.sin(Math.PI * a.t);
    }

    for (var k = impacts.length - 1; k >= 0; k--) {
      var im = impacts[k];
      im.age += 0.016;
      var p = im.age / im.life;
      if (p >= 1) { dispose(im.obj); impacts.splice(k, 1); continue; }
      im.obj.scale.setScalar(1 + p * im.grow);
      im.obj.material.opacity = 0.9 * (1 - p);
    }

    camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.04;
    camera.position.y += (0.6 - pointer.y * 1.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
