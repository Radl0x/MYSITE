import { db } from "./firebase.js";
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const lab = document.querySelector('[data-profile-lab]');
if (lab) {
  const data = {
    frontend: { index: 'NODE 01 / 05', kicker: 'LE BASI DEL FRONT-END', title: 'Interfacce chiare.<br><em>Codice affidabile.</em>', copy: 'Trasformo requisiti e idee in interfacce chiare, responsive e accessibili. Struttura, contenuti e comportamento vengono pensati insieme, per un’esperienza coerente su ogni dispositivo.', tags: ['HTML5', 'CSS3', 'JavaScript', 'Accessibility'], mode: 'PRECISIONE + PERFORMANCE', meter: 92 },
    firebase: { index: 'NODE 02 / 05', kicker: 'DATI E INTEGRAZIONI', title: 'Dati che<br><em>prendono vita.</em>', copy: 'Collego interfacce e dati con servizi cloud. Autenticazione, contenuti e aggiornamenti diventano parti coordinate di un prodotto digitale, con attenzione a sicurezza e manutenzione.', tags: ['Firebase', 'Firestore', 'Auth', 'Realtime'], mode: 'INTEGRAZIONE + AFFIDABILITÀ', meter: 84 },
    creative: { index: 'NODE 03 / 05', kicker: 'ESPERIENZE INTERATTIVE', title: 'Il codice<br><em>diventa spazio.</em>', copy: 'Uso 3D, grafica generativa e movimento quando aggiungono valore all’esperienza. L’effetto visivo deve sostenere il messaggio, non ostacolare la navigazione.', tags: ['Three.js', 'WebGL', 'Canvas', 'Shaders'], mode: 'ESPLORAZIONE + PROFONDITÀ', meter: 87 },
    motion: { index: 'NODE 04 / 05', kicker: 'MOVIMENTO E USABILITÀ', title: 'Ogni gesto<br><em>ha una risposta.</em>', copy: 'Le animazioni guidano l’attenzione e rendono comprensibili le interazioni. Ritmo, feedback e transizioni vengono usati con misura, senza compromettere leggibilità e prestazioni.', tags: ['CSS Motion', 'JavaScript', 'Micro-UX', 'Timing'], mode: 'RITMO + FEEDBACK', meter: 89 },
    systems: { index: 'NODE 05 / 05', kicker: 'PROGETTARE IL SISTEMA', title: 'Visione ampia.<br><em>Dettagli precisi.</em>', copy: 'Parto dal problema e considero il prodotto nel suo insieme: gerarchia, componenti, accessibilità, comportamento responsive e prestazioni devono lavorare nella stessa direzione.', tags: ['UX Thinking', 'Responsive', 'A11y', 'Performance'], mode: 'STRATEGIA + COERENZA', meter: 90 }
  };
  const $ = (selector) => lab.querySelector(selector);
  // Skill pubbliche gestite dal CMS: ordine e campi testuali vengono letti da Firestore.
  (async () => {
    try {
      const snap = await getDocs(query(collection(db, "skills"), where("visible", "==", true), limit(20)));
      const records = snap.docs.map(doc => doc.data()).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0));
      const keys = Object.keys(data);
      records.slice(0, keys.length).forEach((record, index) => {
        const key = keys[index], item = data[key];
        if (record.title) item.cmsTitle = String(record.title);
        if (record.category) item.kicker = String(record.category);
        if (record.description) item.copy = String(record.description);
        if (record.level) item.mode = String(record.level);
        const tags = String(record.category || "").split(/[,/|]/).map(value => value.trim()).filter(Boolean);
        if (tags.length > 1) item.tags = tags.slice(0, 6);
        const node = nodes[index];
        if (node && record.title) {
          const label = [...node.querySelectorAll("span")].at(-1);
          if (label) label.textContent = String(record.title).toUpperCase();
        }
      });
      const active = nodes.find(node => node.classList.contains("is-active"));
      if (active) setSkill(active.dataset.skill);
    } catch (error) {
      console.info("Competenze CMS non disponibili; uso dei contenuti integrati.", error?.code || error);
    }
  })();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = [...lab.querySelectorAll('.psl-node')];
  const setSkill = (key) => {
    const item = data[key];
    if (!item) return;
    nodes.forEach((node) => {
      const active = node.dataset.skill === key;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', String(active));
    });
    $('#pslDetailIndex').textContent = item.index;
    $('#pslDetailKicker').textContent = item.kicker;
    if (item.cmsTitle) $('#pslDetailTitle').textContent = item.cmsTitle;
    else $('#pslDetailTitle').innerHTML = item.title;
    $('#pslDetailCopy').textContent = item.copy;
    $('#pslDetailMode').textContent = item.mode;
    $('#pslDetailMeter').style.width = `${item.meter}%`;
    const tags = $('#pslDetailTags');
    tags.replaceChildren(...item.tags.map((tag) => {
      const span = document.createElement('span'); span.textContent = tag; return span;
    }));
  };
  nodes.forEach((node) => {
    node.addEventListener('click', () => setSkill(node.dataset.skill));
    node.addEventListener('mouseenter', () => { if (window.matchMedia('(hover: hover)').matches) setSkill(node.dataset.skill); });
    node.addEventListener('focus', () => setSkill(node.dataset.skill));
  });

  const canvas = $('#profileStackCanvas');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (canvas && ctx) {
    let width = 0, height = 0, frame = 0, pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
    const particles = Array.from({ length: 72 }, (_, i) => ({ angle: Math.random() * Math.PI * 2, radius: .12 + Math.random() * .39, speed: (Math.random() * .18 + .025) * (i % 2 ? 1 : -1), size: .5 + Math.random() * 1.5, phase: Math.random() * 7 }));
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      width = rect.width; height = rect.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time = 0) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2 + pointerX * 15, cy = height / 2 + pointerY * 12;
      const base = Math.min(width, height);
      particles.forEach((p, i) => {
        const angle = p.angle + (reducedMotion ? 0 : time * .00012 * p.speed);
        const x = cx + Math.cos(angle) * base * p.radius;
        const y = cy + Math.sin(angle) * base * p.radius * .76;
        const alpha = .18 + (Math.sin(time * .001 + p.phase) + 1) * .18;
        ctx.beginPath(); ctx.fillStyle = i % 5 === 0 ? `rgba(117,231,255,${alpha})` : `rgba(184,255,101,${alpha})`;
        ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
        if (i % 4 === 0) {
          const next = particles[(i + 7) % particles.length];
          const nx = cx + Math.cos(next.angle + (reducedMotion ? 0 : time * .00012 * next.speed)) * base * next.radius;
          const ny = cy + Math.sin(next.angle + (reducedMotion ? 0 : time * .00012 * next.speed)) * base * next.radius * .76;
          const dist = Math.hypot(nx - x, ny - y);
          if (dist < base * .25) { ctx.beginPath(); ctx.strokeStyle = `rgba(117,231,255,${.09 * (1 - dist / (base * .25))})`; ctx.lineWidth = .6; ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); }
        }
      });
      pointerX += (targetX - pointerX) * .045; pointerY += (targetY - pointerY) * .045;
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    if (reducedMotion) draw(0); else frame = requestAnimationFrame(draw);
    canvas.parentElement.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect(); targetX = ((event.clientX - rect.left) / rect.width - .5) * 2; targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    }, { passive: true });
    canvas.parentElement.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else if (!reducedMotion) frame = requestAnimationFrame(draw);
    });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); observer.disconnect(); }, { once: true });
  }
}

// Single-frame selector: the skill system and biography occupy the same stage.
(() => {
  const deck = document.querySelector('[data-profile-switcher]');
  if (!deck) return;
  const buttons = [...deck.querySelectorAll('[data-view-target]')];
  const panels = [...deck.querySelectorAll('[data-view-panel]')];
  const status = deck.querySelector('#pslTransmissionStatus');
  const labels = {
    stack: 'PERCORSO 01 — STRUMENTI ATTIVI',
    origin: 'SIGNAL 02 — ORIGIN DECODED'
  };
  const activate = (key, moveFocus = false) => {
    buttons.forEach((button) => {
      const active = button.dataset.viewTarget === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active && moveFocus) button.focus();
    });
    panels.forEach((panel) => {
      const active = panel.dataset.viewPanel === key;
      panel.classList.toggle('is-current', active);
      panel.setAttribute('aria-hidden', String(!active));
      if ('inert' in panel) panel.inert = !active;
      else panel.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach((el) => {
        if (!active) { el.dataset.previousTabindex = el.getAttribute('tabindex') ?? ''; el.setAttribute('tabindex', '-1'); }
        else if (el.dataset.previousTabindex !== undefined) {
          if (el.dataset.previousTabindex === '') el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', el.dataset.previousTabindex);
          delete el.dataset.previousTabindex;
        }
      });
    });
    if (status) status.textContent = labels[key] || labels.stack;
    if (key === 'stack') {
      const canvas = deck.querySelector('#profileStackCanvas');
      if (canvas) window.dispatchEvent(new Event('resize'));
    }
  };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activate(button.dataset.viewTarget));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      activate(buttons[next].dataset.viewTarget, true);
    });
  });
  activate('stack');
})();
