/* ============================================================
   tilt3d.js — CSS-perspective 3D tilt for cards
   Pointer-driven rotation with glare, disabled for touch &
   reduced-motion users.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion || !finePointer) return;

  var MAX_TILT = 7; // degrees — subtle, not gimmicky

  function attach(el) {
    el.classList.add('tilt');
    var glare = el.querySelector('.tilt__glare');
    if (!glare) {
      glare = document.createElement('span');
      glare.className = 'tilt__glare';
      glare.setAttribute('aria-hidden', 'true');
      el.appendChild(glare);
    }

    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;   // 0..1
      var py = (e.clientY - rect.top) / rect.height;   // 0..1
      var rx = (0.5 - py) * MAX_TILT * 2;
      var ry = (px - 0.5) * MAX_TILT * 2;
      el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      glare.style.background =
        'radial-gradient(circle at ' + (px * 100).toFixed(1) + '% ' + (py * 100).toFixed(1) + '%, rgba(125,211,252,0.22), transparent 55%)';
    });

    el.addEventListener('mouseleave', function () {
      el.style.transform = '';
      glare.style.background = 'transparent';
    });
  }

  document.querySelectorAll('.project-card, .cert-card, .skill-card').forEach(attach);
})();
