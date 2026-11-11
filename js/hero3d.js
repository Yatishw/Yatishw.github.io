/* ============================================================
   hero3d.js — 3D "threat operations" scene (Three.js)
   A quiet, cinematic cyber backdrop: a rotating wireframe globe
   with glowing hotspot markers, twin orbital defense rings and a
   radar sweep — no constellation lines.
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
  globe.position.set(6.4, -0.4, -2.5); // sits right of the copy on wide screens
  scene.add(globe);

  /* ---- Wireframe planet: latitude/longitude mesh ---- */
  var latLong = new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0x155e75, wireframe: true, transparent: true, opacity: 0.55 })
  );
  globe.add(latLong);

  /* ---- Fainter inner icosahedron for depth ---- */
  var inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(R * 0.86, 1),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, wireframe: true, transparent: true, opacity: 0.30 })
  );
  globe.add(inner);

  /* ---- Solid occluder so the far side reads as a silhouette ---- */
  var hull = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.82 })
  );
  globe.add(hull);

  /* ---- Glowing atmosphere shell ---- */
  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.06, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.055, side: THREE.BackSide })
  );
  globe.add(atmosphere);

  /* ---- Hotspot markers + pulsing rings ---- */
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

  function hotspot(latDeg, lonDeg, color, scale) {
    var phi = (90 - latDeg) * Math.PI / 180;
    var theta = (lonDeg + 180) * Math.PI / 180;
    var p = new THREE.Vector3(
      -R * Math.sin(phi) * Math.cos(theta),
       R * Math.cos(phi),
       R * Math.sin(phi) * Math.sin(theta)
    );
    var dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dot.position.copy(p.multiplyScalar(1.01));
    dot.scale.set(scale, scale, 1);
    dot.userData.base = scale;
    globe.add(dot);

    var ringGeo = new THREE.RingGeometry(0.22, 0.26, 32);
    var ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(dot.position);
    ring.lookAt(0, 0, 0);
    ring.userData.phase = Math.random() * Math.PI * 2;
    globe.add(ring);
    return [dot, ring];
  }

  var pulses = [];
  // Threat hotspots (red) + secured nodes (cyan)
  [[38, -95, 0xf43f5e, 0.85], [51.5, -0.1, 0xf43f5e, 0.7], [1.35, 103.8, 0x38bdf8, 0.75],
   [35.6, 139.7, 0x38bdf8, 0.65], [-23.5, -46.6, 0x38bdf8, 0.6], [25.2, 55.3, 0xf43f5e, 0.55],
   [40.7, -74, 0x38bdf8, 0.6], [-33.9, 151.2, 0x38bdf8, 0.55]].forEach(function (h) {
    pulses.push(hotspot(h[0], h[1], h[2], h[3]));
  });

  /* ---- Twin orbital defense rings ---- */
  var ringGroup = new THREE.Group();
  ringGroup.position.copy(globe.position);
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
  var orbit1 = orbitRing(R * 1.45, 0.018, 0x38bdf8, 0.55, Math.PI / 2.6, 0.25);
  var orbit2 = orbitRing(R * 1.8, 0.014, 0x0ea5e9, 0.35, Math.PI / 1.75, -0.35);

  /* ---- Radar sweep: a thin arc orbiting inside the rings ---- */
  var sweep = new THREE.Mesh(
    new THREE.TorusGeometry(R * 1.62, 0.05, 6, 40, Math.PI / 4.2),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sweep.rotation.x = Math.PI / 2.6;
  ringGroup.add(sweep);

  /* ---- Sparse starfield (ambient, no links) ---- */
  var starCount = 140;
  var starPos = new Float32Array(starCount * 3);
  for (var i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 60;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 34;
    starPos[i * 3 + 2] = -12 - Math.random() * 22;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9cc8ff, size: 0.07, transparent: true, opacity: 0.65, depthWrite: false }));
  scene.add(stars);

  /* ---- Pointer parallax ---- */
  var pointer = { x: 0, y: 0 };
  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; }, { passive: true });

  var t = 0;

  // Keep the globe from covering the copy on small screens: shift it
  // behind/right and shrink slightly below the 980px breakpoint.
  function layout() {
    if (window.innerWidth <= 980) {
      globe.position.set(2.5, 2.6, -6.5);
      globe.scale.setScalar(0.72);
      ringGroup.position.copy(globe.position);
      ringGroup.scale.setScalar(0.72);
    } else {
      globe.position.set(6.4, -0.4, -2.5);
      globe.scale.setScalar(1);
      ringGroup.position.copy(globe.position);
      ringGroup.scale.setScalar(1);
    }
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  function tick() {
    t += 0.016;

    globe.rotation.y += 0.0032;
    inner.rotation.y -= 0.0021;
    inner.rotation.x += 0.0013;

    // Hotspot pulse + expanding rings
    for (var i = 0; i < pulses.length; i++) {
      var dot = pulses[i][0], ring = pulses[i][1];
      var phase = ring.userData.phase;
      var wave = (t * 0.9 + phase) % 2;             // 0..2 cycle
      var s = dot.userData.base * (1 + 0.18 * Math.sin(t * 2.4 + phase));
      dot.scale.set(s, s, 1);
      var rs = 0.5 + wave * 1.6;                     // ring expands 0.5 → ~3.7
      ring.scale.set(rs, rs, rs);
      ring.material.opacity = Math.max(0, 0.85 - wave * 0.45);
    }

    // Orbital rings precess, sweep travels
    orbit1.rotation.z += 0.0035;
    orbit2.rotation.z -= 0.0026;
    sweep.rotation.y -= 0.03;

    // Gentle camera parallax + breathing sway
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.03;
    camera.position.y += (0.6 - pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    stars.rotation.y = Math.sin(t * 0.05) * 0.02;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();
