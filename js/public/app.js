import { readSettings, readPublicCollection, submitRequest, DEFAULT_SETTINGS } from "../firebase/data.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const safeText = (value, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;

function setText(selector, value) {
  $$(selector).forEach(el => { el.textContent = value; });
}

function applySettings(settings) {
  setText("[data-site-name]", safeText(settings.siteName, DEFAULT_SETTINGS.siteName));
  setText("[data-hero-title]", safeText(settings.heroTitle, DEFAULT_SETTINGS.heroTitle));
  setText("[data-hero-description]", safeText(settings.heroDescription, DEFAULT_SETTINGS.heroDescription));
  setText("[data-about-lead]", safeText(settings.aboutLead, DEFAULT_SETTINGS.aboutLead));
  setText("[data-experience]", safeText(settings.experience, DEFAULT_SETTINGS.experience));
  setText("[data-project-count]", safeText(settings.projectCount, DEFAULT_SETTINGS.projectCount));
  const title = safeText(settings.siteName, "Studio") + " — Creative Front-end Development";
  document.title = title;
  const meta = $('meta[name="description"]');
  if (meta) meta.content = safeText(settings.seoDescription, DEFAULT_SETTINGS.seoDescription);
}

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderProjects(items) {
  if (!items.length) return;
  const container = $("#projects-list");
  container.replaceChildren();
  items.forEach((item, index) => {
    const article = makeElement("article", "project-card" + (index === 0 ? " project-featured" : ""));
    const art = makeElement("div", "project-art " + (index % 3 === 0 ? "art-orbit" : index % 3 === 1 ? "art-terminal" : "art-flow"));
    const tag = makeElement("span", "art-tag", item.category || "PROJECT / CONCEPT");
    art.append(tag);
    if (item.imageUrl && /^https:\/\//i.test(item.imageUrl)) {
      art.style.backgroundImage = `linear-gradient(180deg, rgba(8,10,16,.05), rgba(8,10,16,.5)), url("${item.imageUrl.replace(/["\\]/g, "")}")`;
      art.style.backgroundSize = "cover";
      art.style.backgroundPosition = "center";
    } else if (index % 3 === 0) {
      art.append(makeElement("div", "art-orb"), makeElement("div", "art-grid"));
    } else if (index % 3 === 1) {
      const lines = makeElement("div", "terminal-lines");
      for (let i = 0; i < 5; i++) lines.append(makeElement("i"));
      art.append(lines, makeElement("span", "terminal-cursor", "_"));
    } else {
      ["INPUT", "FLOW", "OUTPUT"].forEach((label, i) => art.append(makeElement("span", `flow-node node-${["a","b","c"][i]}`, label)));
      art.append(makeElement("div", "flow-connector"));
    }
    const info = makeElement("div", "project-info");
    const titleWrap = makeElement("div");
    titleWrap.append(makeElement("span", "project-type", item.category || "PROJECT"), makeElement("h3", "", item.title || "Progetto"));
    info.append(titleWrap);
    const arrow = makeElement("span", "project-arrow", "↗");
    info.append(arrow, makeElement("p", "", item.description || ""));
    const tags = makeElement("div", "tag-list");
    (Array.isArray(item.technologies) ? item.technologies : String(item.technologies || "").split(",")).filter(Boolean).slice(0, 5).forEach(t => tags.append(makeElement("span", "", String(t).trim())));
    info.append(tags);
    if (item.projectUrl && /^https:\/\//i.test(item.projectUrl)) {
      const link = makeElement("a", "project-open", "Apri progetto ↗");
      link.href = item.projectUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
      info.append(link);
    }
    article.append(art, info); container.append(article);
  });
}

function renderServices(items) {
  if (!items.length) return;
  const container = $("#services-list");
  container.replaceChildren();
  items.forEach((item, index) => {
    const card = makeElement("article", "service-card");
    card.append(makeElement("span", "service-no", `${String(index + 1).padStart(2, "0")} / ${String(item.category || "SERVICE").toUpperCase()}`));
    card.append(makeElement("h3", "", item.title || "Servizio"), makeElement("p", "", item.description || ""));
    if (item.price) card.append(makeElement("span", "service-price", item.price));
    const link = makeElement("a", "service-link", "Parliamone ↗");
    link.href = "#contact"; link.dataset.service = item.title || "Richiesta informazioni";
    card.append(link); container.append(card);
  });
}

function renderSkills(items) {
  if (!items.length) return;
  const container = $("#skills-list");
  container.replaceChildren();
  items.forEach((item, index) => {
    const card = makeElement("article", "skill-card");
    card.append(makeElement("span", "skill-number", String(index + 1).padStart(2, "0")));
    card.append(makeElement("div", "skill-symbol", ["〈/〉", "JS↗", "◉", "✳"][index % 4]));
    card.append(makeElement("h3", "", item.title || "Competenza"), makeElement("p", "", item.description || ""));
    card.append(makeElement("span", "skill-status", item.category || "CAPABILITY"));
    container.append(card);
  });
}

function initNavigation() {
  const toggle = $("#menu-toggle"), nav = $("#main-nav");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  $$("#main-nav a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("is-open"); toggle?.setAttribute("aria-expanded", "false");
  }));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  }), { threshold: 0.12 });
  $$(".section-heading, .skill-card, .project-card, .service-card, .process-list article, .contact-panel").forEach(el => observer.observe(el));
}

function initContactForm() {
  const form = $("#contact-form");
  if (!form) return;
  const tabs = $$("[data-form-tab]");
  const typeInput = form.elements.requestType;
  const updateTab = type => {
    typeInput.value = type;
    tabs.forEach(tab => {
      const active = tab.dataset.formTab === type;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $(".company-field", form).hidden = type !== "quote";
    $(".project-field", form).hidden = type !== "quote";
    $(".date-field", form).hidden = type !== "appointment";
    form.elements.subject.placeholder = type === "quote" ? "Preventivo per..." : type === "appointment" ? "Tema della consulenza" : "Di cosa vorresti parlare?";
  };
  tabs.forEach(tab => tab.addEventListener("click", () => updateTab(tab.dataset.formTab)));
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-service]");
    if (link) { updateTab("quote"); form.elements.subject.value = `Richiesta: ${link.dataset.service}`; }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const feedback = $("#form-feedback"), button = $(".submit-button", form);
    feedback.textContent = "Invio in corso…"; feedback.className = "form-feedback";
    button.disabled = true;
    const data = new FormData(form);
    const payload = {
      requestType: String(data.get("requestType") || "contact"),
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      company: String(data.get("company") || "").trim(),
      projectType: String(data.get("projectType") || "").trim(),
      requestedDate: String(data.get("requestedDate") || ""),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
      privacyConsent: data.get("privacyConsent") === "on",
      source: "public-website"
    };
    try {
      if (payload.name.length < 2 || payload.message.length < 10 || !payload.privacyConsent) throw new Error("Controlla i campi obbligatori e il consenso.");
      await submitRequest(payload);
      form.reset(); updateTab(payload.requestType);
      feedback.textContent = "Richiesta inviata. Grazie, ti ricontatterò appena possibile.";
      feedback.classList.add("success");
    } catch (error) {
      console.error("Invio richiesta non riuscito:", error);
      feedback.textContent = error.code === "permission-denied"
        ? "Il servizio di invio non è ancora abilitato nella configurazione Firestore. Riprova più tardi."
        : error.code === "unavailable" || error.message?.includes("Failed to fetch")
          ? "Servizio temporaneamente non raggiungibile. Riprova più tardi."
          : error.message || "Non è stato possibile inviare la richiesta. Verifica la configurazione Firebase.";
      feedback.classList.add("error");
    } finally { button.disabled = false; }
  });
}

async function init() {
  $("#year").textContent = new Date().getFullYear();
  initNavigation(); initContactForm();
  try {
    const settings = await readSettings();
    applySettings(settings);
    const [projects, services, skills] = await Promise.all([
      readPublicCollection("projects"), readPublicCollection("services"), readPublicCollection("skills")
    ]);
    renderProjects(projects); renderServices(services); renderSkills(skills);
  } catch (error) {
    // Il sito resta leggibile anche quando Firebase non è configurato o non è raggiungibile.
    console.info("Contenuti remoti non caricati; vengono mantenuti i contenuti dimostrativi.", error);
  }
}
init();
