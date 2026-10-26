/* HERO ONLY — transparent 2D creative-coding overlay. No dependencies. */
(() => {
  const hero = document.querySelector('#home');
  const visual = hero?.querySelector('.hero-visual');
  if (!hero || !visual || visual.querySelector('#heroCinematicCanvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'heroCinematicCanvas';
  canvas.className = 'hero-cinematic-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  visual.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  let w = 0, h = 0, dpr = 1, raf = 0, visible = true;
  let pointer = { x: .5, y: .5, tx: .5, ty: .5, active: false };
  const rand = (a, b) => a + Math.random() * (b - a);
  const motes = Array.from({ length: 88 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: rand(.45, 1.8), speed: rand(.000035, .00016),
    phase: rand(0, Math.PI * 2), hue: i % 4 === 0 ? 190 : 88, alpha: rand(.16, .62)
  }));
  const sparks = Array.from({ length: 34 }, () => ({ angle: rand(0, Math.PI * 2), radius: rand(.23, .47), speed: rand(.05, .16), size: rand(1.2, 3.2), phase: rand(0, 7) }));

  const resize = () => {
    const rect = visual.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const line = (x1, y1, x2, y2, color, width = 1) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  const draw = (now = 0) => {
    if (!visible || !w || !h) { raf = 0; return; }
    const t = reduceMotion ? 0 : now * .001;
    ctx.clearRect(0, 0, w, h);
    pointer.x += (pointer.tx - pointer.x) * .055; pointer.y += (pointer.ty - pointer.y) * .055;
    const cx = w * (.5 + (pointer.active && finePointer ? (pointer.x - .5) * .055 : 0));
    const cy = h * (.49 + (pointer.active && finePointer ? (pointer.y - .5) * .045 : 0));
    const unit = Math.min(w, h);

    // Precision reticle and measured orbital geometry.
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .035);
    [ .25, .31, .365, .425, .48 ].forEach((ratio, i) => {
      ctx.beginPath(); ctx.ellipse(0, 0, unit * ratio, unit * ratio * (.73 + i * .045), (i - 1) * .27 + t * (i % 2 ? -.025 : .018), 0, Math.PI * 2);
      ctx.strokeStyle = i === 2 ? 'rgba(184,255,101,.52)' : (i % 2 ? 'rgba(117,231,255,.3)' : 'rgba(117,231,255,.19)'); ctx.lineWidth = i === 2 ? 1.25 : .85; ctx.setLineDash(i === 2 ? [2, 9] : []); ctx.stroke();
    });
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + t * .09, r1 = unit * .31, r2 = r1 + (i % 2 ? 7 : 14);
      line(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, 'rgba(184,255,101,.8)', 1);
    }
    ctx.restore();

    // Soft, sweeping scan plane with tiny luminous readout ticks.
    const scanY = ((t * 24) % (h + 90)) - 45;
    const scan = ctx.createLinearGradient(0, scanY - 25, 0, scanY + 25);
    scan.addColorStop(0, 'rgba(117,231,255,0)'); scan.addColorStop(.5, 'rgba(117,231,255,.17)'); scan.addColorStop(1, 'rgba(117,231,255,0)');
    ctx.fillStyle = scan; ctx.fillRect(0, scanY - 25, w, 50);
    line(w * .07, scanY, w * .12, scanY, 'rgba(117,231,255,.55)', .8);
    line(w * .88, scanY, w * .93, scanY, 'rgba(184,255,101,.8)', 1);

    // Ambient particles, proximity links and subtle vector trails.
    const coords = [];
    motes.forEach((p, i) => {
      if (!reduceMotion) { p.y -= p.speed * 14; p.x += Math.sin(t * .34 + p.phase) * .00012; if (p.y < -.025) { p.y = 1.025; p.x = Math.random(); } if (p.x < -.02) p.x = 1.02; if (p.x > 1.02) p.x = -.02; }
      const x = p.x * w, y = p.y * h; coords.push([x, y, p]);
      const pulse = .7 + Math.sin(t * 1.4 + p.phase) * .3;
      ctx.beginPath(); ctx.arc(x, y, p.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 190 ? `rgba(117,231,255,${p.alpha})` : `rgba(184,255,101,${p.alpha * .8})`; ctx.fill();
      if (i % 3 === 0) { line(x - 3, y, x + 3, y, `rgba(117,231,255,${p.alpha * .5})`, .55); }
    });
    for (let i = 0; i < coords.length; i++) for (let j = i + 1; j < Math.min(i + 12, coords.length); j++) {
      const a = coords[i], b = coords[j], dx = a[0] - b[0], dy = a[1] - b[1], dist = Math.hypot(dx, dy);
      if (dist < unit * .105) line(a[0], a[1], b[0], b[1], `rgba(117,231,255,${(1 - dist / (unit * .105)) * .105})`, .55);
    }

    // High-contrast energy core: a visible signature element, not just ambient particles.
    const coreR = unit * (.105 + Math.sin(t * 1.1) * .004);
    const glow = ctx.createRadialGradient(cx, cy, coreR * .08, cx, cy, coreR * 2.5);
    glow.addColorStop(0, 'rgba(184,255,101,.14)'); glow.addColorStop(.45, 'rgba(117,231,255,.055)'); glow.addColorStop(1, 'rgba(117,231,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * -.12);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = Math.cos(a) * coreR, y = Math.sin(a) * coreR * .82; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.strokeStyle = 'rgba(184,255,101,.72)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, coreR * .56, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(117,231,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r1 = coreR * 1.08, r2 = coreR * (i % 3 === 0 ? 1.55 : 1.28); line(Math.cos(a)*r1, Math.sin(a)*r1, Math.cos(a)*r2, Math.sin(a)*r2, i % 3 === 0 ? 'rgba(184,255,101,.72)' : 'rgba(117,231,255,.46)', .8); }
    ctx.restore();

    // Orbiting diamond markers and short data trails.
    sparks.forEach((p, i) => {
      const a = p.angle + t * p.speed * (i % 2 ? -1 : 1);
      const x = cx + Math.cos(a) * unit * p.radius, y = cy + Math.sin(a) * unit * p.radius * .73;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 4);
      ctx.strokeStyle = i % 3 ? 'rgba(184,255,101,.72)' : 'rgba(117,231,255,.8)'; ctx.lineWidth = .8;
      ctx.strokeRect(-p.size, -p.size, p.size * 2, p.size * 2);
      line(-p.size * 5, 0, -p.size * 1.8, 0, 'rgba(117,231,255,.35)', .7);
      ctx.restore();
    });

    // Small framing marks keep the scene editorial, not like a generic dashboard.
    const pad = 24, len = 22;
    ctx.strokeStyle = 'rgba(184,255,101,.45)'; ctx.lineWidth = .8;
    [[pad,pad,1,1],[w-pad,pad,-1,1],[pad,h-pad,1,-1],[w-pad,h-pad,-1,-1]].forEach(([x,y,sx,sy]) => {
      line(x,y,x+sx*len,y,'rgba(184,255,101,.48)',.8); line(x,y,x,y+sy*len,'rgba(184,255,101,.48)',.8);
    });
    if (!reduceMotion) raf = requestAnimationFrame(draw);
  };

  visual.addEventListener('pointermove', e => { const r = visual.getBoundingClientRect(); pointer.tx = (e.clientX - r.left) / r.width; pointer.ty = (e.clientY - r.top) / r.height; pointer.active = true; }, { passive: true });
  visual.addEventListener('pointerleave', () => { pointer.tx = .5; pointer.ty = .5; pointer.active = false; }, { passive: true });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(visual); resize();
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible && !raf && !reduceMotion) raf = requestAnimationFrame(draw);
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 }); visibilityObserver.observe(hero);
  if (reduceMotion) draw(0); else raf = requestAnimationFrame(draw);
})();
