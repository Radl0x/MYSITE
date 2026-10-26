const $ = (selector, root = document) => root.querySelector(selector);

function initObjectControls(sceneApi) {
  const root = $("#objectControls");
  const toggle = $("#objectControlsToggle");
  const panel = $("#objectControlsPanel");
  if (!root || !toggle || !panel || !sceneApi) return;

  const controls = {
    mesh: $("#meshDetail"), wire: $("#wireDetail"), deform: $("#deformAmount"),
    coreColor: $("#coreColor"), wireColor: $("#wireColor"), orbitColor: $("#orbitColor"), light: $("#lightIntensity")
  };
  const defaults = { mesh: 4, wire: 2, deform: 0, coreColor: "#172b2b", wireColor: "#b8ff65", orbitColor: "#75e7ff", light: 1 };
  const outputs = { mesh: $("#meshValue"), wire: $("#wireValue"), deform: $("#deformValue"), light: $("#lightValue") };
  let scene = sceneApi;

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("is-open", open);
    if (open) controls.mesh.focus({ preventScroll: true });
  }
  function apply() {
    const mesh = Number(controls.mesh.value);
    const wire = Number(controls.wire.value);
    const deform = Number(controls.deform.value);
    const light = Number(controls.light.value);
    scene.setCoreGeometry(mesh, deform);
    scene.setWireGeometry(wire);
    scene.core.material.color.set(controls.coreColor.value);
    scene.core.material.emissive.set(controls.coreColor.value);
    scene.wire.material.color.set(controls.wireColor.value);
    scene.ringMat.color.set(controls.orbitColor.value);
    scene.keyLight.color.set(controls.wireColor.value);
    scene.blueLight.color.set(controls.orbitColor.value);
    scene.keyLight.intensity = 18 * light;
    scene.blueLight.intensity = 12 * light;
    scene.core.material.emissiveIntensity = 0.55 * light;
    outputs.mesh.value = String(mesh);
    outputs.wire.value = String(wire);
    outputs.deform.value = deform.toFixed(2);
    outputs.light.value = `${light.toFixed(1)}×`;
    $("#objectControlsStatus").textContent = "PARAMETRI APPLICATI LIVE";
  }
  function reset() {
    controls.mesh.value = defaults.mesh;
    controls.wire.value = defaults.wire;
    controls.deform.value = defaults.deform;
    controls.coreColor.value = defaults.coreColor;
    controls.wireColor.value = defaults.wireColor;
    controls.orbitColor.value = defaults.orbitColor;
    controls.light.value = defaults.light;
    if (typeof scene.resetAppearance === "function") scene.resetAppearance();
    apply();
    if (typeof scene.resetAppearance === "function") {
      scene.resetAppearance();
      outputs.mesh.value = String(defaults.mesh); outputs.wire.value = String(defaults.wire);
      outputs.deform.value = "0.00"; outputs.light.value = "1.0×";
      $("#objectControlsStatus").textContent = "CONFIGURAZIONE ORIGINALE RIPRISTINATA";
    }
  }
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  $("#objectControlsClose").addEventListener("click", () => { setOpen(false); toggle.focus(); });
  $("#objectControlsReset").addEventListener("click", reset);
  Object.values(controls).forEach(control => control.addEventListener("input", apply));
  document.addEventListener("pointerdown", event => { if (!root.contains(event.target) && !panel.hidden) setOpen(false); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); } });
  // All’avvio applica esattamente lo stesso stato della funzione RESET.
  reset();
}

let objectControlsInitialized = false;
function initializeObjectControls(sceneApi) {
  if (objectControlsInitialized || !sceneApi) return;
  objectControlsInitialized = true;
  initObjectControls(sceneApi);
}

// Gestisce sia l'evento normale sia il caso in cui la scena sia pronta prima
// che questo modulo abbia registrato il listener.
window.addEventListener("studio:3d-ready", event => initializeObjectControls(event.detail));
if (window.studio3DSceneApi) initializeObjectControls(window.studio3DSceneApi);
