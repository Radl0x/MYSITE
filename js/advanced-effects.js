/* Advanced interaction layer: progressive enhancement, no dependencies. */
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = () => motionQuery.matches;

function initReveal() {
  const targets = document.querySelectorAll(
    'main section, .section-block, .work-card, .service-card, .process-list article, .contact-form-wrap, .contact-aside, .admin-card, .admin-panel, .admin-stat, .chat-list-item'
  );
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    targets.forEach(el => el.classList.add('fx-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('fx-visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
  targets.forEach((el, index) => {
    if (el.matches('main section') || el.matches('.section-block')) el.classList.add('fx-reveal-section');
    else el.classList.add('fx-reveal');
    if (el.matches('.work-card, .service-card, .process-list article')) el.style.setProperty('--fx-delay', `${(index % 5) * 55}ms`);
    observer.observe(el);
  });
}

function initHoverEffects() {
  if (!finePointer.matches || reducedMotion()) return;
  const cards = document.querySelectorAll('.work-card, .service-card, .process-list article, .contact-form-wrap, .admin-card, .admin-panel, .admin-stat');
  cards.forEach(card => {
    card.classList.add('fx-tilt-card');
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--fx-x', `${Math.round(x * 100)}%`);
      card.style.setProperty('--fx-y', `${Math.round(y * 100)}%`);
      if (card.matches('.work-card, .service-card')) {
        card.style.setProperty('--fx-rotate-x', `${((.5 - y) * 3).toFixed(2)}deg`);
        card.style.setProperty('--fx-rotate-y', `${((x - .5) * 4).toFixed(2)}deg`);
      }
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--fx-rotate-x');
      card.style.removeProperty('--fx-rotate-y');
    }, { passive: true });
  });

  document.querySelectorAll('.button, .service-link, .form-tab, .live-chat-toggle, .nav-links a, .admin-nav a, button').forEach(el => {
    el.classList.add('fx-interactive');
    el.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--fx-ripple-x', `${event.clientX - rect.left}px`);
      el.style.setProperty('--fx-ripple-y', `${event.clientY - rect.top}px`);
      el.classList.remove('fx-ripple');
      requestAnimationFrame(() => el.classList.add('fx-ripple'));
      window.setTimeout(() => el.classList.remove('fx-ripple'), 520);
    });
  });
}

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'fx-scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let queued = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
    queued = false;
  };
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
}

function initPointerAura() {
  if (!finePointer.matches || reducedMotion()) return;
  const aura = document.createElement('div');
  aura.className = 'fx-pointer-aura';
  aura.setAttribute('aria-hidden', 'true');
  document.body.appendChild(aura);
  let x = -100, y = -100, tx = x, ty = y, raf = false;
  const draw = () => {
    x += (tx - x) * .18; y += (ty - y) * .18;
    aura.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > .5) requestAnimationFrame(draw);
    else raf = false;
  };
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX - 130; ty = e.clientY - 130;
    if (!raf) { raf = true; requestAnimationFrame(draw); }
  }, { passive: true });
  document.addEventListener('pointerover', e => {
    if (e.target.closest('a,button,.work-card,.service-card')) aura.classList.add('fx-pointer-aura-active');
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest('a,button,.work-card,.service-card')) aura.classList.remove('fx-pointer-aura-active');
  });
}

function initSmoothAnchors() {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || reducedMotion()) return;
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });
}

function initHeroParallax() {
  const hero = document.querySelector('.hero, .hero-section, #home');
  if (!hero || !finePointer.matches || reducedMotion()) return;
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--fx-pointer-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
    hero.style.setProperty('--fx-pointer-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    hero.style.removeProperty('--fx-pointer-x');
    hero.style.removeProperty('--fx-pointer-y');
  }, { passive: true });
}

function start() {
  initReveal();
  initHoverEffects();
  initScrollProgress();
  initPointerAura();
  initSmoothAnchors();
  initHeroParallax();
  document.documentElement.classList.add('fx-ready');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
