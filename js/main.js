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

  // About — decrypt dossier (scramble reveal, once, on scroll into view)
  (function () {
    var el = document.getElementById('aboutCipher');
    if (!el) return;

    var lines = [
      '> SUBJECT....CYBER SECURITY ANALYST',
      '> EDUCATION..MSc CYBER SECURITY (UK)',
      '> EXPERIENCE.2+ YRS — SOC & IR · ENTERPRISE + OT/ICS',
      '> STACK......FALCON · SPLUNK ES · ELASTIC · SENTINEL · QUALYS VMDR · WAZUH',
      '> METHOD.....MALWARE DETONATED · ATT&CK-MAPPED DETECTION',
      '> RESEARCH...UAV PENTEST FRAMEWORK · SENTINELFORGE',
      '> STATUS.....OPEN TO SOC / DETECTION ROLES'
    ];
    var glyphs = '!<>-_\\/[]{}=+*^?#________';

    if (reduceMotion) {
      el.textContent = lines.join('\n');
      return;
    }

    var lineIndex = 0;

    function renderFrame(progress) {
      var html = '';
      for (var i = 0; i < lineIndex; i++) html += lines[i] + '\n';
      if (lineIndex < lines.length) {
        var line = lines[lineIndex];
        var reveal = Math.floor(line.length * progress);
        for (var j = 0; j < line.length; j++) {
          html += j < reveal ? line[j] : glyphs[Math.floor(Math.random() * glyphs.length)];
        }
      } else {
        html += '<span class="end">\n> END OF FILE </span><span class="caret">▋</span>';
      }
      el.innerHTML = html;
    }

    function decryptLine(done) {
      var frame = 0, total = 30;
      var iv = setInterval(function () {
        frame++;
        renderFrame(frame / total);
        if (frame >= total) {
          clearInterval(iv);
          lineIndex++;
          if (done) done();
        }
      }, 26);
    }

    function start() {
      (function chain() {
        if (lineIndex < lines.length) decryptLine(chain);
        else renderFrame(1);
      })();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            io.disconnect();
            start();
          }
        });
      }, { threshold: 0.35 });
      io.observe(el);
    } else {
      el.textContent = lines.join('\n');
    }
  })();

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
