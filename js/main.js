import * as THREE from "three";
import { db } from "./firebase.js";
import { getLocalProjectCoverUrl } from "./local-project-covers.js";
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initPreloader() {
  document.body.classList.add("loading");
  const loader = $("#preloader");
  const finish = () => { loader?.classList.add("done"); document.body.classList.remove("loading"); };
  window.addEventListener("load", () => setTimeout(finish, 700), { once: true });
  setTimeout(finish, 1500);
}
function initNavigation() {
  const toggle = $("#menuToggle"), nav = $(".main-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$(".main-nav a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open"); toggle?.setAttribute("aria-expanded", "false");
  }));
  $("#year").textContent = new Date().getFullYear();
}
function initScene() {
  const canvas = $("#heroCanvas");
  if (!canvas) return;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);
    scene.add(new THREE.AmbientLight(0x8096b5, 1.4));
    const key = new THREE.PointLight(0xb8ff65, 18, 20); key.position.set(3, 2, 4); scene.add(key);
    const blue = new THREE.PointLight(0x75e7ff, 12, 15); blue.position.set(-3, -2, 3); scene.add(blue);
    const group = new THREE.Group(); scene.add(group);
    const geometry = new THREE.IcosahedronGeometry(1.45, 4);
    const material = new THREE.MeshStandardMaterial({ color: 0x172b2b, metalness: .82, roughness: .25, emissive: 0x142d24, emissiveIntensity: .55, flatShading: false });
    const core = new THREE.Mesh(geometry, material); group.add(core);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.58, 2), new THREE.MeshBasicMaterial({ color: 0xb8ff65, wireframe: true, transparent: true, opacity: .22 }));
    group.add(wire);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x75e7ff, transparent: true, opacity: .7 });
    const orbitRings = [];
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.92 + i * .19, i === 2 ? .012 : .006, 8, 192),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x75e7ff : 0xb8ff65, transparent: true, opacity: i === 2 ? .58 : .28 })
      );
      ring.rotation.set(.55 + i * .43, .22 + i * .37, .15 + i * .21);
      ring.userData.orbitSpeed = (i % 2 ? -1 : 1) * (.035 + i * .012);
      group.add(ring); orbitRings.push(ring);
    }
    // Second sculptural layer: a luminous torus knot moving around the central core.
    const knotMaterial = new THREE.MeshPhysicalMaterial({ color: 0x75e7ff, metalness: .72, roughness: .2, clearcoat: 1, clearcoatRoughness: .12, emissive: 0x063d4a, emissiveIntensity: .65, transparent: true, opacity: .82 });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(.62, .014, 220, 12, 2, 5), knotMaterial);
    knot.scale.set(1.22, 1.22, 1.22); knot.rotation.set(.8, .2, -.3); group.add(knot);
    // Crystalline satellites on individual orbital paths.
    const satellites = [];
    for (let i = 0; i < 9; i++) {
      const geo = i % 3 === 0 ? new THREE.OctahedronGeometry(.075 + (i % 2) * .035, 1) : new THREE.TetrahedronGeometry(.065 + (i % 4) * .012, 0);
      const mat = new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb8ff65 : 0x75e7ff, metalness: .68, roughness: .22, emissive: i % 2 ? 0x263f0b : 0x082b38, emissiveIntensity: .8, wireframe: i % 3 === 1 });
      const shard = new THREE.Mesh(geo, mat);
      shard.userData = { phase: i * Math.PI * 2 / 9, radius: 1.95 + (i % 3) * .34, speed: .12 + (i % 4) * .025, vertical: .38 + (i % 3) * .16 };
      group.add(shard); satellites.push(shard);
    }
    // Instanced micro-geometry adds depth without creating hundreds of draw calls.
    const moteCount = 170;
    const moteGeometry = new THREE.IcosahedronGeometry(.018, 0);
    const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xa8f7c4, transparent: true, opacity: .72 });
    const motes = new THREE.InstancedMesh(moteGeometry, moteMaterial, moteCount);
    const moteData = Array.from({ length: moteCount }, () => ({
      phase: Math.random() * Math.PI * 2, radius: 2.15 + Math.random() * 2.1,
      speed: .025 + Math.random() * .11, height: (Math.random() - .5) * 3.6, size: .45 + Math.random() * 1.4
    }));
    const moteDummy = new THREE.Object3D(); group.add(motes);
    // API circoscritta per il configuratore: conserva la scena anche se il modulo
    // del pannello viene eseguito dopo l'evento iniziale.
    const studio3DSceneApi = {
      THREE, core, wire, ringMat, keyLight: key, blueLight: blue, group,
      setCoreGeometry(detail, deform) {
        const next = new THREE.IcosahedronGeometry(1.45, detail);
        const pos = next.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          const len = Math.hypot(x, y, z) || 1;
          const wave = Math.sin(x * 5.1 + y * 3.7) * Math.cos(z * 4.4 + x * 2.2);
          const factor = 1 + wave * deform;
          pos.setXYZ(i, x * factor, y * factor, z * factor);
        }
        next.computeVertexNormals();
        core.geometry.dispose(); core.geometry = next;
      },
      setWireGeometry(detail) {
        const next = new THREE.IcosahedronGeometry(1.58, detail);
        wire.geometry.dispose(); wire.geometry = next;
      },
      resetAppearance() {
        const coreGeometry = new THREE.IcosahedronGeometry(1.45, 4);
        core.geometry.dispose(); core.geometry = coreGeometry;
        const wireGeometry = new THREE.IcosahedronGeometry(1.58, 2);
        wire.geometry.dispose(); wire.geometry = wireGeometry;
        core.material.color.set(0x172b2b);
        core.material.emissive.set(0x142d24);
        core.material.emissiveIntensity = 0.55;
        wire.material.color.set(0xb8ff65);
        ringMat.color.set(0x75e7ff);
        key.color.set(0xb8ff65); key.intensity = 18;
        blue.color.set(0x75e7ff); blue.intensity = 12;
      }
    };
    window.studio3DSceneApi = studio3DSceneApi;
    window.dispatchEvent(new CustomEvent("studio:3d-ready", { detail: studio3DSceneApi }));
    const points = new THREE.BufferGeometry();
    const positions = new Float32Array(450 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - .5) * 9; positions[i + 1] = (Math.random() - .5) * 9; positions[i + 2] = (Math.random() - .5) * 5 - 1;
    }
    points.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(points, new THREE.PointsMaterial({ color: 0x9db3c6, size: .018, transparent: true, opacity: .65 })));
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
    canvas.addEventListener("pointermove", e => { const r = canvas.getBoundingClientRect(); targetX = ((e.clientX-r.left)/r.width-.5)*.55; targetY = ((e.clientY-r.top)/r.height-.5)*.4; }, { passive: true });
    canvas.addEventListener("pointerleave", () => { targetX = 0; targetY = 0; }, { passive: true });
    let scrollFactor = 0;
    const updateScrollFactor = () => { const rect = canvas.getBoundingClientRect(); scrollFactor = Math.max(-1, Math.min(1, (innerHeight * .5 - (rect.top + rect.height * .5)) / Math.max(innerHeight, 1))); };
    window.addEventListener("scroll", updateScrollFactor, { passive: true }); updateScrollFactor();
    const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const clock = new THREE.Clock();
    const animateScene = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        pointerX += (targetX - pointerX) * .045; pointerY += (targetY - pointerY) * .045;
        group.rotation.y = t * .105 + pointerX + scrollFactor * .13;
        group.rotation.x = Math.sin(t * .19) * .11 + pointerY + scrollFactor * .08;
        core.rotation.x = Math.sin(t * .23) * .08; core.rotation.z = Math.cos(t * .17) * .055;
        wire.rotation.y = -t * .12; wire.rotation.z = t * .045;
        knot.rotation.x = .8 + Math.sin(t * .17) * .25; knot.rotation.y = t * .16; knot.rotation.z = -.3 + Math.cos(t * .13) * .2;
        orbitRings.forEach(ring => { ring.rotation.z += ring.userData.orbitSpeed * .016; });
        satellites.forEach(shard => {
          const d = shard.userData, a = t * d.speed + d.phase;
          shard.position.set(Math.cos(a) * d.radius, Math.sin(a * .83) * d.vertical, Math.sin(a) * d.radius * .62);
          shard.rotation.x = a * .8; shard.rotation.y = a * 1.15;
        });
        moteData.forEach((d, i) => {
          const a = d.phase + t * d.speed;
          moteDummy.position.set(Math.cos(a) * d.radius, d.height + Math.sin(a * 1.7) * .16, Math.sin(a) * d.radius * .62);
          const size = .45 + (Math.sin(t * 1.4 + d.phase) + 1) * .18;
          moteDummy.scale.setScalar(size * d.size); moteDummy.rotation.set(a, a * .7, 0); moteDummy.updateMatrix(); motes.setMatrixAt(i, moteDummy.matrix);
        });
        motes.instanceMatrix.needsUpdate = true;
        key.position.x = 3 + Math.sin(t * .28) * .45; blue.position.y = -2 + Math.cos(t * .24) * .35;
      }
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(() => { if (!document.hidden) animateScene(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) animateScene(); });
    const reducedMotionHandler = event => { if (event.matches) { group.rotation.set(0, 0, 0); knot.rotation.set(.8, .2, -.3); } };
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", reducedMotionHandler);
  } catch (err) {
    console.warn("Scena 3D non disponibile: il layout rimane utilizzabile.", err);
    canvas.style.display = "none";
  }
}
function initContactTabs() {
  const hiddenType = $('#contactForm [name="requestType"]');
  const dateField = $("#dateField");
  $$(".form-tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".form-tab").forEach(t => { const active = t === tab; t.classList.toggle("active", active); t.setAttribute("aria-selected", String(active)); });
    hiddenType.value = tab.dataset.formTab;
    dateField.hidden = hiddenType.value !== "appointment";
    const dateInput = dateField.querySelector("input");
    dateInput.required = hiddenType.value === "appointment";
  }));
  $$(".service-link").forEach(link => link.addEventListener("click", () => {
    const service = link.dataset.service;
    const select = $("#projectType");
    const option = [...select.options].find(o => o.text.toLowerCase().includes(service.split(" ")[0].toLowerCase()));
    if (option) select.value = option.value;
  }));
}
function feedback(message, error = false) {
  const node = $("#formFeedback"); node.textContent = message; node.classList.toggle("error", error);
}
async function submitRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const payload = {
    requestType: String(data.get("requestType") || "contact"),
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    message: String(data.get("message") || "").trim(),
    privacyConsent: data.get("privacyConsent") === "on",
    source: "public-website",
    status: "new",
    createdAt: serverTimestamp(),
    company: String(data.get("company") || "").trim(),
    projectType: String(data.get("projectType") || ""),
    requestedDate: String(data.get("requestedDate") || "")
  };
  if (payload.requestType !== "appointment") delete payload.requestedDate;
  button.disabled = true; button.style.opacity = ".6"; feedback("Invio della richiesta…");
  try {
    await addDoc(collection(db, "requests"), payload);
    form.reset(); $('#contactForm [name="requestType"]').value = "quote";
    $$(".form-tab").forEach(t => { const active = t.dataset.formTab === "quote"; t.classList.toggle("active", active); t.setAttribute("aria-selected", String(active)); });
    $("#dateField").hidden = true; $("#dateField input").required = false;
    feedback("Richiesta inviata. Grazie, ti ricontatterò appena possibile.");
  } catch (err) {
    console.error(err);
    feedback("Invio non riuscito. Controlla la configurazione Firebase e le regole Firestore, poi riprova.", true);
  } finally { button.disabled = false; button.style.opacity = ""; }
}
function applySavedContentOverrides(overrides = {}) {
  if (!overrides || typeof overrides !== "object") return;
  for (const [selector, value] of Object.entries(overrides)) {
    if (typeof value !== "string") continue;
    try {
      const node = document.querySelector(selector);
      if (node && node.matches(".hero-title-custom, .hero-title-custom *, .cms-project-title-pending, .cms-project-title-pending *, [data-site-stat]")) continue;
      if (node && !node.matches("script,style,svg,canvas,input,textarea,select,button")) node.textContent = value;
    } catch (error) {
      console.info("Override CMS ignorato: selettore non valido o obsoleto.", selector);
    }
  }
}

function renderHeroTitle(settings = {}) {
  const defaults = { heroTitleLine1: "Non seguo gli standard.", heroTitleLine2: "Li ridefinisco.", heroTitleColor1: "#f3f4f6", heroTitleColor2: "#b8ff65" };
  const values = {};
  for (const key of Object.keys(defaults)) values[key] = typeof settings[key] === "string" && settings[key].trim() ? settings[key].trim() : defaults[key];
  const first = document.querySelector('[data-hero-title="line1"]');
  const second = document.querySelector('[data-hero-title="line2"]');
  if (first) { first.textContent = values.heroTitleLine1; first.style.color = /^#[0-9a-fA-F]{6}$/.test(values.heroTitleColor1) ? values.heroTitleColor1 : defaults.heroTitleColor1; }
  if (second) { second.textContent = values.heroTitleLine2; second.style.color = /^#[0-9a-fA-F]{6}$/.test(values.heroTitleColor2) ? values.heroTitleColor2 : defaults.heroTitleColor2; }
  const heading = document.querySelector(".hero-title-custom");
  if (heading) heading.setAttribute("aria-label", `${values.heroTitleLine1} ${values.heroTitleLine2}`.trim());
}

function revealHeroTitle() {
  $(".hero h1.cms-title-pending")?.classList.remove("cms-title-pending");
}

function renderProjectsTitle(settings = {}) {
  // Il titolo della sezione Progetti proviene esclusivamente dal CMS: nessun testo di fallback statico.
  const line1 = typeof settings.projectsTitleLine1 === "string" ? settings.projectsTitleLine1.trim() : "";
  const line2 = typeof settings.projectsTitleLine2 === "string" ? settings.projectsTitleLine2.trim() : "";
  const first = document.querySelector('[data-project-title="line1"]');
  const second = document.querySelector('[data-project-title="line2"]');
  const heading = document.querySelector(".cms-project-title-pending, #work .section-heading-row h2");
  if (first) first.textContent = line1;
  if (second) second.textContent = line2;
  if (heading) {
    if (line1 || line2) {
      heading.setAttribute("aria-label", [line1, line2].filter(Boolean).join(" "));
      heading.classList.remove("cms-project-title-pending");
    } else {
      heading.removeAttribute("aria-label");
      heading.classList.add("cms-project-title-pending");
    }
  }
}

function renderHomeStats(settings = {}) {
  // Il markup HTML contiene slot vuoti: il testo viene renderizzato una sola volta da JavaScript.
  const defaults = { experienceValue: "15+", experienceLabel: "ANNI DI ESPERIENZA", workValue: "200+", workLabel: "LAVORI CONCLUSI", trustNote: "Oltre 200 lavori portati a termine in totale autonomia, con attenzione alla qualità, alla cura dei dettagli e al risultato finale." };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = typeof settings[key] === "string" && settings[key].trim() ? settings[key].trim() : fallback;
    const selector = key === "trustNote" ? "note" : key;
    document.querySelectorAll(`[data-site-stat="${selector}"]`).forEach(el => {
      if (key === "experienceValue" || key === "workValue") {
        el.replaceChildren();
        const match = value.match(/^(.*?)(\+)?$/);
        el.append(document.createTextNode(match?.[1] || value));
        if (match?.[2]) { const plus = document.createElement("span"); plus.textContent = "+"; el.append(plus); }
      } else el.textContent = value;
    });
  }
}

async function loadPublicContent() {
  const heroLead = document.querySelector(".hero-lead[data-setting=\"heroSubtitle\"]");
  if (heroLead) heroLead.textContent = "Progetto e sviluppo esperienze web su misura che uniscono identità, interazione e solidità tecnica. Dal primo concept al rilascio, trasformo ciò che vuoi comunicare in un’esperienza digitale chiara, riconoscibile e costruita per raggiungere un obiettivo.";
  renderHomeStats();
  renderHeroTitle();
  renderProjectsTitle();
  try {
    const settingsSnap = await getDoc(doc(db, "site", "settings"));
    if (settingsSnap.exists()) {
      const settings = settingsSnap.data();
      renderHeroTitle(settings);
      renderHomeStats(settings);
      renderProjectsTitle(settings);
      // Applica subito gli override statici: non dipendono dal caricamento di progetti/servizi.
      applySavedContentOverrides(settings.contentOverrides || {});
      if (typeof settings.logoSymbol === "string" && settings.logoSymbol.trim()) {
        document.querySelectorAll(".brand-symbol").forEach(el => { el.textContent = settings.logoSymbol.trim(); });
      }
      if (settings.accentColor) document.documentElement.style.setProperty("--accent", settings.accentColor);
      if (settings.cyanColor) document.documentElement.style.setProperty("--cyan", settings.cyanColor);
      if (settings.backgroundColor) document.documentElement.style.setProperty("--bg", settings.backgroundColor);
      if (["default","crosshair","pointer"].includes(settings.cursorStyle)) document.documentElement.style.cursor = settings.cursorStyle;
      if (settings.contactTitle) { const title = document.querySelector(".contact-grid h2"); if (title) title.textContent = settings.contactTitle; }
      if (settings.contactIntro) { const intro = document.querySelector(".contact-intro"); if (intro) intro.textContent = settings.contactIntro; }
      if (settings.announcement) { let banner=document.getElementById("siteAnnouncement"); if(!banner){banner=document.createElement("aside");banner.id="siteAnnouncement";banner.className="site-announcement";banner.setAttribute("role","status");document.body.prepend(banner);} banner.textContent=settings.announcement; }
      else document.getElementById("siteAnnouncement")?.remove();
      if (settings.customElementText) { let custom=document.getElementById("siteCustomElement"); if(!custom){custom=document.createElement("section");custom.id="siteCustomElement";custom.className="site-custom-element section-shell";document.querySelector("main")?.append(custom);} custom.textContent=settings.customElementText; }
      else document.getElementById("siteCustomElement")?.remove();
      $$ ("[data-setting]").forEach(el => {
        const key = el.dataset.setting; if (typeof settings[key] !== "string" || !settings[key]) return;
        if (el.tagName === "A" && key === "contactEmail") { el.href = `mailto:${settings[key]}`; el.textContent = `${settings[key]} ↗`; }
        else if (key === "brandName") el.textContent = settings[key];
        else el.textContent = settings[key];
      });
    }
    // Mostra il titolo soltanto dopo aver applicato il valore CMS (o il fallback se il documento non esiste).
    revealHeroTitle();
    const [projectsSnap, servicesSnap] = await Promise.all([
      // Non usare orderBy: i documenti legacy senza "order" verrebbero esclusi da Firestore.
      getDocs(query(collection(db, "projects"), where("visible", "==", true), limit(100))),
      getDocs(query(collection(db, "services"), where("visible", "==", true), limit(100)))
    ]);
    const sortByOrder = snap => snap.docs
      .map(s => ({ id: s.id, data: s.data() }))
      .sort((a, b) => (Number(a.data.order) || 0) - (Number(b.data.order) || 0)
        || String(a.data.title || "").localeCompare(String(b.data.title || ""), "it"));
    const publicProjects = sortByOrder(projectsSnap).slice(0, 8);
    const publicServices = sortByOrder(servicesSnap).slice(0, 8);
    {
      const grid = $("#projectsGrid");
      grid.replaceChildren();
      grid.classList.remove("projects-loading");
      grid.setAttribute("aria-busy", "false");
      if (!publicProjects.length) {
        const empty = document.createElement("p");
        empty.className = "projects-empty-state";
        empty.textContent = "I progetti saranno disponibili qui a breve.";
        grid.append(empty);
      }
      publicProjects.forEach(({ data: p }) => {
        const card = document.createElement("article"); card.className = "work-card project-card-redesign";
        card.dataset.projectCard = "true";
        const art = document.createElement("div"); art.className = "work-art project-cover";
        if (p.imageUrl) { const img = document.createElement("img"); img.alt = p.title ? `Copertina: ${p.title}` : "Copertina progetto"; img.loading = "lazy"; img.style.cssText = "width:100%;height:100%;object-fit:cover"; art.append(img); getLocalProjectCoverUrl(p.imageUrl).then(url=>{img.src=url;}).catch(error=>{console.warn("Copertina progetto non disponibile:",error.message);if(!String(p.imageUrl).startsWith("local-cover:"))img.src=p.imageUrl;else{img.remove();art.classList.add("project-cover-empty");const mark=document.createElement("i");mark.className=p.icon||"fa-solid fa-code";mark.setAttribute("aria-hidden","true");art.prepend(mark);}}); }
        else { art.classList.add("project-cover-empty"); const mark = document.createElement("i"); mark.className = p.icon || "fa-solid fa-code"; mark.setAttribute("aria-hidden","true"); art.append(mark); }
        const artMeta = document.createElement("div"); artMeta.className = "project-cover-meta"; const number = document.createElement("span"); number.textContent = `PROGETTO ${String(p.order || 1).padStart(2,"0")}`; artMeta.append(number);
        if(p.badge){const badge=document.createElement("span");badge.className="project-badge";badge.textContent=p.badge;artMeta.append(badge);} art.append(artMeta);
        const coverHud = document.createElement("div"); coverHud.className = "project-cover-hud"; coverHud.setAttribute("aria-hidden", "true");
        const hudCross = document.createElement("span"); hudCross.className = "project-hud-cross";
        const hudLabel = document.createElement("span"); hudLabel.className = "project-hud-label"; hudLabel.textContent = "STUDIO / SELECTED WORK";
        const hudOrbit = document.createElement("span"); hudOrbit.className = "project-hud-orbit"; hudOrbit.innerHTML = '<span></span><span></span><span></span>';
        coverHud.append(hudCross, hudLabel, hudOrbit); art.append(coverHud);
        const info = document.createElement("div"); info.className = "work-info";
        const label = document.createElement("span"); label.className="project-kicker"; const icon=document.createElement("i");icon.className=p.icon||"fa-solid fa-arrow-up-right-from-square";icon.setAttribute("aria-hidden","true");label.append(icon,document.createTextNode("  "+(p.badge||"CASE STUDY")));
        const title = document.createElement("h3"); title.textContent = p.title || "";
        const desc = document.createElement("p"); desc.textContent = p.description || "";
        const tags = document.createElement("div"); tags.className = "work-tech-list project-tags"; tags.setAttribute("aria-label", "Categorie e tecnologie");
        const technologies = String(p.category || "").split(/[,|·]+/).map(value => value.trim()).filter(Boolean).slice(0, 8);
        technologies.forEach(technology => { const tag = document.createElement("span"); tag.className = "work-type"; tag.textContent = technology; tags.append(tag); });
        const footer = document.createElement("div"); footer.className = "project-card-footer";
        const footerMeta = document.createElement("span"); footerMeta.className = "project-footer-meta";
        const footerIcon = document.createElement("i"); footerIcon.className = "fa-solid fa-layer-group"; footerIcon.setAttribute("aria-hidden", "true");
        footerMeta.append(footerIcon, document.createTextNode("  DIGITAL EXPERIENCE"));
        const footerSignal = document.createElement("span"); footerSignal.className = "project-footer-signal"; footerSignal.innerHTML = '<span></span> SYSTEM ONLINE';
        footer.append(footerMeta, footerSignal);
        info.append(label,title,desc,tags,footer); card.append(art,info); grid.append(card);
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          card.addEventListener("pointermove", event => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            card.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
            card.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
            card.style.setProperty("--tilt-x", `${((.5 - y) * 3.2).toFixed(2)}deg`);
            card.style.setProperty("--tilt-y", `${((x - .5) * 4).toFixed(2)}deg`);
          });
          card.addEventListener("pointerleave", () => {
            card.style.setProperty("--tilt-x", "0deg"); card.style.setProperty("--tilt-y", "0deg");
          });
        }
      });
    }
    if (publicServices.length) {
      const grid = $("#servicesGrid"); grid.innerHTML = "";
      publicServices.forEach(({ data: d }) => {
        const card = document.createElement("article"); card.className = "service-card";
        const label = document.createElement("span"); label.textContent = `${String(d.order || 1).padStart(2,"0")} / ${d.kicker || "SERVIZIO"}`;
        const title = document.createElement("h3"); title.textContent = d.title || "Servizio";
        const desc = document.createElement("p"); desc.textContent = d.description || "";
        const price = document.createElement("div"); price.className = "service-price"; price.textContent = d.price || "Su preventivo";
        const meta = document.createElement("small"); meta.textContent = d.tags || "SU MISURA";
        const link = document.createElement("a"); link.className = "service-link"; link.href = "#contact"; link.textContent = "Parliamone ↗"; link.addEventListener("click", () => { const input = $("#projectType"); if (input) input.value = d.title || "Altro"; });
        card.append(label,title,desc,price,meta,link); grid.append(card);
      });
    }
    // Riapplica gli override dopo il rendering dinamico di progetti e servizi.
    if (settingsSnap.exists()) applySavedContentOverrides(settingsSnap.data().contentOverrides || {});

    // Mantiene il sito pubblico sincronizzato in tempo reale con il CMS.
    // In questo modo le modifiche salvate diventano visibili senza dover ricostruire o riaprire la pagina.
    onSnapshot(doc(db, "site", "settings"), snapshot => {
      if (!snapshot.exists()) return;
      const settings = snapshot.data();
      renderHeroTitle(settings);
      renderHomeStats(settings);
      renderProjectsTitle(settings);
      applySavedContentOverrides(settings.contentOverrides || {});
      if (typeof settings.logoSymbol === "string" && settings.logoSymbol.trim()) {
        document.querySelectorAll(".brand-symbol").forEach(el => { el.textContent = settings.logoSymbol.trim(); });
      }
      if (settings.accentColor) document.documentElement.style.setProperty("--accent", settings.accentColor);
      if (settings.cyanColor) document.documentElement.style.setProperty("--cyan", settings.cyanColor);
      if (settings.backgroundColor) document.documentElement.style.setProperty("--bg", settings.backgroundColor);
      if (["default", "crosshair", "pointer"].includes(settings.cursorStyle)) document.documentElement.style.cursor = settings.cursorStyle;
      if (typeof settings.contactTitle === "string" && settings.contactTitle.trim()) {
        const title = document.querySelector(".contact-grid h2");
        if (title) title.textContent = settings.contactTitle;
      }
      if (typeof settings.contactIntro === "string" && settings.contactIntro.trim()) {
        const intro = document.querySelector(".contact-intro");
        if (intro) intro.textContent = settings.contactIntro;
      }
      if (settings.announcement) {
        let banner = document.getElementById("siteAnnouncement");
        if (!banner) { banner = document.createElement("aside"); banner.id = "siteAnnouncement"; banner.className = "site-announcement"; banner.setAttribute("role", "status"); document.body.prepend(banner); }
        banner.textContent = settings.announcement;
      } else document.getElementById("siteAnnouncement")?.remove();
      if (settings.customElementText) {
        let custom = document.getElementById("siteCustomElement");
        if (!custom) { custom = document.createElement("section"); custom.id = "siteCustomElement"; custom.className = "site-custom-element section-shell"; document.querySelector("main")?.append(custom); }
        custom.textContent = settings.customElementText;
      } else document.getElementById("siteCustomElement")?.remove();
      document.querySelectorAll("[data-setting]").forEach(el => {
        const key = el.dataset.setting;
        if (typeof settings[key] !== "string" || !settings[key]) return;
        if (el.tagName === "A" && key === "contactEmail") { el.href = `mailto:${settings[key]}`; el.textContent = `${settings[key]} ↗`; }
        else el.textContent = settings[key];
      });
    }, error => console.warn("Sincronizzazione CMS in tempo reale non disponibile:", error?.code || error));
  } catch (err) {
    revealHeroTitle();
    renderProjectsTitle();
    const grid = document.querySelector("#projectsGrid");
    if (grid) { grid.replaceChildren(); grid.classList.remove("projects-loading"); grid.setAttribute("aria-busy", "false"); const message=document.createElement("p"); message.className="projects-empty-state"; message.textContent="Progetti temporaneamente non disponibili."; grid.append(message); }
    console.warn("Contenuti Firebase non caricati; nessun progetto statico viene mostrato.", err?.code || err);
  }
}
initPreloader(); initNavigation(); initScene(); initContactTabs();
$("#contactForm")?.addEventListener("submit", submitRequest);
loadPublicContent();
