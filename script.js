/* ══════════════════════════════════════════════════════════════
   RABEYA REAL ESTATE — MAIN SCRIPT
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CUSTOM CURSOR ────────────────────────────────────────── */
  function initCursor() {
    const isTouch = !window.matchMedia('(pointer: fine)').matches;
    if (isTouch) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.innerHTML = '<div class="cursor__dot"></div><div class="cursor__ring"></div>';
    document.body.appendChild(cursor);

    const dot  = cursor.querySelector('.cursor__dot');
    const ring = cursor.querySelector('.cursor__ring');

    let mx = 0, my = 0;
    let rx = 0, ry = 0;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px, ' + my + 'px) translate(-50%, -50%)';
    });

    function raf() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = 'translate(' + rx + 'px, ' + ry + 'px) translate(-50%, -50%)';
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const hoverEls = document.querySelectorAll('a, button, [tabindex="0"], .gallery__tile, .btn');
    hoverEls.forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-hover'); });
    });
  }

  /* ── NAVIGATION ───────────────────────────────────────────── */
  function initNav() {
    const nav        = document.getElementById('nav');
    const toggle     = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('navMobile');
    const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('.nav__mobile-link, .btn--nav-mobile') : [];

    // Scroll class
    function onScroll() {
      if (window.scrollY > 40) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function () {
        const isOpen = toggle.classList.toggle('is-open');
        mobileMenu.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen);
        mobileMenu.setAttribute('aria-hidden', !isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      mobileLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.classList.remove('is-open');
          mobileMenu.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          mobileMenu.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        });
      });
    }
  }

  /* ── SCROLL REVEAL (Intersection Observer) ───────────────── */
  function initReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    targets.forEach(function (el, i) {
      // Stagger sibling elements slightly
      el.style.transitionDelay = (i % 3) * 0.08 + 's';
      observer.observe(el);
    });
  }

  /* ── COUNTER ANIMATION ────────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.getAttribute('data-count'), 10);
        const suffix = target >= 1000 ? '+' : '+';
        const duration = 1800;
        const start  = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = current.toLocaleString() + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ── UPLOADCARE LOGIC ─────────────────────────────────────── */
  function initUploadcare() {
    // Target the new v1 uc- component
    const ctx = document.querySelector('uc-upload-ctx-provider');
    const hiddenInput = document.getElementById('fileUrlInput');

    if (!ctx || !hiddenInput) {
      console.warn("Uploadcare elements not found in the DOM.");
      return;
    }

    ctx.addEventListener('file-upload-success', function(e) {
      if (e.detail && e.detail.cdnUrl) {
        // If they upload multiple files, stack the URLs cleanly
        const currentVal = hiddenInput.value;
        hiddenInput.value = currentVal ? currentVal + '\n' + e.detail.cdnUrl : e.detail.cdnUrl;
        console.log('Attachment secured and ready for transmission:', e.detail.cdnUrl);
      }
    });
  }

  /* ── CONTACT FORM SUBMISSION ──────────────────────────────── */
  function initForm() {
    const form       = document.getElementById('contactForm');
    const submitBtn  = document.getElementById('submitBtn');
    const successBox = document.getElementById('contactSuccess');
    const successRef = document.getElementById('successRef');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Basic validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(function (field) {
        field.classList.remove('has-error');
        if (!field.value.trim()) {
          field.classList.add('has-error');
          valid = false;
          field.addEventListener('input', function () {
            field.classList.remove('has-error');
          }, { once: true });
        }
      });

      if (!valid) {
        const firstError = form.querySelector('.has-error');
        if (firstError) firstError.focus();
        return;
      }

      // Loading state
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      try {
        const data = Object.fromEntries(new FormData(form));

        // Format the hidden file_url into a clean, clickable string within the message body
        if (data.file_url && data.file_url.trim()) {
          data.message = (data.message ? data.message + '\n\n' : '')
            + '--- Attached File(s) ---\n'
            + data.file_url.trim();
        }

        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          // Generate a reference number
          const ref = 'RRE-' + Date.now().toString(36).toUpperCase();
          if (successRef) successRef.textContent = ref;

          // Fade out form
          form.classList.add('is-hidden');

          // Show success after a brief pause
          setTimeout(function () {
            if (successBox) {
              successBox.style.display = 'flex';
              successBox.classList.add('is-visible');
            }
          }, 300);

        } else {
          throw new Error(result.message || 'Submission failed');
        }

      } catch (err) {
        console.error('Form error:', err);
        // Show inline error without alert
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn__text').textContent = 'Try Again';

        const errMsg = form.querySelector('.contact__form-error');
        if (!errMsg) {
          const p = document.createElement('p');
          p.className = 'contact__form-error';
          p.style.cssText = 'color: rgba(220,80,80,0.85); font-size:12px; text-align:center; margin-top:12px; font-family: var(--font-sans); letter-spacing:0.04em;';
          p.textContent = 'Something went wrong. Please try again or contact us directly.';
          form.appendChild(p);
        }
      }
    });
  }

  /* ── SMOOTH ANCHOR SCROLL ─────────────────────────────────── */
  function initSmoothScroll() {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        const hash = link.getAttribute('href');
        if (hash === '#') return;
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ── GALLERY TILE CURSOR CHANGE ───────────────────────────── */
  function initGallery() {
    document.querySelectorAll('.gallery__tile').forEach(function (tile) {
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // In a full implementation, this would open a lightbox
          tile.classList.toggle('is-active');
        }
      });
    });
  }

  /* ── HERO PARALLAX (subtle) ───────────────────────────────── */
  function initParallax() {
    const heroBg = document.getElementById('heroBg');
    if (!heroBg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          const scrollY = window.scrollY;
          const vh = window.innerHeight;
          if (scrollY < vh) {
            const pct = scrollY / vh;
            // Subtle downward drift as user scrolls
            heroBg.style.transform = 'translateY(' + (pct * 8) + '%)';
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── STAGGER DELAY FOR ABOUT PILLARS ──────────────────────── */
  function initStaggeredPillars() {
    const pillars = document.querySelectorAll('.about__pillar');
    pillars.forEach(function (pillar, i) {
      pillar.style.opacity = '0';
      pillar.style.transform = 'translateX(-16px)';
      pillar.style.transition = 'opacity 0.7s ' + (0.1 + i * 0.12) + 's cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s ' + (0.1 + i * 0.12) + 's cubic-bezier(0.22, 1, 0.36, 1)';
    });

    const about = document.querySelector('.about__editorial');
    if (!about) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          pillars.forEach(function (pillar) {
            pillar.style.opacity = '1';
            pillar.style.transform = 'none';
          });
          observer.unobserve(about);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(about);
  }

  /* ── GALLERY TILE ENTRANCE ────────────────────────────────── */
  function initGalleryReveal() {
    const tiles = document.querySelectorAll('.gallery__tile');
    tiles.forEach(function (tile, i) {
      tile.style.opacity = '0';
      tile.style.transform = 'translateY(24px)';
      tile.style.transition = 'opacity 0.8s ' + (i * 0.15) + 's cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s ' + (i * 0.15) + 's cubic-bezier(0.22, 1, 0.36, 1)';
    });

    const grid = document.querySelector('.gallery__grid');
    if (!grid) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tiles.forEach(function (tile) {
            tile.style.opacity = '1';
            tile.style.transform = 'none';
          });
          observer.unobserve(grid);
        }
      });
    }, { threshold: 0.08 });

    observer.observe(grid);
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    initCursor();
    initNav();
    initReveal();
    initCounters();
    initUploadcare();
    initForm();
    initSmoothScroll();
    initGallery();
    initParallax();
    initStaggeredPillars();
    initGalleryReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();