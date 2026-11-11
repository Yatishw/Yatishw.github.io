/* ============================================================
   hero3d.js — 3D "threat operations" scene (Three.js)
   A rotating wireframe globe: one threat-actor origin launches
   animated attack arcs to multiple targets. Glowing hotspots,
   twin orbital defense rings, a radar sweep and ambient stars.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('scene3d');
  if (!canvas || reduceMotion || typeof THREE === 'undefined') return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // WebGL unavailable — hero stays clean without it
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0.6, 16);

  var hero = canvas.closest('.hero');

  function sizeToHero() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeToHero();
  window.addEventListener('resize', sizeToHero, { passive: true });

  var R = 4.6; // globe radius
  var globe = new THREE.Group();
  scene.add(globe);

  /* ---------- Globe body ---------- */
  var latLong = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.002, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.13 })
  );
  globe.add(latLong);

  var inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R * 0.86, 1),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, wireframe: true, transparent: true, opacity: 0.28 })
  );
  globe.add(inner);

  // Real earth: NASA "black marble" night lights (public domain), with a
  // graceful fallback to a dark silhouette if the CDN is unreachable.
  var hull = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.78 })
  );
  globe.add(hull);

  new THREE.TextureLoader().setCrossOrigin('anonymous').load(
    'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-night.jpg',
    function (tex) {
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      hull.material.map = tex;
      hull.material.color.setHex(0xffffff);
      hull.material.opacity = 1;
      hull.material.transparent = false;
      hull.material.needsUpdate = true;
    },
    undefined,
    function () { /* keep the dark fallback hull */ }
  );

  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.06, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.05, side: THREE.BackSide })
  );
  globe.add(atmosphere);

  /* ---------- Glow sprite texture ---------- */
  function makeGlowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var glowTex = makeGlowTexture();

  /* ---------- Helpers: lat/lon → surface point ---------- */
  function surfacePoint(lat, lon, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    var r = radius || R;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  /* ---------- Hotspots (origin + targets) ---------- */
  var pulses = [];

  function addPulse(lat, lon, color, scale) {
    var dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dot.position.copy(surfacePoint(lat, lon, R * 1.012));
    dot.scale.set(scale, scale, 1);
    dot.userData.base = scale;
    globe.add(dot);

    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.27, 40),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.position.copy(dot.position);
    ring.lookAt(0, 0, 0);
    ring.userData.phase = Math.random() * Math.PI * 2;
    globe.add(ring);
    pulses.push([dot, ring]);
    return dot;
  }

  // ONE threat-actor origin (reads as red/hostile) — USA launching at East Asia
  var ORIGIN = { lat: 39.5, lon: -98.35 }; // continental US
  var TARGETS = [
    { lat: 35.7,  lon: 139.7, city: 'Tokyo' },
    { lat: 31.2,  lon: 121.5, city: 'Shanghai' },
    { lat: 39.9,  lon: 116.4, city: 'Beijing' },
    { lat: 37.5,  lon: 127.0, city: 'Seoul' },
    { lat: 1.35,  lon: 103.8, city: 'Singapore' },
    { lat: -33.9, lon: 151.2, city: 'Sydney' }
  ];

  var originDot = addPulse(ORIGIN.lat, ORIGIN.lon, 0xf43f5e, 1.15);
  originDot.material.color.setHex(0xfb7185);
  TARGETS.forEach(function (t) { addPulse(t.lat, t.lon, 0xfbbf24, 0.62); }); // amber = targeted

  /* ---------- Attack arcs: origin → targets ---------- */
  var attacks = [];

  function arcBetween(aLat, aLon, bLat, bLon) {
    var a = surfacePoint(aLat, aLon, R * 1.02);
    var b = surfacePoint(bLat, bLon, R * 1.02);
    // Control point: mid direction pushed far above the surface
    var mid = a.clone().add(b).multiplyScalar(0.5).normalize();
    var separation = a.distanceTo(b);
    var lift = R + separation * 0.55 + 1.1;
    mid.multiplyScalar(lift);
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }

  function makeArc(target, index) {
    var curve = arcBetween(ORIGIN.lat, ORIGIN.lon, target.lat, target.lon);

    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 0.022, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    globe.add(tube);

    // Travelling attack packet
    var packet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff5c7a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    packet.scale.set(0.55, 0.55, 1);
    globe.add(packet);

    attacks.push({ curve: curve, packet: packet, t: index * 0.17, speed: 0.0032 + Math.random() * 0.0016, tube: tube });
  }

  TARGETS.forEach(makeArc);

  /* ---------- Twin orbital defense rings ---------- */
  var ringGroup = new THREE.Group();
  scene.add(ringGroup);

  function orbitRing(radius, tube, color, opacity, rx, rz) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 160),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity })
    );
    ring.rotation.set(rx, 0, rz);
    ringGroup.add(ring);
    return ring;
  }
  var orbit1 = orbitRing(R * 1.42, 0.018, 0x38bdf8, 0.55, Math.PI / 2.6, 0.25);
  var orbit2 = orbitRing(R * 1.78, 0.014, 0x0ea5e9, 0.35, Math.PI / 1.75, -0.35);

  var sweep = new THREE.Mesh(
    new THREE.TorusGeometry(R * 1.6, 0.05, 6, 40, Math.PI / 4.2),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sweep.rotation.x = Math.PI / 2.6;
  ringGroup.add(sweep);

  /* ---------- Ambient starfield ---------- */
  var starCount = 150;
  var starPos = new Float32Array(starCount * 3);
  for (var i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 60;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 34;
    starPos[i * 3 + 2] = -12 - Math.random() * 22;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9cc8ff, size: 0.07, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(stars);

  /* ---------- Pointer parallax ---------- */
  var pointer = { x: 0, y: 0 };
  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; }, { passive: true });

  /* ---------- Layout: keep globe visible, clear of the photo ---------- */
  function layout() {
    var compact = window.innerWidth <= 980;
    if (compact) {
      globe.position.set(3.2, 3.4, -6.8);   // high right, behind copy
      globe.scale.setScalar(0.85);
    } else {
      globe.position.set(8.6, 1.6, -3.2);   // far right, raised — photo sits lower-left of it
      globe.scale.setScalar(1.25);
    }
    ringGroup.position.copy(globe.position);
    ringGroup.scale.setScalar(globe.scale.x);
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  var t = 0;

  function tick() {
    t += 0.016;

    globe.rotation.y += 0.0026;              // slower so attack arcs are trackable
    inner.rotation.y -= 0.0021;
    inner.rotation.x += 0.0013;

    // Origin dot breathes harder (it's the aggressor)
    var ob = originDot.userData.base;
    var breathe = ob * (1 + 0.28 * Math.sin(t * 3.4));
    originDot.scale.set(breathe, breathe, 1);

    // Hotspot pulses + expanding rings
    for (var i = 0; i < pulses.length; i++) {
      var dot = pulses[i][0], ring = pulses[i][1];
      var phase = ring.userData.phase;
      var wave = (t * 0.9 + phase) % 2;
      if (dot !== originDot) {
        var s = dot.userData.base * (1 + 0.16 * Math.sin(t * 2.4 + phase));
        dot.scale.set(s, s, 1);
      }
      var rs = 0.5 + wave * 1.7;
      ring.scale.set(rs, rs, rs);
      ring.material.opacity = Math.max(0, 0.85 - wave * 0.5);
    }

    // Attack packets fly origin → targets, looping with staggered offsets
    for (var j = 0; j < attacks.length; j++) {
      var atk = attacks[j];
      atk.t = (atk.t + atk.speed) % 1;
      var pos = atk.curve.getPointAt(atk.t);
      atk.packet.position.copy(pos);
      var env = Math.sin(Math.PI * atk.t);            // brighten mid-flight, dim at the ends
      var ps = 0.32 + 0.38 * env;
      atk.packet.scale.set(ps, ps, 1);
      atk.tube.material.opacity = 0.22 + 0.3 * env;
    }

    // Rings precess, sweep travels
    orbit1.rotation.z += 0.0035;
    orbit2.rotation.z -= 0.0026;
    sweep.rotation.y -= 0.03;

    // Camera parallax
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.03;
    camera.position.y += (0.6 - pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    stars.rotation.y = Math.sin(t * 0.05) * 0.02;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();
