import * as THREE from "three";

// Renderer dedicato esclusivamente al nucleo 3D della Mappa / 001.
const canvas = document.querySelector("#profileStackOrb");
const map = canvas?.closest(".psl-visual");
if (canvas && map) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0, 5.2);
  scene.add(new THREE.AmbientLight(0x8bcfff, 1.7));
  const key = new THREE.PointLight(0x75e7ff, 16, 12); key.position.set(2.5, 2, 3); scene.add(key);
  const rim = new THREE.PointLight(0xb8ff65, 9, 10); rim.position.set(-2, -1, -2); scene.add(rim);
  const assembly = new THREE.Group(); scene.add(assembly);
  // La sigla LB viene impressa direttamente sulla texture del pianeta: non è più un'etichetta DOM sovrapposta.
  const markCanvas = document.createElement("canvas"); markCanvas.width = 1024; markCanvas.height = 512;
  const markCtx = markCanvas.getContext("2d");
  const markGlow = markCtx.createRadialGradient(512, 256, 8, 512, 256, 300);
  markGlow.addColorStop(0, "rgba(117,231,255,.24)"); markGlow.addColorStop(.52, "rgba(15,48,65,.08)"); markGlow.addColorStop(1, "rgba(0,0,0,0)");
  markCtx.fillStyle = markGlow; markCtx.fillRect(0, 0, 1024, 512);
  markCtx.textAlign = "center"; markCtx.textBaseline = "middle"; markCtx.font = "800 210px Arial, Helvetica, sans-serif";
  markCtx.shadowColor = "#75e7ff"; markCtx.shadowBlur = 28; markCtx.fillStyle = "#e7fbff"; markCtx.fillText("LB", 512, 256);
  markCtx.shadowBlur = 5; markCtx.lineWidth = 3; markCtx.strokeStyle = "rgba(117,231,255,.9)"; markCtx.strokeText("LB", 512, 256);
  const markTexture = new THREE.CanvasTexture(markCanvas); markTexture.colorSpace = THREE.SRGBColorSpace;
  const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x426274, map: markTexture, metalness: 0.82, roughness: 0.3, emissive: 0x0a3143, emissiveMap: markTexture, emissiveIntensity: 0.72 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.92, 96, 64), coreMaterial); assembly.add(core);
  const wire = new THREE.Mesh(new THREE.SphereGeometry(0.945, 32, 20), new THREE.MeshBasicMaterial({ color: 0x75e7ff, wireframe: true, transparent: true, opacity: 0.24 })); assembly.add(wire);
  // Circuiti sottili sulla superficie, per una lettura da pianeta tecnologico anziché da badge.
  const circuitMat = new THREE.MeshBasicMaterial({ color: 0x75e7ff, transparent: true, opacity: 0.72 });
  const circuitGroup = new THREE.Group(); assembly.add(circuitGroup);
  for (let i = 0; i < 18; i++) {
    const lat = -1.05 + (i % 9) * 0.26, lon = Math.floor(i / 9) * Math.PI + (i % 3) * 0.16;
    const radius = 0.927, x = radius * Math.cos(lat) * Math.sin(lon), y = radius * Math.sin(lat), z = radius * Math.cos(lat) * Math.cos(lon);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), circuitMat); dot.position.set(x, y, z); circuitGroup.add(dot);
  }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb8ff65, transparent: true, opacity: 0.8 });
  const rings = [new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.012, 8, 100), ringMat), new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.006, 6, 100), new THREE.MeshBasicMaterial({ color: 0x75e7ff, transparent: true, opacity: 0.65 }))];
  rings[0].rotation.set(1.04, 0.3, 0.2); rings[1].rotation.set(0.4, 1.1, -0.5); rings.forEach(r => assembly.add(r));
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); bead.position.set(1.27, 0, 0); rings[0].add(bead);
  const shapes = { frontend: [0.92, 2, 0x14283d], firebase: [0.78, 1, 0x183b48], creative: [0.9, 3, 0x2a1e42], motion: [0.86, 2, 0x1b3341], systems: [0.82, 1, 0x263b2d] };
  let targetY = 0, targetX = 0, targetScale = 1, currentScale = 1, targetColor = new THREE.Color(0x14283d);
  const applySkill = keyName => {
    const cfg = shapes[keyName] || shapes.frontend; targetY = ({ frontend: 0, firebase: 1.15, creative: 2.35, motion: -1.2, systems: 3.1 })[keyName] || 0; targetX = ({ frontend: 0.25, firebase: 0.85, creative: -0.6, motion: 1.05, systems: -1.1 })[keyName] || 0.25; targetScale = cfg[0]; targetColor.setHex(cfg[2]);
    core.scale.setScalar(cfg[0] / 0.92);
    wire.scale.setScalar(cfg[0] / 0.92); circuitGroup.scale.setScalar(cfg[0] / 0.92);
  };
  map.querySelectorAll(".psl-node").forEach(node => {
    const update = () => applySkill(node.dataset.skill);
    node.addEventListener("click", update); node.addEventListener("mouseenter", () => { if (window.matchMedia("(hover: hover)").matches) update(); }); node.addEventListener("focus", update);
  });
  const resize = () => { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return; renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement); resize();
  let frame = 0;
  const render = time => {
    assembly.rotation.y += ((targetY + (reducedMotion ? 0 : time * 0.00012)) - assembly.rotation.y) * 0.035;
    assembly.rotation.x += (targetX - assembly.rotation.x) * 0.035; currentScale += (targetScale - currentScale) * 0.04; assembly.scale.setScalar(currentScale);
    coreMaterial.color.lerp(targetColor, 0.045); coreMaterial.emissive.lerp(targetColor, 0.035);
    if (!reducedMotion) { wire.rotation.y -= 0.003; rings[0].rotation.z += 0.0025; rings[1].rotation.x -= 0.0018; }
    renderer.render(scene, camera); if (!reducedMotion) frame = requestAnimationFrame(render);
  };
  applySkill("frontend"); if (reducedMotion) render(0); else frame = requestAnimationFrame(render);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(frame); else if (!reducedMotion) frame = requestAnimationFrame(render); });
}
