/* Cinematic project progression is intentionally scoped to #work only. */
(() => {
  const initProjectsCinema = () => {
    const section = document.getElementById('work');
    const grid = document.getElementById('projectsGrid');
    if (!section || !grid || grid.dataset.cinemaReady === 'true') return;
    grid.dataset.cinemaReady = 'true';

    const observeCards = () => {
      const cards = Array.from(grid.querySelectorAll('.work-card'));
      if (!cards.length) return;
      if (!('IntersectionObserver' in window)) {
        cards.forEach(card => card.classList.add('is-cinema-active'));
        return;
      }
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.42) {
            entry.target.classList.add('is-cinema-active');
          } else {
            entry.target.classList.remove('is-cinema-active');
          }
        });
      }, { root: grid, threshold: [0, 0.2, 0.42, 0.65, 0.9] });
      cards.forEach(card => observer.observe(card));
    };

    // Activate input capture only when the project viewport itself is in the
    // cinematic reading position. Never capture while the section title is visible.
    const gridIsActive = () => {
      const r = grid.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top <= vh * 0.18 && r.bottom >= vh * 0.72;
    };
    const atGridEnd = () => grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4;
    const atGridStart = () => grid.scrollTop <= 2;

    // Keep the page in the Projects chapter until every card has been traversed.
    // Once the last card is reached, normal page scrolling resumes naturally.
    window.addEventListener('wheel', event => {
      if (!gridIsActive() || event.ctrlKey || event.deltaY === 0) return;
      if (event.deltaY > 0 && !atGridEnd()) {
        event.preventDefault();
        grid.scrollBy({ top: event.deltaY, behavior: 'auto' });
      } else if (event.deltaY < 0 && !atGridStart()) {
        event.preventDefault();
        grid.scrollBy({ top: event.deltaY, behavior: 'auto' });
      }
    }, { passive: false, capture: true });

    let touchY = null;
    window.addEventListener('touchstart', event => {
      if (gridIsActive() && event.touches.length === 1) touchY = event.touches[0].clientY;
      else touchY = null;
    }, { passive: true, capture: true });
    window.addEventListener('touchmove', event => {
      if (touchY === null || !gridIsActive() || event.touches.length !== 1) return;
      const nextY = event.touches[0].clientY;
      const delta = touchY - nextY;
      if (Math.abs(delta) < 2) return;
      if ((delta > 0 && !atGridEnd()) || (delta < 0 && !atGridStart())) {
        event.preventDefault();
        grid.scrollBy({ top: delta, behavior: 'auto' });
      }
      touchY = nextY;
    }, { passive: false, capture: true });
    window.addEventListener('touchend', () => { touchY = null; }, { passive: true, capture: true });

    // Keyboard users can traverse the same project sequence without a visible scrollbar.
    window.addEventListener('keydown', event => {
      if (!gridIsActive() || event.altKey || event.ctrlKey || event.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
      const down = ['ArrowDown', 'PageDown', ' '].includes(event.key);
      const up = ['ArrowUp', 'PageUp'].includes(event.key);
      if (down && !atGridEnd()) {
        event.preventDefault();
        grid.scrollBy({ top: event.key === 'ArrowDown' ? 90 : grid.clientHeight * 0.82, behavior: 'smooth' });
      } else if (up && !atGridStart()) {
        event.preventDefault();
        grid.scrollBy({ top: event.key === 'ArrowUp' ? -90 : -grid.clientHeight * 0.82, behavior: 'smooth' });
      }
    }, true);

    observeCards();
    const mutationObserver = new MutationObserver(() => observeCards());
    mutationObserver.observe(grid, { childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initProjectsCinema, { once: true });
  else initProjectsCinema();
})();
