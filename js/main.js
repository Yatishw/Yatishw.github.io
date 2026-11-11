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
  var track = document.getElementById('marqueeTrack');
  if (track) track.innerHTML += track.innerHTML;

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
