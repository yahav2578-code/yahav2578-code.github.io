document.addEventListener("DOMContentLoaded", () => {
  initResearchHeroGrid();
  initHoverReveal();
  initRunningLoops();
  initSliders();
  initMarquees();
  initLangSwitch();
  initHeroCreatures();
});

// Decorative corner flourishes drift a little toward the cursor as it moves
// over the hero — same light hover-parallax as the home page's
// .hero__creatures (see initHeroIntro in js/main.js, not shared here since
// research.js loads standalone). The image is scaled up 5% in CSS so it
// overflows past the hero's own edges — hero clips that overflow, so the
// translate below always stays within the scaled-up margin instead of ever
// revealing the image's own hard edge.
function initHeroCreatures() {
  const hero = document.getElementById("researchHero");
  const creatures = hero ? hero.querySelector(".hero__creatures") : null;
  const content = document.querySelector(".rs-hero__content");
  if (!hero || !creatures) return;

  const maxShiftX = 24;
  const maxShiftY = 14;
  const creaturesScale = 1.05; // keep in sync with .hero__creatures' base transform in style.css
  const contentShiftRatio = 0.4;

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    creatures.style.transform = `scale(${creaturesScale}) translate(${relX * maxShiftX}px, ${relY * maxShiftY}px)`;
    if (content) {
      content.style.transform = `translate(${relX * maxShiftX * contentShiftRatio}px, ${relY * maxShiftY * contentShiftRatio}px)`;
    }
  });
  hero.addEventListener("mouseleave", () => {
    creatures.style.transform = `scale(${creaturesScale}) translate(0, 0)`;
    if (content) content.style.transform = "translate(0, 0)";
  });
}

// Every translatable string on the page is authored three times, as
// sibling .lang-he/.lang-en/.lang-it spans (see research.html) — setting
// body.lang-en or body.lang-it just flips which sibling is visible via CSS
// (see .lang-en/.lang-he/.lang-it in research.css). Camerino has no Latin
// glyphs, so headings switch to NarkissBlock in either non-Hebrew mode too,
// also handled purely in CSS. Hebrew is the "no extra class" default.
function initLangSwitch() {
  const buttons = document.querySelectorAll(".lang-switch__btn");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      document.body.classList.remove("lang-en", "lang-it");
      if (lang !== "he") document.body.classList.add("lang-" + lang);
      buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });
}

// Floor 2's continuously auto-scrolling image row (see .rs-marquee in
// research.css). Driven directly here via requestAnimationFrame instead of
// a CSS @keyframes animation — the position is just an incrementing pixel
// offset wrapped with modulo against one image-set's width (the track's
// own HTML has the set duplicated once), so it can never "run out": there
// is no fixed duration or iteration count for a browser to finish, only
// arithmetic that keeps producing a valid, in-range position forever.
// Hovering slows it by changing `rate`, read fresh on the very next frame.
function initMarquees() {
  document.querySelectorAll(".rs-marquee").forEach((el) => {
    const track = el.querySelector(".rs-marquee__track");
    if (!track) return;

    const pxPerSecond = 140;
    let rate = 1;
    let offset = 0;
    let lastTime = null;

    // Reading track.scrollWidth used to happen on every single animation
    // frame — right after the previous frame's `transform` write, that
    // forces the browser to do a synchronous layout recalculation just to
    // answer the read (classic layout-thrashing), which is exactly the
    // kind of thing that shows up as small stutters even though the
    // position math itself is smooth. A ResizeObserver keeps setWidth
    // current without ever forcing that per-frame layout pass.
    let setWidth = track.scrollWidth / 2;
    new ResizeObserver(() => {
      setWidth = track.scrollWidth / 2;
    }).observe(track);

    el.addEventListener("mouseenter", () => {
      rate = 0.2;
    });
    el.addEventListener("mouseleave", () => {
      rate = 1;
    });

    function frame(time) {
      if (lastTime !== null) {
        const dt = (time - lastTime) / 1000;
        offset += pxPerSecond * rate * dt;
        if (setWidth > 0) offset %= setWidth;
        track.style.transform = `translateX(${-offset}px)`;
      }
      lastTime = time;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// Multi-image sections (floors 2, 5, 7) are a horizontal scroll-snap
// slider, not a static grid — draggable/swipeable natively via
// overflow-x:auto, plus prev/next buttons that step by one image at a
// time. Confirmed directly (not assumed): in this RTL container Chrome's
// scrollLeft runs *negative* as you scroll forward through the row (a
// plain positive scrollBy did nothing here — only a negative one moved
// it), the opposite of an LTR container — hence the extra *-1 below.
function initSliders() {
  document.querySelectorAll(".rs-slider").forEach((slider) => {
    const wrap = slider.closest(".rs-slider-wrap");
    if (!wrap) return;
    const prev = wrap.querySelector(".rs-slider__prev");
    const next = wrap.querySelector(".rs-slider__next");
    const firstImg = slider.querySelector("img");

    function step(direction) {
      if (!firstImg) return;
      const gap = 24; // matches the 1.5rem gap in .rs-slider's CSS
      const amount = (firstImg.getBoundingClientRect().width + gap) * direction * -1;
      slider.scrollBy({ left: amount, behavior: "auto" });
    }

    if (prev) prev.addEventListener("click", () => step(-1));
    if (next) next.addEventListener("click", () => step(1));
  });
}

// An autoplaying frame cycle — NOT tied to scroll position like the home
// page's video-scrub sections (.plant-ribbon/.story-image), which read the
// exact scroll offset every frame. This one just swaps an <img> src on a
// timer, on its own clock, for a "running images" feel independent of
// scrolling. Hovering slows the cadence down instead of stopping it, per
// explicit request. data-frames on the .rs-loop element is a JSON array of
// image URLs — swap in a real sequence later, the mechanism doesn't change.
function initRunningLoops() {
  document.querySelectorAll(".rs-loop").forEach((el) => {
    let frames;
    try {
      frames = JSON.parse(el.dataset.frames || "[]");
    } catch (e) {
      frames = [];
    }
    if (frames.length < 2) return;

    const img = el.querySelector("img");
    const normalMs = 700;
    const slowMs = 2000;
    let intervalMs = normalMs;
    let i = 0;
    let timer = null;

    function tick() {
      i = (i + 1) % frames.length;
      img.src = frames[i];
      timer = setTimeout(tick, intervalMs);
    }

    timer = setTimeout(tick, intervalMs);
    el.addEventListener("mouseenter", () => {
      intervalMs = slowMs;
    });
    el.addEventListener("mouseleave", () => {
      intervalMs = normalMs;
    });
  });
}

// A second image sits hidden behind the first (see .rs-reveal in
// research.css), only visible through a soft circular mask that follows
// the cursor — this just keeps that mask's center in sync with the pointer.
function initHoverReveal() {
  document.querySelectorAll(".rs-reveal").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--rx", `${x}%`);
      el.style.setProperty("--ry", `${y}%`);
    });
  });
}

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

