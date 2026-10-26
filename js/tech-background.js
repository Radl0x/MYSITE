// Fasci ambientali con deriva lenta e irregolare, come luce sospesa nello spazio.
// Ogni fascio riceve parametri indipendenti e varia gradualmente posizione e intensità.
const beams = [...document.querySelectorAll('.tech-beam')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const timers = new WeakMap();

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clearBeamTimer(beam) {
  const timer = timers.get(beam);
  if (timer) window.clearTimeout(timer);
  timers.delete(beam);
}

function moveBeam(beam, initial = false) {
  clearBeamTimer(beam);
  if (reduceMotion.matches) {
    beam.style.opacity = '.16';
    beam.style.transform = 'translate3d(0,0,0) rotate(22deg) scaleY(1)';
    beam.style.filter = 'blur(24px)';
    return;
  }

  // Spostamenti ampi ma lenti, con variazioni diverse per ogni fascio.
  const x = Math.round(randomBetween(-18, 18));
  const y = randomBetween(-12, 12).toFixed(2);
  const angle = randomBetween(11, 36).toFixed(2);
  const scale = randomBetween(.88, 1.28).toFixed(2);
  const intensity = randomBetween(.055, .34).toFixed(3);
  const blur = Math.round(randomBetween(20, 39));
  const duration = randomBetween(8.5, 15.5).toFixed(2);

  beam.style.setProperty('--beam-duration', `${duration}s`);
  beam.style.opacity = intensity;
  beam.style.transform = `translate3d(${x}vw, ${y}vh, 0) rotate(${angle}deg) scaleY(${scale})`;
  beam.style.filter = `blur(${blur}px)`;

  // Il prossimo cambiamento arriva dopo un intervallo irregolare: niente ritmo meccanico.
  const wait = initial ? randomBetween(6500, 10500) : randomBetween(8500, 15500);
  timers.set(beam, window.setTimeout(() => moveBeam(beam), wait));
}

function startAtmosphere() {
  beams.forEach((beam, index) => {
    clearBeamTimer(beam);
    if (reduceMotion.matches) {
      moveBeam(beam);
      return;
    }
    // Sfasamento iniziale per evitare che i fasci si muovano tutti insieme.
    timers.set(beam, window.setTimeout(() => moveBeam(beam, true), index * randomBetween(500, 1250)));
  });
}

startAtmosphere();
reduceMotion.addEventListener?.('change', startAtmosphere);
