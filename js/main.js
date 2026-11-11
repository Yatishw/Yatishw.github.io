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

  // Analyst console — type the profile live
  (function () {
    var body = document.getElementById('consoleBody');
    if (!body) return;
    if (reduceMotion) {
      body.textContent = 'yatish@soc-01$ ./evaluate candidate\nyatish waghmare — SOC Analyst · Detection Engineer\ncerts: CISMP · VMDR · DHS ICS · SC-900 · ISO/IEC 27001 · CTI · PwC\nsentinelforge: 12 versioned detections, SF-CORR-EXEC-001 validated\nstatus: OPEN_TO_WORK=true · location=bristol · urgency=high';
      return;
    }

    var script = [
      { p: 'yatish@soc-01 ~ $ ./evaluate candidate', c: 'info', d: 70, pre: true },
      { p: 'Entering secure evaluator...', c: 'dim', d: 120 },
      { p: '', d: 350, blank: true },
      { p: 'whoami', c: 'info', d: 400, cmd: true },
      { p: 'yatish waghmare — SOC ANALYST · DETECTION ENGINEER', c: 'ok', d: 520 },
      { p: 'education: MSc Cyber Security (UK) · SOC since 2023 · Bristol', c: 'dim', d: 560 },
      { p: '', d: 260, blank: true },
      { p: 'grep -i certs /var/log/me', c: 'info', d: 450, cmd: true },
      { p: '[BCS-CISMP] ✓ [Qualys-VMDR] ✓ [DHS-ICS] ✓ [SC-900] ✓ [ISO-27001] ✓ [CTI] ✓ [PwC sim] ✓', c: 'ok', d: 650 },
      { p: '', d: 260, blank: true },
      { p: 'tail -f /var/log/incidents.log', c: 'info', d: 450, cmd: true },
      { p: '[2025-11] SF-DET-SVC-INSTALL-001  → WKSTN-07 detected', c: 'warn', d: 520 },
      { p: '[2025-11] SF-DET-PWRSH-ENC-002    → WKSTN-07 detected', c: 'warn', d: 440 },
      { p: '[2025-11] SF-CORR-EXEC-001       → INC-0042 correlated+contained', c: 'warn', d: 600 },
      { p: '[2025-09] UAV pentest framework — 5 attack vectors benchmarked', c: 'accent', d: 500 },
      { p: '', d: 260, blank: true },
      { p: 'status --availability', c: 'info', d: 380, cmd: true },
      { p: 'OPEN_TO_WORK=true · SOC_ANALYST · DETECTION_ENGINEER · BRISTOL', c: 'ok', d: 700 },
      { p: '', d: 260, blank: true },
      { p: 'yatish@soc-01 ~ $ <span class="cursor"></span>', c: 'info', d: 999999, pre: true, html: true }
    ];

    var i = 0;
    var started = false;
    function typeLine() {
      var line = script[i];
      if (!line) return;
      var div = document.createElement('div');
      div.className = line.c || '';
      body.appendChild(div);
      var text = line.p;
      var html = line.html ? text : text;
      if (line.blank) { div.innerHTML = '&nbsp;'; i++; return setTimeout(typeLine, line.d); }
      if (line.pre) { div.innerHTML = html; i++; return setTimeout(typeLine, line.d); }
      var out = '';
      var j = 0;
      var step = function () {
        if (j < text.length) {
          out += text[j++];
          div.innerHTML = line.c === 'info' ? '<span class="info">' + out + '</span>' : '<span class="' + (line.c || '') + '">' + out + '</span>';
          setTimeout(step, 9 + Math.random() * 22);
        } else {
          i++;
          var pause = line.cmd ? 380 : 140;
          setTimeout(typeLine, pause);
        }
      };
      step();
    }
    var consoleStarted = false;
    function start() {
      if (consoleStarted) return;
      consoleStarted = true;
      typeLine();
    }

    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { cio.disconnect(); start(); }
        });
      }, { threshold: 0.2 });
      cio.observe(body);
    } else {
      start();
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
