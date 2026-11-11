/* ============================================================
   socwall.js — ambient "SOC wall" layer for the hero
   Faint honeycomb grid + slow radar scanline + occasional
   data-streak bolts. Sits above the WebGL scene, below content.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('socwall');
  if (!canvas || reduceMotion) return;

  var ctx = canvas.getContext('2d');
  var hero = canvas.closest('.hero');

  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  var HEX_R = 34;
  var HEX_W = Math.sqrt(3) * HEX_R;
  var HEX_H = 1.5 * HEX_R;

  function hexPath(cx, cy) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 180) * (30 + 60 * i);
      var x = cx + HEX_R * Math.cos(a);
      var y = cy + HEX_R * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawHexGrid() {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    var row = 0;
    for (var y = -HEX_R; y < H + HEX_R; y += HEX_H, row++) {
      var offset = (row % 2) ? HEX_W / 2 : 0;
      for (var x = -HEX_W + offset; x < W + HEX_W; x += HEX_W) {
        hexPath(x, y);
        ctx.stroke();
      }
    }
  }

  /* ---------- Streaks (data bolts) ---------- */
  var streaks = [];
  var nextStreak = 0;

  function spawnStreak(t) {
    // Launch from top or right edge, always diving down-left
    var fromTop = Math.random() < 0.68;
    var x = fromTop ? (0.15 + Math.random() * 0.85) * W : W + 60;
    var y = fromTop ? -40 : Math.random() * H * 0.5;
    var speed = 750 + Math.random() * 650;
    streaks.push({
      x: x, y: y,
      vx: -(0.72 + Math.random() * 0.4) * speed,
      vy: (0.5 + Math.random() * 0.3) * speed,
      born: t,
      life: 1.1
    });
    nextStreak = t + 1.6 + Math.random() * 3.4;
  }

  function drawStreaks(t, dt) {
    for (var i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      var age = t - s.born;
      if (age > s.life) { streaks.splice(i, 1); continue; }

      s.x += s.vx * dt;
      s.y += s.vy * dt;

      var fade = Math.sin((age / s.life) * Math.PI); // in-out
      var tx = s.x - s.vx * 0.075;
      var ty = s.y - s.vy * 0.075;

      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, 'rgba(125, 211, 252, ' + (0.9 * fade).toFixed(3) + ')');
      grad.addColorStop(0.4, 'rgba(34, 211, 238, ' + (0.45 * fade).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Bright head
      ctx.fillStyle = 'rgba(224, 242, 254, ' + (0.95 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  var t = 0;
  var last = 0;

  function frame(now) {
    if (!last) last = now;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    ctx.clearRect(0, 0, W, H);

    drawHexGrid();

    // Slow radar scanline drifting downward
    var scanY = ((t * 55) % (H + 320)) - 160;
    var scanGrad = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
    scanGrad.addColorStop(0, 'rgba(45, 212, 191, 0)');
    scanGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.05)');
    scanGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 80, W, 160);

    // Occasional data bolts
    if (t >= nextStreak) spawnStreak(t);
    drawStreaks(t, dt);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
