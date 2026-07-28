document.addEventListener("DOMContentLoaded", () => {
  initResearchHeroGrid();
  initChapterReveal();
});

// Same typed-grid hero background as the home page (see initHeroIntro in
// js/main.js) — same mechanism, different source SVG: grid-research.svg
// repeats the word "מחקר" into the identical silhouette (same per-row
// x/y envelope) that grid-hero.svg fills with real paragraph text, per
// explicit request to reuse page 1's exact hero pattern.
function initResearchHeroGrid() {
  const grid = document.getElementById("researchHeroGrid");
  if (!grid) return;

  fetch(grid.dataset.svg)
    .then((res) => res.text())
    .then((svgText) => {
      grid.innerHTML = svgText;
      const svg = grid.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      fitViewBoxToInk(svg);
      typeInGrid(grid);
    });
}

// Duplicated from js/main.js (not shared — research.js loads standalone,
// without main.js's index.html-specific DOMContentLoaded chain).
function fitViewBoxToInk(svg) {
  let box;
  try {
    box = svg.getBBox();
  } catch (e) {
    return;
  }
  if (!box || !box.width || !box.height) return;
  svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
}

// Reveals the grid one full row at a time, top to bottom — each row sweeps
// right-to-left over a fixed duration regardless of letter count, then a
// short pause before the next row starts (see js/main.js for the full
// rationale — this is a duplicate of that same function).
function typeInGrid(container, rowSweepMs = 220, rowGapMs = 60) {
  const marks = Array.from(container.querySelectorAll("path, text"));
  if (!marks.length) return;

  const rows = new Map();
  marks.forEach((el) => {
    const box = el.getBBox();
    const rowKey = Math.round(box.y / 15);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push({ el, box });
  });

  const rowKeys = Array.from(rows.keys()).sort((a, b) => a - b);
  let cumulativeDelay = 0;
  rowKeys.forEach((rowKey) => {
    const rowItems = rows.get(rowKey).sort((a, b) => b.box.x - a.box.x);
    const perLetterStagger = rowItems.length > 1 ? rowSweepMs / (rowItems.length - 1) : 0;
    rowItems.forEach(({ el }, i) => {
      setTimeout(() => {
        el.style.opacity = "1";
      }, cumulativeDelay + i * perLetterStagger);
    });
    cumulativeDelay += rowSweepMs + rowGapMs;
  });
}

function initChapterReveal() {
  const chapters = document.querySelectorAll("[data-reveal]");
  if (!chapters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  chapters.forEach((chapter) => observer.observe(chapter));
}
