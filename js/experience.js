const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

function initScrollSignal() {
  const bar = document.createElement("div");
  bar.className = "scroll-signal";
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);
  let scheduled = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    scheduled = false;
  };
  window.addEventListener("scroll", () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}
function initReveal() {
  const targets = document.querySelectorAll(".section-index, .section-heading-row, .about-grid, .stack-card, .work-card, .process-list article, .service-card, .contact-grid > *");
  if (reduceMotion || !("IntersectionObserver" in window)) { targets.forEach(el => el.classList.add("reveal-visible")); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("reveal-visible"); observer.unobserve(entry.target); }
  }), { threshold: .12, rootMargin: "0px 0px -36px 0px" });
  const prepare = (el, index=0) => { if (el.classList.contains("reveal-ready") || el.classList.contains("reveal-visible")) return; el.classList.add("reveal-ready"); el.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 65}ms`); observer.observe(el); };
  targets.forEach((el, index) => prepare(el, index));
  // Firestore may replace demo cards after the first paint: animate those too.
  const mutationObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    if (node.matches?.(".work-card, .service-card, .stack-card")) prepare(node);
    node.querySelectorAll?.(".work-card, .service-card, .stack-card").forEach((el, index) => prepare(el, index));
  })));
  [document.querySelector("#projectsGrid"), document.querySelector("#servicesGrid")].filter(Boolean).forEach(grid => mutationObserver.observe(grid, {childList:true}));
}
function initPointerField() {
  if (!finePointer || reduceMotion) return;
  document.documentElement.classList.add("has-pointer-field");
  let x = innerWidth * .5, y = innerHeight * .25, raf = 0;
  window.addEventListener("pointermove", e => {
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(() => { document.documentElement.style.setProperty("--pointer-x", `${x}px`); document.documentElement.style.setProperty("--pointer-y", `${y}px`); raf = 0; });
  }, { passive: true });
}
function initTilt() {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll(".work-card, .service-card, .stack-card").forEach(card => {
    card.classList.add("tilt-card");
    card.addEventListener("pointermove", event => {
      const r = card.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width;
      const py = (event.clientY - r.top) / r.height;
      card.style.setProperty("--tilt-x", `${(0.5 - py) * 4}deg`);
      card.style.setProperty("--tilt-y", `${(px - 0.5) * 5}deg`);
      card.style.setProperty("--shine-x", `${px * 100}%`);
      card.style.setProperty("--shine-y", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--tilt-x", "0deg"); card.style.setProperty("--tilt-y", "0deg"); });
  });
}
function initMagneticButtons() {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll(".button-primary, .header-cta, .chat-send").forEach(button => {
    button.addEventListener("pointermove", event => {
      const r = button.getBoundingClientRect();
      button.style.setProperty("--mag-x", `${(event.clientX - r.left - r.width / 2) * .07}px`);
      button.style.setProperty("--mag-y", `${(event.clientY - r.top - r.height / 2) * .12}px`);
    });
    button.addEventListener("pointerleave", () => { button.style.setProperty("--mag-x", "0px"); button.style.setProperty("--mag-y", "0px"); });
  });
}
function initAmbientCanvas() {
  const hero = document.querySelector(".hero");
  if (!hero || reduceMotion || !window.matchMedia("(min-width: 701px)").matches) return;
  const canvas = document.createElement("canvas"); canvas.className = "ambient-particles"; canvas.setAttribute("aria-hidden", "true"); hero.prepend(canvas);
  const ctx = canvas.getContext("2d", { alpha: true }); if (!ctx) { canvas.remove(); return; }
  let w=0,h=0,raf=0; const particles=Array.from({length:54},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.25,v:Math.random()*.00022+.00006,a:Math.random()*.48+.12}));
  const resize=()=>{const d=Math.min(devicePixelRatio||1,1.5);w=hero.clientWidth;h=hero.clientHeight;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;ctx.setTransform(d,0,0,d,0,0);};
  const draw=()=>{ctx.clearRect(0,0,w,h);particles.forEach((p,i)=>{p.y-=p.v*16;if(p.y<-.02){p.y=1.02;p.x=Math.random();}const x=p.x*w,y=p.y*h;ctx.beginPath();ctx.fillStyle=`rgba(117,231,255,${p.a})`;ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();for(let j=i+1;j<particles.length;j++){const q=particles[j],dx=(p.x-q.x)*w,dy=(p.y-q.y)*h,d=Math.hypot(dx,dy);if(d<92){ctx.beginPath();ctx.strokeStyle=`rgba(184,255,101,${(1-d/92)*.12})`;ctx.lineWidth=.6;ctx.moveTo(x,y);ctx.lineTo(q.x*w,q.y*h);ctx.stroke();}}});raf=requestAnimationFrame(draw);};
  const observer=new ResizeObserver(resize);observer.observe(hero);resize();draw();document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(!reduceMotion)draw();});
}
initScrollSignal(); initReveal(); initPointerField(); initTilt(); initMagneticButtons(); initAmbientCanvas();
