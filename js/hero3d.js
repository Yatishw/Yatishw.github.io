/* ============================================================
   hero3d.js — WebGL particle-network backdrop (Three.js)
   A quiet, professional cyber-operations starfield: nodes drift,
   nearby nodes link with faint lines, and the whole field
   parallaxes gently with the pointer.
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
  var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  var hero = canvas.closest('.hero');

  function sizeToHero() {
    var w = hero.clientWidth;
    var h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  sizeToHero();
  window.addEventListener('resize', sizeToHero, { passive: true });

  /* ---- Nodes ---- */
  var COUNT = window.innerWidth < 720 ? 60 : 110;
  var RANGE = { x: 26, y: 15, z: 12 };
  var positions = new Float32Array(COUNT * 3);
  var velocities = [];

  for (var i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * RANGE.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * RANGE.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RANGE.z;
    velocities.push({
      x: (Math.random() - 0.5) * 0.014,
      y: (Math.random() - 0.5) * 0.014,
      z: (Math.random() - 0.5) * 0.008
    });
  }

  var nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Soft glow sprite generated on-canvas (no external assets)
  var spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  var ctx = spriteCanvas.getContext('2d');
  var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(125, 211, 252, 1)');
  gradient.addColorStop(0.35, 'rgba(56, 189, 248, 0.85)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  var sprite = new THREE.CanvasTexture(spriteCanvas);

  var nodeMat = new THREE.PointsMaterial({
    size: 0.42,
    map: sprite,
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(nodeGeo, nodeMat);
  scene.add(points);

  /* ---- Links between near neighbours ---- */
  var MAX_LINKS = COUNT * 3;
  var linkPositions = new Float32Array(MAX_LINKS * 6);
  var linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
  var linkMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var lines = new THREE.LineSegments(linkGeo, linkMat);
  scene.add(lines);

  var LINK_DIST = 3.4;
  var LINK_DIST_SQ = LINK_DIST * LINK_DIST;

  /* ---- Pointer parallax ---- */
  var pointer = { x: 0, y: 0 };
  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; }, { passive: true });

  var clock = { t: 0 };

  function tick() {
    clock.t += 0.016;

    // Drift nodes, bounce at edges
    var pos = nodeGeo.attributes.position.array;
    for (var i = 0; i < COUNT; i++) {
      var ix = i * 3;
      pos[ix] += velocities[i].x;
      pos[ix + 1] += velocities[i].y;
      pos[ix + 2] += velocities[i].z;
      if (Math.abs(pos[ix]) > RANGE.x / 2) velocities[i].x *= -1;
      if (Math.abs(pos[ix + 1]) > RANGE.y / 2) velocities[i].y *= -1;
      if (Math.abs(pos[ix + 2]) > RANGE.z / 2) velocities[i].z *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    // Rebuild links
    var l = 0;
    for (var a = 0; a < COUNT; a++) {
      var ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      for (var b = a + 1; b < COUNT && l < MAX_LINKS; b++) {
        var dx = pos[b * 3] - ax, dy = pos[b * 3 + 1] - ay, dz = pos[b * 3 + 2] - az;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < LINK_DIST_SQ) {
          linkPositions[l * 6] = ax; linkPositions[l * 6 + 1] = ay; linkPositions[l * 6 + 2] = az;
          linkPositions[l * 6 + 3] = pos[b * 3]; linkPositions[l * 6 + 4] = pos[b * 3 + 1]; linkPositions[l * 6 + 5] = pos[b * 3 + 2];
          l++;
        }
      }
    }
    linkGeo.setDrawRange(0, l * 2);
    linkGeo.attributes.position.needsUpdate = true;

    // Gentle parallax + slow scene sway
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (-pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.position.z = 14;
    camera.lookAt(0, 0, 0);
    scene.rotation.y = Math.sin(clock.t * 0.12) * 0.08;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
})();
