/* PROJECTS ONLY — interactive generative atmosphere. No dependencies. */
(() => {
  const section = document.getElementById('work');
  if (!section || section.dataset.atmosphereReady === 'true') return;
  section.dataset.atmosphereReady = 'true';

  const canvas = document.createElement('canvas');
  canvas.className = 'projects-atmosphere-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const glow = document.createElement('div');
  glow.className = 'projects-atmosphere-glow';
  glow.setAttribute('aria-hidden', 'true');
  const scan = document.createElement('div');
  scan.className = 'projects-atmosphere-scan';
  scan.setAttribute('aria-hidden', 'true');
  section.prepend(canvas, glow, scan);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0, height = 0, dpr = 1, particles = [], pulses = [], raf = 0, last = 0;
  const rand = (min, max) => min + Math.random() * (max - min);

  function resize() {
    const rect = section.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, section.offsetHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(110, Math.max(38, Math.round(width * height / 12500)));
    particles = Array.from({ length: count }, () => ({
      x: rand(0, width), y: rand(0, height),
      vx: rand(-.18, .18), vy: rand(-.18, .18),
      r: rand(.7, 1.8), phase: rand(0, Math.PI * 2),
      seed: Math.random()
    }));
    draw(performance.now(), true);
  }

  function draw(now, staticFrame = false) {
    if (!ctx) return;
    const dt = Math.min(2, Math.max(.2, (now - (last || now)) / 16.67));
    last = now;
    ctx.clearRect(0, 0, width, height);
    // Subtle technical grid, fading toward the edges.
    ctx.save();
    ctx.strokeStyle = 'rgba(126, 177, 155, .065)';
    ctx.lineWidth = .6;
    const spacing = 54;
    for (let x = 0; x < width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();

    const linkDistance = width < 620 ? 82 : 128;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!staticFrame && !reduced.matches) {
        p.phase += .008 * dt;
        p.x += (p.vx + Math.sin(p.phase) * .07) * dt;
        p.y += (p.vy + Math.cos(p.phase * .8) * .07) * dt;
        if (p.x < -8) p.x = width + 8; if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8; if (p.y > height + 8) p.y = -8;
        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 145) {
            const force = (145 - dist) / 145 * .22;
            p.x += dx / dist * force * dt;
            p.y += dy / dist * force * dt;
          }
        }
      }
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j], dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);
        if (dist < linkDistance) {
          const alpha = (1 - dist / linkDistance) * .2;
          ctx.strokeStyle = `rgba(147, 255, 190, ${alpha})`;
          ctx.lineWidth = .65;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      const near = pointer.active ? Math.max(0, 1 - Math.hypot(p.x - pointer.x, p.y - pointer.y) / 180) : 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.seed > .78 ? '184,255,101' : '120,225,205'}, ${.38 + near * .62})`;
      ctx.arc(p.x, p.y, p.r + near * 1.7, 0, Math.PI * 2); ctx.fill();
    }

    if (!staticFrame && !reduced.matches) {
      pulses = pulses.filter(p => p.life < 1);
      for (const p of pulses) {
        p.life += .018 * dt;
        const radius = 14 + p.life * 190;
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(184,255,101,${(1 - p.life) * .55})`;
        ctx.lineWidth = 1.2 * (1 - p.life) + .25; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * .72, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(115,225,205,${(1 - p.life) * .24})`; ctx.lineWidth = .7; ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
  }

  function localPoint(event) {
    const r = section.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  section.addEventListener('pointermove', event => {
    const p = localPoint(event); pointer.x = p.x; pointer.y = p.y; pointer.active = true;
    section.style.setProperty('--atmosphere-x', p.x + 'px');
    section.style.setProperty('--atmosphere-y', p.y + 'px');
    glow.style.opacity = '1';
  }, { passive: true });
  section.addEventListener('pointerleave', () => { pointer.active = false; glow.style.opacity = '0'; }, { passive: true });
  section.addEventListener('pointerdown', event => {
    if (reduced.matches) return;
    const p = localPoint(event); pulses.push({ x: p.x, y: p.y, life: 0 });
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
  section.addEventListener('focusin', () => section.classList.add('projects-atmosphere-focused'));
  section.addEventListener('focusout', () => section.classList.remove('projects-atmosphere-focused'));
  const observer = new ResizeObserver(() => resize());
  observer.observe(section);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!reduced.matches) { last = 0; raf = requestAnimationFrame(draw); }
  });
  reduced.addEventListener?.('change', () => {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (reduced.matches) draw(performance.now(), true);
    else raf = requestAnimationFrame(draw);
  });
  resize();
  if (!reduced.matches) raf = requestAnimationFrame(draw);
})();

/* PROJECTS SECTION BOUNDARIES — animated seams above all sections, with no pointer-reactive effects. */
(() => {
  const section = document.getElementById('work');
  if (!section || document.querySelector('.projects-section-divider')) return;
  const makeDivider = (edge, label) => {
    const seam = document.createElement('div');
    seam.className = 'projects-section-divider';
    seam.dataset.edge = edge;
    seam.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    canvas.className = 'projects-section-divider-canvas';
    const text = document.createElement('span');
    text.className = 'seam-label';
    text.textContent = label;
    seam.append(canvas, text);
    document.body.append(seam);
    return { seam, canvas, edge };
  };
  const top = makeDivider('top', 'SIGNAL BRIDGE / 03');
  const bottom = makeDivider('bottom', 'END OF SELECTED WORK / 03');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seams = [top, bottom];
  let raf = 0, time = 0, lastFrame = 0;
  const frameInterval = 1000 / 30;
  const place = item => {
    const rect = section.getBoundingClientRect();
    const y = item.edge === 'top' ? rect.top : rect.bottom;
    // Fixed viewport positioning keeps seams aligned to Projects; CSS layers them below the hero/intro and overlays.
    item.seam.style.top = `${y}px`;
    // A divider is visible only when its own Projects boundary is near the viewport.
    // This prevents fixed overlays from appearing over the profile/hero intro on page load or refresh.
    const h = item.seam.offsetHeight || 0;
    const visible = y >= -(h * 0.5) && y <= window.innerHeight + (h * 0.5);
    item.seam.classList.toggle('is-boundary-visible', visible);
  };
  const resize = item => {
    const rect = item.seam.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    item.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    item.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    item.canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    item.width = rect.width; item.height = rect.height;
    place(item);
  };
  const paint = (item, offset) => {
    const ctx = item.canvas.getContext('2d');
    if (!ctx) return;
    const w = item.width || window.innerWidth, h = item.height || 1;
    ctx.clearRect(0, 0, w, h);
    const mid = h * .5;
    // Animated filaments and traveling packets remain autonomous; no pointer tracking or click response.
    for (let line = 0; line < 4; line++) {
      const phase = time * (.45 + line * .055) + offset + line * .86;
      ctx.beginPath();
      for (let x = 0; x <= w + 6; x += 6) {
        const nx = x / w;
        const envelope = Math.sin(Math.PI * nx) * .72 + .28;
        const amp = (3 + line * 1.45) * envelope;
        const y = mid + Math.sin(nx * 13 + phase) * amp + Math.sin(nx * 27 - phase * .7) * amp * .32;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const alpha = .045 + (3 - line) * .014;
      ctx.strokeStyle = line % 3 === 0 ? `rgba(184,255,101,${alpha})` : `rgba(116,255,208,${alpha})`;
      ctx.lineWidth = line === 3 ? 1.15 : .65;
      ctx.shadowColor = line % 3 === 0 ? 'rgba(184,255,101,.38)' : 'rgba(116,255,208,.24)';
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 6; i++) {
      const progress = ((time * (.035 + (i % 4) * .009) + i / 6 + offset * .07) % 1);
      const x = progress * w;
      const y = mid + Math.sin(progress * 13 + time + offset) * 5;
      const radius = i % 4 === 0 ? 2.1 : 1.1;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(184,255,101,.20)' : 'rgba(116,255,208,.14)';
      ctx.fillRect(x - radius * 2, y - radius * 2, radius * 4, radius * 4);
      ctx.fillStyle = i % 4 === 0 ? 'rgba(220,255,174,.95)' : 'rgba(157,255,224,.68)';
      ctx.fillRect(x - radius / 2, y - radius / 2, radius, radius);
    }
  };
  const frame = now => {
    raf = 0;
    if (document.hidden) return;
    if (now && now - lastFrame < frameInterval) { schedule(); return; }
    lastFrame = now || performance.now();
    if (!seams.some(item => item.seam.classList.contains('is-boundary-visible'))) return;
    if (!reduced.matches) time += .012;
    seams.forEach((item, i) => paint(item, i * 1.7));
    if (!reduced.matches) raf = requestAnimationFrame(frame);
  };
  const schedule = () => { if (!raf && !reduced.matches && !document.hidden) raf = requestAnimationFrame(frame); };
  const layout = () => { seams.forEach(item => { place(item); resize(item); }); schedule(); };
  seams.forEach((item, i) => { resize(item); paint(item, i * 1.7); });
  window.addEventListener('resize', layout, { passive: true });
  window.addEventListener('scroll', () => seams.forEach(place), { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(section);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else schedule();
  });
  reduced.addEventListener?.('change', () => {
    cancelAnimationFrame(raf); raf = 0; seams.forEach((item, i) => paint(item, i * 1.7)); schedule();
  });
  schedule();
})();
