/* ============================================================
   hero3d.js — 3D threat-map globe (Three.js)
   Dark extruded landmasses under a sweeping roll, magenta strike
   arcs from one aggressor to many targets, blinking intrusion
   blips across real continents. Zero branding, all NASA imagery.
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

  /* ---------- Lights (for the shaded, extruded relief) ---------- */
  scene.add(new THREE.AmbientLight(0x64748b, 1.5));
  var key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-9, 7, 10);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x2dd4bf, 0.6);
  rim.position.set(8, -4, -6);
  scene.add(rim);

  var R = 4.6; // globe radius
  var globe = new THREE.Group();
  scene.add(globe);

  var CDN = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/';

  function loadImage(url, ok, fail) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { ok(img); };
    img.onerror = function () { fail && fail(); };
    img.src = url;
  }

  /* ---------- Placeholder body until textures arrive ---------- */
  var hull = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshStandardMaterial({ color: 0x121a17, roughness: 0.95, metalness: 0.02, displacementScale: 0 })
  );
  globe.add(hull);

  // Atmosphere glow
  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.07, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.055, side: THREE.BackSide })
  );
  globe.add(atmosphere);

  /* ---------- World borders (Natural Earth via world-atlas) ---------- */
  function drawBorders(ctx, tex, W, H) {
    if (typeof topojson === 'undefined') return;
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json')
      .then(function (r) { return r.json(); })
      .then(function (world) {
        var countries = topojson.feature(world, world.objects.countries).features;
        ctx.save();
        ctx.strokeStyle = 'rgba(154, 196, 181, 0.62)';
        ctx.lineWidth = Math.max(1.3, W / 1250);
        ctx.lineJoin = 'round';
        countries.forEach(function (f) {
          var geom = f.geometry;
          var polys = geom.type === 'Polygon' ? [geom.coordinates]
                    : geom.type === 'MultiPolygon' ? geom.coordinates : [];
          polys.forEach(function (poly) {
            poly.forEach(function (ring) {
              ctx.beginPath();
              var prevX = null;
              for (var i = 0; i < ring.length; i++) {
                var x = (ring[i][0] + 180) / 360 * W;
                var y = (90 - ring[i][1]) / 180 * H;
                if (prevX === null || Math.abs(x - prevX) > W / 2) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                prevX = x;
              }
              ctx.closePath();
              ctx.stroke();
            });
          });
        });
        ctx.restore();
        tex.needsUpdate = true;
      })
      .catch(function () { /* borders are cosmetic — never fatal */ });
  }

  /* ---------- Build the dark "threat map" from NASA imagery ---------- */
  function buildMapTexture(dayImg, topoImg) {
    var W = 1600, H = 800;
    var dc = document.createElement('canvas'); dc.width = W; dc.height = H;
    var dctx = dc.getContext('2d');
    dctx.drawImage(dayImg, 0, 0, W, H);

    var tc = document.createElement('canvas'); tc.width = W; tc.height = H;
    var tctx = tc.getContext('2d');
    tctx.drawImage(topoImg, 0, 0, W, H);

    var d = dctx.getImageData(0, 0, W, H);
    var t = tctx.getImageData(0, 0, W, H);
    var px = d.data, tp = t.data;
    var landSamples = [];

    for (var i = 0; i < px.length; i += 4) {
      var r = px[i], g = px[i + 1], b = px[i + 2];
      var height = tp[i]; // topology luminance (white = high)

      // Ocean = strongly blue; everything else = land
      var isOcean = (b > r + 14 && b > g + 6 && b > 55) || (r < 14 && g < 18 && b < 30);

      if (isOcean) {
        px[i] = 7; px[i + 1] = 11; px[i + 2] = 13;
      } else {
        // Dark slate-green landmasses with shaded relief
        var shade = 0.55 + (height / 255) * 0.9;
        px[i] = Math.min(255, 26 * shade + 8);
        px[i + 1] = Math.min(255, 36 * shade + 10);
        px[i + 2] = Math.min(255, 30 * shade + 9);
        if ((i & 1023) === 0 && landSamples.length < 40000) {
          var p = i / 4;
          landSamples.push((p % W) / W, Math.floor(p / W) / H);
        }
      }
    }
    dctx.putImageData(d, 0, 0);

    // Thin luminous coastline: redraw with a blurred rim of the land mask
    dctx.save();
    dctx.globalAlpha = 0.5;
    dctx.filter = 'blur(2px)';
    dctx.drawImage(dc, 0, 0);
    dctx.restore();

    var tex = new THREE.CanvasTexture(dc);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    drawBorders(dctx, tex, W, H); // paint Natural Earth country outlines on top
    return { tex: tex, landSamples: landSamples };
  }

  var landPoints = []; // filled by the builder; blips anchor to these

  loadImage(CDN + 'earth-day.jpg', function (dayImg) {
    loadImage(CDN + 'earth-topology.png', function (topoImg) {
      var built = buildMapTexture(dayImg, topoImg);
      hull.material.map = built.tex;
      hull.material.displacementMap = new THREE.CanvasTexture(topoImg);
      hull.material.displacementScale = 0.1;
      hull.material.needsUpdate = true;
      landPoints = built.landSamples;
      seedBlips();
    }, function () {
      // Topology failed — flat dark land still looks right
      var flat = buildMapTexture(dayImg, dayImg);
      hull.material.map = flat.tex;
      hull.material.needsUpdate = true;
      landPoints = flat.landSamples;
      seedBlips();
    });
  }, function () { /* CDN down — plain dark globe remains */ });

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

  function mapUVToSurface(u, v, radius) {
    var lon = u * 360 - 180;
    var lat = 90 - v * 180;
    return surfacePoint(lat, lon, radius);
  }

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

  /* ---------- Ambient intrusion blips (random real land points) ---------- */
  var blips = [];
  function seedBlips() {
    if (!landPoints.length) return;
    var count = 60;
    for (var i = 0; i < count; i++) {
      var k = (Math.floor(Math.random() * (landPoints.length / 2)) * 2);
      var p = mapUVToSurface(landPoints[k], landPoints[k + 1], R * 1.06);
      var color = Math.random() < 0.6 ? 0x60a5fa : 0xa78bfa;
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
      var s = 0.16 + Math.random() * 0.14;
      sprite.scale.set(s, s, 1);
      sprite.userData = { phase: Math.random() * Math.PI * 2, speed: 1.2 + Math.random() * 1.6, base: s };
      globe.add(sprite);
      blips.push(sprite);
    }
  }

  /* ---------- Hotspots (origin + targets) ---------- */
  var pulses = [];

  function addPulse(lat, lon, color, scale) {
    var dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dot.position.copy(surfacePoint(lat, lon, R * 1.03));
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

  // ONE aggressor origin — continental US
  var ORIGIN = { lat: 39.5, lon: -98.35 };
  var TARGETS = [
    { lat: 35.7,  lon: 139.7, city: 'Tokyo' },
    { lat: 31.2,  lon: 121.5, city: 'Shanghai' },
    { lat: 39.9,  lon: 116.4, city: 'Beijing' },
    { lat: 37.5,  lon: 127.0, city: 'Seoul' },
    { lat: 1.35,  lon: 103.8, city: 'Singapore' },
    { lat: -33.9, lon: 151.2, city: 'Sydney' }
  ];

  var originDot = addPulse(ORIGIN.lat, ORIGIN.lon, 0xf43f5e, 1.3);
  TARGETS.forEach(function (t) { addPulse(t.lat, t.lon, 0xc084fc, 0.62); }); // violet = under fire

  /* ---------- Strike arcs (magenta) ---------- */
  var attacks = [];

  function arcBetween(aLat, aLon, bLat, bLon) {
    var a = surfacePoint(aLat, aLon, R * 1.03);
    var b = surfacePoint(bLat, bLon, R * 1.03);
    var mid = a.clone().add(b).multiplyScalar(0.5).normalize();
    var separation = a.distanceTo(b);
    mid.multiplyScalar(R + separation * 0.55 + 1.15);
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }

  TARGETS.forEach(function (target, index) {
    var curve = arcBetween(ORIGIN.lat, ORIGIN.lon, target.lat, target.lon);

    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 0.024, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    globe.add(tube);

    var packet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6ec7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    packet.scale.set(0.55, 0.55, 1);
    globe.add(packet);

    attacks.push({ curve: curve, packet: packet, t: index * 0.16, speed: 0.0032 + Math.random() * 0.0016, tube: tube });
  });

  /* ---------- Ambient starfield ---------- */
  var starCount = 160;
  var starPos = new Float32Array(starCount * 3);
  for (var i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 60;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 34;
    starPos[i * 3 + 2] = -12 - Math.random() * 22;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xa7c4ff, size: 0.075, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(stars);

  /* ---------- Pointer parallax ---------- */
  var pointer = { x: 0, y: 0 };
  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; }, { passive: true });

  /* ---------- Layout ---------- */
  function layout() {
    var compact = window.innerWidth <= 980;
    if (compact) {
      globe.position.set(3.2, 3.4, -6.8);
      globe.scale.setScalar(0.85);
    } else {
      globe.position.set(8.6, 1.6, -3.2);
      globe.scale.setScalar(1.25);
    }
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  var t = 0;

  function tick() {
    t += 0.016;

    globe.rotation.y += 0.0042;              // the roll never stops

    var ob = originDot.userData.base;
    var breathe = ob * (1 + 0.3 * Math.sin(t * 3.4));
    originDot.scale.set(breathe, breathe, 1);

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

    // Intrusion blips blink on/off across continents
    for (var b = 0; b < blips.length; b++) {
      var bl = blips[b], u = bl.userData;
      var blink = Math.max(0, Math.sin(t * u.speed + u.phase));
      bl.material.opacity = blink * blink; // sharp strobe, not a fade
      var bs = u.base * (0.7 + blink * 0.7);
      bl.scale.set(bs, bs, 1);
    }

    // Strikes in flight
    for (var j = 0; j < attacks.length; j++) {
      var atk = attacks[j];
      atk.t = (atk.t + atk.speed) % 1;
      var pos = atk.curve.getPointAt(atk.t);
      atk.packet.position.copy(pos);
      var env = Math.sin(Math.PI * atk.t);
      var ps = 0.34 + 0.4 * env;
      atk.packet.scale.set(ps, ps, 1);
      atk.tube.material.opacity = 0.28 + 0.32 * env;
    }

    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.03;
    camera.position.y += (0.6 - pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    stars.rotation.y = Math.sin(t * 0.05) * 0.02;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();
