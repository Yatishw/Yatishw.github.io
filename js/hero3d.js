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

  /* ---------- Lights: strong key + soft fill + cool rim → spherical read ---------- */
  var key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(-9, 7, 10);          // lit from the upper-left-front
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x64748b, 1.05));   // low fill → terminator line stays visible
  var rim = new THREE.DirectionalLight(0x7dd3fc, 0.85);
  rim.position.set(7, 2, -9);           // cool edge-light from behind → round silhouette
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
    new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.95, metalness: 0.02, displacementScale: 0 })
  );
  globe.add(hull);

  // Atmosphere glow
  var atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.07, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xcfd8e3, transparent: true, opacity: 0.05, side: THREE.BackSide })
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
        ctx.strokeStyle = 'rgba(228, 235, 242, 0.55)';
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

      // Ocean = strongly blue; everything else = land — used for blip placement
      var isOcean = (b > r + 14 && b > g + 6 && b > 55) || (r < 14 && g < 18 && b < 30);

      // Keep the true satellite pixels — real blue oceans, real continents
      if (!isOcean && (i & 1023) === 0 && landSamples.length < 40000) {
        var p = i / 4;
        landSamples.push((p % W) / W, Math.floor(p / W) / H);
      }
    }

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

  /* ---------- Random worldwide threat feed ---------- */
  // Anywhere can strike anywhere — no fixed aggressor or target list.
  var CITIES = [
    { lat: 51.5,  lon: -0.1,   city: 'London' },   { lat: 48.85, lon: 2.35,   city: 'Paris' },
    { lat: 52.5,  lon: 13.4,   city: 'Berlin' },   { lat: 40.4,  lon: -3.7,   city: 'Madrid' },
    { lat: 41.0,  lon: 28.9,   city: 'Istanbul' }, { lat: 55.75, lon: 37.6,   city: 'Moscow' },
    { lat: 38.9,  lon: -77.0,  city: 'Washington' }, { lat: 40.7, lon: -74.0,  city: 'New York' },
    { lat: 43.65, lon: -79.4,  city: 'Toronto' },  { lat: 19.4,  lon: -99.1,  city: 'Mexico City' },
    { lat: 34.05, lon: -118.2, city: 'Los Angeles' }, { lat: -23.55, lon: -46.6, city: 'São Paulo' },
    { lat: 39.5,  lon: -98.35, city: 'US-Central' }, { lat: 6.5,  lon: 3.4,    city: 'Lagos' },
    { lat: -26.2, lon: 28.05,  city: 'Johannesburg' }, { lat: 25.2, lon: 55.3,   city: 'Dubai' },
    { lat: 28.6,  lon: 77.2,   city: 'Delhi' },    { lat: 19.08, lon: 72.88,  city: 'Mumbai' },
    { lat: 39.9,  lon: 116.4,  city: 'Beijing' },  { lat: 31.2,  lon: 121.5,  city: 'Shanghai' },
    { lat: 22.3,  lon: 114.2,  city: 'Hong Kong' }, { lat: 35.7, lon: 139.7,   city: 'Tokyo' },
    { lat: 37.5,  lon: 127.0,  city: 'Seoul' },    { lat: 1.35,  lon: 103.8,  city: 'Singapore' },
    { lat: -6.2,  lon: 106.8,  city: 'Jakarta' },  { lat: -33.9, lon: 151.2,  city: 'Sydney' }
  ];

  var attacks = [];
  var impacts = [];
  var nextSpawn = 0;

  function randomCity(except) {
    var c;
    do { c = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (c === except);
    return c;
  }

  function arcBetween(aLat, aLon, bLat, bLon) {
    var a = surfacePoint(aLat, aLon, R * 1.03);
    var b = surfacePoint(bLat, bLon, R * 1.03);
    var mid = a.clone().add(b).multiplyScalar(0.5).normalize();
    var separation = a.distanceTo(b);
    mid.multiplyScalar(R + separation * 0.55 + 1.15);
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }

  function makeGlowSprite(color, scale) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 }));
    s.scale.set(scale, scale, 1);
    return s;
  }

  function addImpactRing(position, color) {
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 40),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(position);
    ring.lookAt(0, 0, 0);
    globe.add(ring);
    impacts.push({ obj: ring, age: 0, maxAge: 1.4, grow: 2.6, baseOpacity: 0.9 });
  }

  function spawnAttack() {
    var from = randomCity(null);
    var to = randomCity(from);
    var curve = arcBetween(from.lat, from.lon, to.lat, to.lon);

    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 0.022, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    globe.add(tube);

    var packet = makeGlowSprite(0xff6ec7, 0.5);
    globe.add(packet);

    // Aggressor flash at the launch site
    var origin = makeGlowSprite(0xfb7185, 0.9);
    origin.position.copy(surfacePoint(from.lat, from.lon, R * 1.04));
    globe.add(origin);
    impacts.push({ obj: origin, age: 0, maxAge: 1.1, grow: 0.5, baseOpacity: 0.95 });

    attacks.push({
      curve: curve,
      packet: packet,
      tube: tube,
      target: to,
      t: 0,
      speed: 0.0034 + Math.random() * 0.0018
    });
  }

  function disposeObject(obj) {
    globe.remove(obj);
    if (obj.geometry && !obj.isSprite) obj.geometry.dispose(); // Sprite geometry is shared — never dispose it
    if (obj.material) obj.material.dispose();
  }

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
      globe.position.set(3.1, 3.6, -6.6);
      globe.scale.setScalar(0.95);
    } else {
      globe.position.set(5.1, 0.9, -3.4);  // centered behind the portrait
      globe.scale.setScalar(1.38);         // a touch bigger
    }
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  var t = 0;

  function tick() {
    t += 0.016;

    globe.rotation.y += 0.0042;              // the roll never stops

    // Spawn random strikes on a loose rhythm
    if (t >= nextSpawn && attacks.length < 6) {
      spawnAttack();
      nextSpawn = t + 0.55 + Math.random() * 1.2;
    }

    // Origin flashes + impact rings fade out
    for (var i = impacts.length - 1; i >= 0; i--) {
      var im = impacts[i];
      im.age += 0.016;
      var k = im.age / im.maxAge;
      if (k >= 1) { disposeObject(im.obj); impacts.splice(i, 1); continue; }
      var rs = 1 + k * im.grow;
      im.obj.scale.set(rs, rs, rs);
      im.obj.material.opacity = im.baseOpacity * (1 - k);
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
    for (var j = attacks.length - 1; j >= 0; j--) {
      var atk = attacks[j];
      atk.t += atk.speed;
      if (atk.t >= 1) {
        addImpactRing(atk.curve.getPointAt(1), 0xc084fc); // violet bloom on the target
        disposeObject(atk.tube);
        disposeObject(atk.packet);
        attacks.splice(j, 1);
        continue;
      }
      var pos = atk.curve.getPointAt(atk.t);
      atk.packet.position.copy(pos);
      var env = Math.sin(Math.PI * atk.t);
      var ps = 0.34 + 0.4 * env;
      atk.packet.scale.set(ps, ps, 1);
      atk.tube.material.opacity = 0.26 + 0.34 * env;
    }

    camera.position.x += (pointer.x * 2.4 - camera.position.x) * 0.045;
    camera.position.y += (0.6 - pointer.y * 1.6 - camera.position.y) * 0.045;
    camera.lookAt(0, 0, 0);

    stars.rotation.y = Math.sin(t * 0.05) * 0.02;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();
