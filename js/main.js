/* Yatish Waghmare — portfolio interactions (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Current year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Typing animation — the original site's signature roles
  var typingEl = document.getElementById('typing');
  if (typingEl && !reduceMotion) {
    var roles = ['I triage the noise.', 'I hunt the adversary.', 'I engineer the fix.'];
    var i = 0, j = 0, deleting = false, current = '';
    (function type() {
      var full = roles[i];
      if (!deleting) {
        current = full.slice(0, ++j);
      } else {
        current = full.slice(0, --j);
      }
      typingEl.textContent = current;
      if (!deleting && j === full.length) {
        deleting = true;
        return setTimeout(type, 1400);
      }
      if (deleting && j === 0) {
        deleting = false;
        i = (i + 1) % roles.length;
        return setTimeout(type, 250);
      }
      setTimeout(type, deleting ? 35 : 70);
    })();
  } else if (typingEl) {
    typingEl.textContent = 'I hunt the adversary.';
  }

  // Duplicate marquee content for a seamless infinite loop
  document.querySelectorAll('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  // Reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // Stagger hero items slightly for a polished entrance
  document.querySelectorAll('.hero .reveal').forEach(function (el, i) {
    el.style.transitionDelay = (i * 120) + 'ms';
  });

  // Back to top button
  var toTop = document.getElementById('toTop');
  if (toTop) {
    var onScroll = function () {
      toTop.classList.toggle('is-visible', window.scrollY > 480);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();

/* Live ops feed (About telemetry card) */
(function () {
  var card = document.querySelector('.telemetry');
  if (!card) return;

  // Counters tick up on first view
  var nums = card.querySelectorAll('.ops-num');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateNum(el) {
    var target = +el.dataset.target;
    var suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var start = null, dur = 1600;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(2, -10 * p);
      if (p === 1) eased = 1;
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var started = false;
  function startCounters() {
    if (started) return;
    started = true;
    nums.forEach(animateNum);
  }

  if (reduce) {
    startCounters();
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        io.disconnect();
        startCounters();
      }
    });
  }, { threshold: 0.3 });
  io.observe(card);

  // Also start immediately if the card is already visible on load
  window.addEventListener('load', function () {
    var r = card.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) startCounters();
  });

  // Test-render safety net: never show raw zeros on a static capture
  setTimeout(function () {
    if (!started) {
      nums.forEach(function (el) {
        var target = +el.dataset.target;
        el.textContent = target + (el.dataset.suffix || '');
      });
    }
  }, 1200);
})();
