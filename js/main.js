document.addEventListener("DOMContentLoaded", () => {
  initHeroIntro();
  initFlowersScrub();
  initSpecimenSection();
  initStorySection();
  initZodiacWheel();
  initCharmap();
});

// --- Strip 1: hero intro — the single combined grid SVG types in letter-by-letter and stays ---
function initHeroIntro() {
  const grid = document.getElementById("heroGrid");

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

  const title = document.querySelector(".hero__title");
  const subtitle = document.querySelector(".hero__subtitle");
  setTimeout(() => title.classList.add("is-visible"), 300);
  typeInText(subtitle, { charStagger: 60, lineGapMs: 95, startDelay: 424 });

  // Decorative creatures drift a little toward the cursor as it moves over
  // the hero — a light hover-parallax, not a drag; the CSS transition (not
  // per-frame JS easing) is what makes the motion feel like it's floating
  // rather than snapping straight to the pointer.
  //
  // The image is scaled up 5% (in CSS) so it overflows past hero's own
  // edges — hero clips that overflow, so the translate below always stays
  // within the scaled-up margin instead of ever revealing the image's own
  // hard edge.
  const hero = document.getElementById("hero");
  const creatures = document.querySelector(".hero__creatures");
  const content = document.querySelector(".hero__content");
  if (hero && creatures) {
    const maxShiftX = 24;
    const maxShiftY = 14;
    const creaturesScale = 1.05;
    // title/subtitle drift too, at a fraction of the image's shift — the
    // smaller movement reads as "closer" to the viewer than the image,
    // giving the hover a sense of depth instead of everything moving as
    // one flat layer.
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
}

// Crop the SVG's viewBox tightly to its actual inked content so "slice"
// fills every edge with no dead margin. svg.getBBox() (called on the root)
// correctly folds in every descendant group's transform, unlike unioning
// individual path.getBBox() calls, which come back in each path's own local
// space and ignore any ancestor <g transform="...">.
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
// in right-to-left (matching Hebrew reading direction) over a fixed
// duration regardless of how many letters it holds (so a 150-letter row
// and a 30-letter row both read as one smooth "typed line", just at
// different letter-to-letter speeds), then a short pause before the next
// row starts. That row-then-pause cadence is what reads as "line by line"
// instead of one continuous cross-fading cascade.
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

// Same "line by line" cadence as typeInGrid, but for real text (the hero
// subtitle) rather than SVG glyph paths: each <p> is one line, split into
// one <span> per character. Characters reveal in plain string order (not
// sorted by x, unlike typeInGrid) — a real Hebrew string is already
// stored in correct reading order, so index 0..n already IS right-to-left
// order; only the SVG grid's unordered decorative glyphs needed sorting.
//
// charStagger is a fixed per-character delay (a real, constant typing
// speed), not a fixed total spread across the whole line — dividing one
// fixed budget across each line's own length (the earlier approach) made
// long lines type far faster per letter than short ones, since the same
// total time was stretched over more characters.
function typeInText(container, { charStagger = 150, lineGapMs = 235, startDelay = 0 } = {}) {
  const paragraphs = Array.from(container.querySelectorAll("p"));
  if (!paragraphs.length) return;

  paragraphs.forEach((p) => {
    const text = p.textContent;
    p.textContent = "";
    Array.from(text).forEach((ch) => {
      const span = document.createElement("span");
      span.textContent = ch;
      p.appendChild(span);
    });
  });

  let cumulativeDelay = startDelay;
  paragraphs.forEach((p) => {
    const spans = Array.from(p.children);
    spans.forEach((span, i) => {
      setTimeout(() => {
        span.style.opacity = "1";
      }, cumulativeDelay + i * charStagger);
    });
    cumulativeDelay += (spans.length - 1) * charStagger + lineGapMs;
  });
}

// --- Strip 2: scroll-scrubbed flower frame sequence ---
function initFlowersScrub() {
  const frameCount = 117;
  const section = document.getElementById("flowersScrub");
  const canvas = document.getElementById("scrubCanvas");
  const ctx = canvas.getContext("2d");

  const frameSrc = (i) =>
    `assets/frames/hero-flowers/frame_${String(i).padStart(3, "0")}.jpg`;

  const images = [];
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    images.push(img);
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let dw, dh, dx, dy;
    if (imgRatio > canvasRatio) {
      dh = canvas.height;
      dw = dh * imgRatio;
      dx = (canvas.width - dw) / 2;
      dy = 0;
    } else {
      dw = canvas.width;
      dh = dw / imgRatio;
      dx = 0;
      dy = (canvas.height - dh) / 2;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  let currentFrame = 0;
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight;
      // count progress from the moment the section's top edge enters the
      // viewport (not only once it's pinned at the very top), so the video
      // already starts reacting during the scroll from strip 1 into strip 2
      const scrolled = Math.min(Math.max(window.innerHeight - rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      currentFrame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
      drawFrame(currentFrame);
      ticking = false;
    });
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawFrame(currentFrame);
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  images.forEach((img, i) => {
    img.onload = () => {
      if (i === 0) resizeCanvas();
      if (i === currentFrame) drawFrame(i);
    };
  });
}

// Shared by the two edge-to-edge decorative video scrubs below (dragon,
// plant) — same mechanism as initFlowersScrub's frame-sequence canvas, but
// parameterized so it can play back against a small, normally-flowing
// image wrapper instead of a dedicated tall pinned section: progress is
// just how far the wrapper itself has traveled through the viewport, so
// the clip scrubs by while it's on screen instead of needing its own
// scroll-height budget.
// container is expected to be a tall wrapper (see .plant-ribbon/.story-image
// in style.css — several viewport-heights tall) with the canvas pinned via
// position:sticky inside it, exactly like .scrub/.scrub__sticky above.
// Stretching the wrapper's own height (not a lead/trail offset hack) is
// what actually buys more scroll distance for the same frames to play
// across while the canvas stays on screen the whole time — a short,
// normally-flowing wrapper can't show more motion no matter how the
// progress math is padded, since it scrolls past and off-screen in a fixed,
// short distance regardless.
function initFrameScrub({ container, canvas, frameCount, frameSrc }) {
  const ctx = canvas.getContext("2d");
  const images = [];
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    images.push(img);
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  let currentFrame = 0;
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const total = container.offsetHeight;
      const scrolled = Math.min(Math.max(window.innerHeight - rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      currentFrame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
      drawFrame(currentFrame);
      ticking = false;
    });
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawFrame(currentFrame);
  });
  window.addEventListener("scroll", onScroll, { passive: true });

  images.forEach((img, i) => {
    img.onload = () => {
      if (i === 0) resizeCanvas();
      if (i === currentFrame) drawFrame(i);
    };
  });
}

// --- Strip 3: live specimen rows — each has its own adjuster (3 sliders + color + align) ---
// Order matters: under the page's RTL flow, the first entry renders rightmost
// and the adjuster stretches edge to edge via justify-content: space-between
// (like the allcapstype reference), not clustered on one side.
const SPECIMEN_SLIDERS = [
  {
    prop: "fs",
    label: "גודל גופן",
    cssUnit: "px",
    min: 20,
    max: 900,
    format: (v) => `px ${v}`,
  },
  {
    prop: "lh",
    label: "ריווח שורות",
    cssUnit: "px",
    min: 20,
    max: 900,
    format: (v) => `pt ${v}`,
  },
  {
    prop: "ls",
    label: "ריווח אותיות",
    cssUnit: "em",
    min: -0.08,
    max: 0.15,
    format: (v) => `${v}`,
  },
];

// Font sizes (px) are fixed exactly per explicit request, not auto-fit.
const SPECIMEN_ROWS = [
  { text: "קמרינו", fs: 750, ls: 0, autoFit: false },
  { text: "מחזור רוטשילד פירנצה", fs: 210, ls: 0, autoFit: false },
  { text: "רנסנס", fs: 843, ls: 0, autoFit: false },
].map((r) => ({ ...r, lh: r.lh || Math.round(r.fs * 1.05) }));

// The body paragraph and the two caption lines are all live specimen-rows too
// — same adjuster + contenteditable component as the display rows above, just
// like the Photoshop sketch shows (identical slider/color/align bar above each
// of them). Font sizes (px) are fixed exactly per explicit request, not
// auto-fit — the paragraph wraps across several lines at its fixed size
// rather than shrinking to fit one.
const STORY_ROWS = [
  {
    text:
      "במחזור רוטשילד האותיות נכתבו בכתב חצי קורסיבי איטלקי עגול, רך, זורם וגמיש. " +
      "יש להן אופי אורגני, הקווים מתעגלים, נפתחים וממשיכים זה אל זה, והכתב כולו " +
      "נראה כאילו הוא צומח ונע על פני הקלף.כך האות אינה רק נושאת את " +
      "התפילה, אלא גם מעניקה לדף קצב, תנועה וחיים.",
    fs: 63,
    ls: 0,
    align: "center",
    autoFit: false,
  },
  {
    text: "עיצוב גופן המבוסס על כתב ידו של אברהם יהודה בן יחיאל מקמרינוכתב עברי חצי קורסיבי",
    fs: 59,
    ls: 0,
    autoFit: false,
  },
  { text: "זורמת, כמעט נעה, כזו שנמצאת בין מסורת לתנועה", fs: 102, ls: 0, autoFit: false },
].map((r) => ({ ...r, lh: Math.round(r.fs * 1.05) }));

function initSpecimenSection() {
  const section = document.getElementById("specimen");
  if (!section) return;

  SPECIMEN_ROWS.forEach((rowConfig) => buildSpecimenRow(section, rowConfig));
  // The paragraph (STORY_ROWS[0]) sits above the plant ribbon; the two
  // caption rows stay below it, per explicit request to move the paragraph
  // up above the plant images.
  buildSpecimenRow(section, STORY_ROWS[0]);
  buildPlantRibbon(section);
  STORY_ROWS.slice(1).forEach((rowConfig) => buildSpecimenRow(section, rowConfig));
}

// Decorative flourish between the display rows and the body copy — plays
// through assets/frames/specimen-plant (extracted from "for b.mp4") as the
// ribbon scrolls through view, spanning the full row edge to edge.
function buildPlantRibbon(section) {
  const ribbon = document.createElement("div");
  ribbon.className = "plant-ribbon";

  const sticky = document.createElement("div");
  sticky.className = "plant-ribbon__sticky";

  const canvas = document.createElement("canvas");
  canvas.className = "plant-ribbon__img";
  canvas.setAttribute("aria-hidden", "true");

  sticky.appendChild(canvas);
  ribbon.appendChild(sticky);
  section.appendChild(ribbon);

  initFrameScrub({
    container: ribbon,
    canvas,
    frameCount: 97,
    frameSrc: (i) => `assets/frames/specimen-plant/frame_${String(i).padStart(3, "0")}.jpg`,
  });
}

function buildSpecimenRow(section, rowConfig) {
  const row = document.createElement("div");
  row.className = "specimen-row";

  const adjuster = document.createElement("div");
  adjuster.className = "adjuster";

  const crop = document.createElement("div");
  crop.className = "specimen-row__crop";

  const text = document.createElement("div");
  text.className = "specimen-row__text";
  text.contentEditable = "true";
  text.spellcheck = false;
  text.dir = "rtl";
  text.textContent = rowConfig.text;
  text.style.setProperty("--fs", `${rowConfig.fs}px`);
  text.style.setProperty("--lh", `${rowConfig.lh}px`);
  text.style.setProperty("--ls", `${rowConfig.ls}em`);

  // Same "leading trim" technique as AllCaps' own tester (found via their
  // computed --tester-before-marginTop / --tester-after-marginBottom): a
  // zero-size ::before/::after spacer with a calculated margin, instead of a
  // margin on the text box itself + an explicit clipped height. That means
  // the row's own box model does the collapsing — no overflow:hidden, so a
  // slightly-off measurement can never hard-clip a glyph, just under/over
  // space it a little.
  //
  // Range.getClientRects() reflects the browser's own real layout of the line
  // box, whatever metrics table it draws that from — reliable, and what the
  // exact top gap (crop's 10px margin) was measured and confirmed against.
  // But the line box's top/bottom edges follow the font's *declared*
  // ascent/descent, not the real drawn ink: camerino's decorative tails (ק,
  // for one) draw deeper than the declared descent, while plain Hebrew
  // letters (no ascenders) don't reach nearly as high as the declared ascent
  // — leaving visible dead air above the glyphs even once the line box itself
  // sits flush against the crop. So for both edges: keep Range for the line
  // box's own position (reliable), and separately ask canvas.measureText() —
  // which reports the real drawn ink via actualBoundingBox* — how far each
  // edge's ink falls short of (top) or overshoots (bottom) the font's
  // declared metrics, and fold that ink-only correction in on top of the
  // line-box trim (0 in both cases if the font's metrics already matched the
  // ink exactly).
  function relayout() {
    text.style.setProperty("--trim-top", "0px");
    text.style.setProperty("--trim-bottom", "0px");
    const textTop = text.getBoundingClientRect().top;
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = Array.from(range.getClientRects());
    if (!rects.length) return;
    const inkTop = rects[0].top;

    const lines = getRenderedLines(text);
    const cs = getComputedStyle(text);
    const canvas = relayout._canvas || (relayout._canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;

    const firstMetrics = ctx.measureText(lines[0] || "");
    const ascentGap = Math.max(
      0,
      (firstMetrics.fontBoundingBoxAscent || 0) - (firstMetrics.actualBoundingBoxAscent || 0)
    );

    const lastMetrics = ctx.measureText(lines[lines.length - 1] || "");
    const overshoot = Math.max(
      0,
      (lastMetrics.actualBoundingBoxDescent || 0) - (lastMetrics.fontBoundingBoxDescent || 0)
    );

    const trimTop = inkTop - textTop; // dead space above the line box, to remove
    text.style.setProperty("--trim-top", `${-(trimTop + ascentGap)}px`);
    text.style.setProperty("--trim-bottom", `${overshoot}px`);
  }

  const sliders = {};
  SPECIMEN_SLIDERS.forEach((spec) => {
    const slider = buildSlider(spec, rowConfig, text, relayout);
    sliders[spec.prop] = slider;
    adjuster.appendChild(slider.el);
  });
  adjuster.appendChild(buildColorSwatch(row, text));
  adjuster.appendChild(buildAlignGroup(row, rowConfig.align || "right"));

  crop.appendChild(text);
  row.appendChild(adjuster);
  row.appendChild(crop);
  section.appendChild(row);

  text.addEventListener("input", relayout);
  window.addEventListener("resize", relayout);

  // Measure and fit the word to the row's width so the default reads "edge
  // to edge" like the mockup, on whatever screen size the visitor has.
  //
  // Must wait for the real "Camerino" face to finish loading first: @font-face
  // swaps in asynchronously, so fitting against the fallback font's (narrower)
  // metrics on the very next frame locks in a size that overflows and wraps
  // the moment the real font swaps in a beat later.
  //
  // text.getBoundingClientRect() reports the INLINE-BLOCK ELEMENT's own box,
  // which is always a single rect regardless of how many lines its content
  // wraps into internally — it cannot detect wrapping. A Range over the text
  // node's contents does fragment per rendered line, so it's what actually
  // catches an oversized fit before shipping a wrapped default.
  //
  // The text stays invisible (opacity:0, set in CSS) through all of this so
  // the visitor never sees the fallback-font size or the guard loop's
  // intermediate attempts — only the final, already-fitted result fades in.
  document.fonts.ready.then(() => {
    if (rowConfig.autoFit !== false) {
      const rowWidth = row.getBoundingClientRect().width;
      const measured = measureTextLines(text);
      if (rowWidth && measured.width) {
        const targetWidth = rowWidth * rowConfig.fitWidth;
        let fittedFs = Math.round(rowConfig.fs * (targetWidth / measured.width));

        const maxLines = rowConfig.maxLines || 1;
        for (let guard = 0; guard < 8; guard++) {
          sliders.fs.setValue(fittedFs);
          sliders.lh.setValue(Math.round(fittedFs * 1.05));
          if (measureTextLines(text).lines <= maxLines) break;
          fittedFs = Math.round(fittedFs * 0.94);
        }
      }
    }
    relayout();
    text.style.transition = "opacity 0.25s ease";
    text.style.opacity = "1";
  });
}

function measureTextLines(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects());
  const width = rects.reduce((max, r) => Math.max(max, r.width), 0);
  return { width, lines: rects.length };
}

// Splits an element's rendered text into one substring per visual line (by
// walking character-by-character and watching for a jump in vertical
// position), so each line's actual ink shape can be measured on its own via
// canvas.measureText() rather than trusting the font's declared line metrics.
function getRenderedLines(el) {
  const textNode = el.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [el.textContent || ""];
  const content = textNode.textContent;
  if (!content) return [""];

  const range = document.createRange();
  const lines = [];
  let lineStart = 0;
  let lastTop = null;

  for (let i = 0; i < content.length; i++) {
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getClientRects()[0];
    if (!rect) continue;
    if (lastTop === null) {
      lastTop = rect.top;
    } else if (Math.abs(rect.top - lastTop) > 1) {
      lines.push(content.slice(lineStart, i));
      lineStart = i;
      lastTop = rect.top;
    }
  }
  lines.push(content.slice(lineStart));
  return lines;
}

function buildSlider(spec, rowConfig, text, onChange) {
  const group = document.createElement("div");
  group.className = "adjuster__group";

  const label = document.createElement("span");
  label.className = "adjuster__label";
  label.textContent = spec.label;

  const el = document.createElement("div");
  el.className = "adjuster__slider";

  const track = document.createElement("div");
  track.className = "adjuster__track";
  const fill = document.createElement("div");
  fill.className = "adjuster__fill";
  const handle = document.createElement("div");
  handle.className = "adjuster__handle";
  track.appendChild(fill);
  track.appendChild(handle);
  el.appendChild(track);

  const value = document.createElement("span");
  value.className = "adjuster__value";

  group.appendChild(label);
  group.appendChild(el);
  group.appendChild(value);

  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  function apply(ratio) {
    const raw = spec.min + ratio * (spec.max - spec.min);
    const rounded = spec.cssUnit === "px" ? Math.round(raw) : Math.round(raw * 100) / 100;
    fill.style.width = `${ratio * 100}%`;
    handle.style.right = `${ratio * 100}%`;
    value.textContent = spec.format(rounded);
    text.style.setProperty(`--${spec.prop}`, `${rounded}${spec.cssUnit}`);
  }

  function setValue(rawValue) {
    apply(clamp01((rawValue - spec.min) / (spec.max - spec.min)));
  }

  // fill grows from the right edge of the track outward (matches the source SVG,
  // where every slider's black fill is anchored to the track's right edge)
  function ratioFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    return clamp01((rect.right - clientX) / rect.width);
  }

  const initialRatio = clamp01((rowConfig[spec.prop] - spec.min) / (spec.max - spec.min));
  apply(initialRatio);

  let dragging = false;
  el.addEventListener("pointerdown", (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    apply(ratioFromClientX(e.clientX));
    if (onChange) onChange();
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    apply(ratioFromClientX(e.clientX));
    if (onChange) onChange();
  });
  el.addEventListener("pointerup", () => {
    dragging = false;
  });

  return { el: group, setValue };
}

// Built (not hand-picked) to match the reference macOS-style swatch grid one
// panel works everywhere, unlike the native <input type="color"> UI, which
// differs completely between Mac/Windows/Linux: row of 12 saturated basics,
// row of 12 grayscale steps, then an 8x12 hue/tint grid running from
// deep-saturated at the top to pale/washed-out at the bottom.
function buildPresetColorRows() {
  const rows = [];

  const basics = [0, 30, 55, 120, 180, 220, 260, 300].map((h) => `hsl(${h},75%,50%)`);
  basics.push("hsl(30,45%,32%)", "#ffffff", "#8a8a8a", "#1a1a1a");
  rows.push(basics);

  const grays = [];
  for (let i = 0; i < 12; i++) {
    const l = Math.round(100 - (i * 100) / 11);
    grays.push(`hsl(0,0%,${l}%)`);
  }
  rows.push(grays);

  for (let r = 0; r < 8; r++) {
    const sat = 90 - r * 4;
    const light = 30 + r * 8;
    const gridRow = [];
    for (let c = 0; c < 12; c++) {
      gridRow.push(`hsl(${c * 30},${sat}%,${light}%)`);
    }
    rows.push(gridRow);
  }

  return rows;
}

const PRESET_COLOR_ROWS = buildPresetColorRows();

function buildColorSwatch(row, text) {
  const wrap = document.createElement("div");
  wrap.className = "adjuster__color-wrap";

  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "adjuster__color";

  const code = document.createElement("span");
  code.className = "adjuster__color-code";
  code.textContent = "#1a1a1a";

  const panel = document.createElement("div");
  panel.className = "adjuster__color-panel";
  panel.hidden = true;

  function setColor(color) {
    row.style.setProperty("--specimen-accent", color);
    swatch.style.background = color;
    code.textContent = color;
  }

  PRESET_COLOR_ROWS.forEach((colors, rowIndex) => {
    const panelRow = document.createElement("div");
    panelRow.className = "adjuster__color-row";
    colors.forEach((color) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className =
        rowIndex < 2 ? "adjuster__color-dot" : "adjuster__color-dot adjuster__color-dot--square";
      dot.style.background = color;
      dot.addEventListener("click", () => {
        setColor(color);
        panel.hidden = true;
      });
      panelRow.appendChild(dot);
    });
    panel.appendChild(panelRow);
  });

  const moreRow = document.createElement("div");
  moreRow.className = "adjuster__color-row";
  const more = document.createElement("label");
  more.className = "adjuster__color-more";
  const moreInput = document.createElement("input");
  moreInput.type = "color";
  moreInput.value = "#1a1a1a";
  moreInput.addEventListener("input", () => setColor(moreInput.value));
  more.appendChild(moreInput);
  more.appendChild(document.createTextNode("+"));
  moreRow.appendChild(more);
  panel.appendChild(moreRow);

  swatch.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.hidden = true;
  });

  wrap.appendChild(swatch);
  wrap.appendChild(code);
  wrap.appendChild(panel);
  return wrap;
}

function buildAlignGroup(row, initialAlign = "right") {
  const wrap = document.createElement("div");
  wrap.className = "adjuster__align";

  if (initialAlign !== "right") row.style.setProperty("--ta", initialAlign);

  ["right", "center", "left"].forEach((align) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.align = align;
    if (align === initialAlign) btn.classList.add("is-active");
    btn.appendChild(document.createElement("span"));
    btn.appendChild(document.createElement("span"));
    btn.appendChild(document.createElement("span"));
    btn.addEventListener("click", () => {
      wrap.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      // set on `row` (ancestor of both the crop wrapper and the text itself)
      // so it reaches .specimen-row__crop's text-align (which positions the
      // word horizontally) as well as the text element's own — setting it on
      // `text` alone never reached crop, since custom properties only
      // inherit downward, and crop is text's *parent*.
      row.style.setProperty("--ta", align);
    });
    wrap.appendChild(btn);
  });

  return wrap;
}

// --- Strip 4: one edge-to-edge dragon+phoenix illustration (single
// pre-composited image, assets/img/dragon-phoenix.png), then each creature's
// live paragraph underneath it (half the strip's width each — phoenix on the
// right, dragon on the left, matching the image), then one giant edge-to-edge
// specimen-row below both.
const STORY_CREATURES = [
  {
    key: "phoenix",
    text:
      "המחזור הוזמן בשנת אלף ארבע מאות תשעים עבור אליהו בן יואב מפיג׳באנו, בן למשפחת גאליקו, " +
      "מן המשפחות היהודיות המבוססות שפעלו באיטליה של שלהי ימי הביניים. בהמשך עבר ככל הנראה " +
      "לבנו דוד, עם נישואיו לג׳וסטה, בתו של הבנקאי העשיר עמנואל נורסה מפררה. איחוד המשפחות " +
      "קיבל ביטוי גם בתוך כתב היד עצמו. סמלה של משפחת גאליקו, התרנגול, שולב לצד סמלה של " +
      "משפחת נורסה, הכולל ראשי אדם, כוכבים וירח. כך הפך המחזור מספר תפילה מפואר גם לחפץ " +
      "משפחתי, מתנת נישואים וסמל של מעמד, זיכרון ושושלת.מאות שנים לאחר מכן הגיע כתב היד אל " +
      "הענף הצרפתי של משפחת רוטשילד. הוא היה בבעלותו של הברון אדמונד ג׳יימס דה רוטשילד, " +
      "הידוע גם בשם הנדיב הידוע, עבר לבנו מוריס ולבסוף לנכדו, הברון אדמונד דה רוטשילד. " +
      "בשנת אלף תשע מאות שישים ושש, לאחר שריפה קשה בספריית בית המדרש לרבנים באמריקה בניו " +
      "יורק, תרם הברון את המחזור לספרייה כחלק ממאמץ לשקם את אוספיה. מאז שמור כתב היד בספרייה " +
      "ונושא את שם המשפחה שסייעה לשמר אותו ולהעבירו לדורות הבאים.",
  },
  {
    key: "dragon",
    text:
      "אחד ההיבטים המפתיעים ביותר במחזור רוטשילד הוא רוחב התוכן שנאסף בו. לצד תפילות, פיוטים " +
      "והוראות למתפלל, מופיעים בו חישובי לוח שנה, עצות רפואיות, נוסחים לחוזים משפטיים וכלים " +
      "להתנהלות בחיי היום יום. יש בו הוראות הקשורות לברית מילה, לנישואים, לחינוך ילדים, " +
      "לשחיטה ולכשרות, וכן ידע מעשי שנועד לסייע למשפחה בקבלת החלטות. המחזור כולל גם טקסטים " +
      "לחיזוי מזג האוויר, כללים לזיהוי סערות ועצות רפואיות שהיו מקובלות בתקופתו, ובהן הקזת דם. " +
      "לצד אלה מופיעים חישובים מתמטיים שנועדו להתאים בין הלוח העברי ללוח הנוצרי. התוכן הרחב " +
      "מגלה שהמחזור לא נועד רק לבית הכנסת. הוא ליווה את בעליו בבית, בעסקים, באירועים משפחתיים " +
      "וברגעי משבר. הוא הציע תפילה לנחמה, הלכה להכרעה ונוסח מעשי לעריכת חוזה או לחישוב תאריך. " +
      "כך היה המחזור לספרייה משפחתית בכרך אחד, שחיברה בין אמונה, מסורת, מסחר, רפואה וחיי " +
      "משפחה, והעניקה לקוראיה ידע שימושי שליווה אותם לאורך השנה ובתחנות החשובות של חייהם " +
      "האישיים.",
  },
].map((c) => ({ ...c, fs: 26, ls: 0, fitWidth: 0.94, maxLines: 40 }));

// Exact values set by hand (not auto-fit): fs 134 / lh 121 / centered.
const GIANT_PARAGRAPH_ROW = {
  text:
    "המחזור נוצר מעור מעובד, צבעי טמפרה וזהב. עבודת הכתיבה והציור דרשה זמן רב, דיוק ואמצעים. " +
    "עמוד אחר עמוד עבר מידי סופר ומידי אמנים. פאר הספר שיקף מעמד, עושר ואהבת אמנות. " +
    "הוא נשמר כחפץ קודש וכזיכרון משפחתי מדור דור.",
  fs: 134,
  lh: 121,
  ls: 0,
  align: "center",
  autoFit: false,
};
STORY_CREATURES.forEach((c) => (c.lh = Math.round(c.fs * 1.5)));

function initStorySection() {
  const section = document.getElementById("story");
  if (!section) return;

  buildStoryImage(section);

  const creatures = document.createElement("div");
  creatures.className = "story-creatures";

  STORY_CREATURES.forEach((rowConfig) => {
    const col = document.createElement("div");
    col.className = `story-creature story-creature--${rowConfig.key}`;
    buildSpecimenRow(col, rowConfig);
    creatures.appendChild(col);
  });

  section.appendChild(creatures);
  buildSpecimenRow(section, GIANT_PARAGRAPH_ROW);
}

// Plays through assets/frames/story-dragon (extracted from "for c.mp4") as
// the illustration scrolls through view, same mechanism as buildPlantRibbon.
function buildStoryImage(section) {
  const wrap = document.createElement("div");
  wrap.className = "story-image";

  const sticky = document.createElement("div");
  sticky.className = "story-image__sticky";

  const canvas = document.createElement("canvas");
  canvas.className = "story-image__img";
  canvas.setAttribute("aria-hidden", "true");

  sticky.appendChild(canvas);
  wrap.appendChild(sticky);
  section.appendChild(wrap);

  initFrameScrub({
    container: wrap,
    canvas,
    frameCount: 96,
    frameSrc: (i) => `assets/frames/story-dragon/frame_${String(i).padStart(3, "0")}.jpg`,
  });
}

// --- Strip 5: zodiac wheel — the SVG's five ring groups (#ring-1..#ring-5,
// grouped by radius when the source file was preprocessed — the guide
// <path>s that lay out each label's text via <textPath> stay put in <defs>,
// only the <text>/<circle>/<line> elements needed to move; the spoke <line>s
// that originally spanned two rings were geometrically split at the ring
// boundary so each ring owns a complete, independently-rotatable set)
// alternate rotation direction ring by ring as the tall section scrolls by,
// pinned via position: sticky the same way the flowers scrub is.
function initZodiacWheel() {
  const wheel = document.getElementById("zodiacWheel");
  const section = document.getElementById("zodiacSection");
  if (!wheel || !section) return;

  fetch(wheel.dataset.svg)
    .then((res) => res.text())
    .then((svgText) => {
      wheel.innerHTML = svgText;
      const rings = [1, 2, 3, 4, 5]
        .map((n) => wheel.querySelector(`#ring-${n}`))
        .filter(Boolean);
      if (!rings.length) return;

      const maxAngle = 160;
      let ticking = false;

      function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = section.getBoundingClientRect();
          const total = section.offsetHeight - window.innerHeight;
          const scrolled = Math.min(Math.max(-rect.top, 0), total);
          const progress = total > 0 ? scrolled / total : 0;
          const angle = progress * maxAngle;
          // odd rings (1st, 3rd, 5th…) rotate clockwise (right), even rings
          // (2nd, 4th…) rotate counter-clockwise (left) — alternating band by band
          rings.forEach((ring, i) => {
            const direction = i % 2 === 0 ? 1 : -1;
            ring.style.transform = `rotate(${angle * direction}deg)`;
          });
          ticking = false;
        });
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      onScroll();
    });
}

// --- Strip: character map — inspired by the reference foundry's "Character
// Overview" tool (big single-glyph inspector with real metric guide lines +
// a click-to-select grid, grouped by category). All figures below (unitsPerEm,
// per-letter ink bounds, advance widths) were measured directly off
// fonts/camerino-Regular.otf with fontTools, not estimated.
const CHARMAP_UNITS_PER_EM = 1000;

// Real ink extremes measured across the whole Hebrew letter set: ל (lamed)
// is the tallest ascender in the font, and the final letters' decorative
// tails (ך ן ף ץ) are the deepest descenders — these four lines stand in for
// the Latin-specimen "cap height / x-height / baseline / descender" quartet.
const CHARMAP_METRICS = [
  { name: "קו עליון (ל)", value: 692 },
  { name: "גובה אותיות", value: 509 },
  { name: "קו בסיס", value: 0 },
  { name: "זנב אותיות סופיות", value: -257 },
];

// xMin/xMax are each glyph's real drawn-ink horizontal extent (also measured
// via fontTools) — distinct from its advance width, which includes side
// bearings the ink never touches. The stage's vertical guide pair uses these
// so the lines actually bound the ink exactly, with no gap.
const CHARMAP_CATEGORIES = [
  {
    label: "אותיות",
    chars: [
      { char: "א", cp: 1488, width: 546, xMin: 35, xMax: 517 },
      { char: "ב", cp: 1489, width: 428, xMin: -37, xMax: 405 },
      { char: "ג", cp: 1490, width: 397, xMin: -47, xMax: 352 },
      { char: "ד", cp: 1491, width: 415, xMin: 35, xMax: 441 },
      { char: "ה", cp: 1492, width: 497, xMin: 33, xMax: 459 },
      { char: "ו", cp: 1493, width: 296, xMin: 46, xMax: 290 },
      { char: "ז", cp: 1494, width: 293, xMin: 16, xMax: 280 },
      { char: "ח", cp: 1495, width: 481, xMin: 19, xMax: 479 },
      { char: "ט", cp: 1496, width: 557, xMin: 18, xMax: 550 },
      { char: "י", cp: 1497, width: 296, xMin: 44, xMax: 283 },
      { char: "כ", cp: 1499, width: 445, xMin: -37, xMax: 404 },
      { char: "ל", cp: 1500, width: 369, xMin: -30, xMax: 351 },
      { char: "מ", cp: 1502, width: 602, xMin: 23, xMax: 542 },
      { char: "נ", cp: 1504, width: 359, xMin: -45, xMax: 345 },
      { char: "ס", cp: 1505, width: 456, xMin: 20, xMax: 454 },
      { char: "ע", cp: 1506, width: 508, xMin: -62, xMax: 513 },
      { char: "פ", cp: 1508, width: 499, xMin: -11, xMax: 459 },
      { char: "צ", cp: 1510, width: 516, xMin: -52, xMax: 523 },
      { char: "ק", cp: 1511, width: 429, xMin: 29, xMax: 433 },
      { char: "ר", cp: 1512, width: 492, xMin: 45, xMax: 439 },
      { char: "ש", cp: 1513, width: 675, xMin: 27, xMax: 671 },
      { char: "ת", cp: 1514, width: 563, xMin: -43, xMax: 524 },
    ],
  },
  {
    label: "אותיות סופיות",
    chars: [
      { char: "ך", cp: 1498, width: 501, xMin: 34, xMax: 434 },
      { char: "ם", cp: 1501, width: 556, xMin: 41, xMax: 508 },
      { char: "ן", cp: 1503, width: 299, xMin: 51, xMax: 318 },
      { char: "ף", cp: 1507, width: 509, xMin: 24, xMax: 421 },
      { char: "ץ", cp: 1509, width: 512, xMin: 29, xMax: 526 },
    ],
  },
  {
    // OpenType stylistic-set alternates (ss01/ss02 — confirmed by reading the
    // font's own GSUB table, not guessed): "wide" decorative variants of 11
    // letters (ss01) plus 3 further alternates (ss02) of א/י/ת. These aren't
    // separate Unicode characters — the base letter is shown with the
    // feature switched on, so the unicode slot shows the feature tag instead
    // of a code point, and the grid glyph gets font-feature-settings applied
    // directly (see initCharmap: this is the one part of the map that can't
    // go through <canvas>, since canvas text doesn't honor
    // font-feature-settings — only real DOM text does).
    label: "אותיות רחבות",
    chars: [
      { char: "א", feature: "ss01", width: 824, xMin: 75, xMax: 745, yMin: -5, yMax: 514 },
      { char: "ד", feature: "ss01", width: 752, xMin: 79, xMax: 718, yMin: -6, yMax: 508 },
      { char: "ה", feature: "ss01", width: 732, xMin: 71, xMax: 680, yMin: -6, yMax: 513 },
      { char: "ח", feature: "ss01", width: 718, xMin: 42, xMax: 676, yMin: -8, yMax: 512 },
      { char: "י", feature: "ss01", width: 555, xMin: -1, xMax: 511, yMin: -353, yMax: 558 },
      { char: "כ", feature: "ss01", width: 724, xMin: 13, xMax: 669, yMin: -18, yMax: 505 },
      { char: "ל", feature: "ss01", width: 806, xMin: 131, xMax: 761, yMin: -21, yMax: 810 },
      { char: "מ", feature: "ss01", width: 736, xMin: 39, xMax: 687, yMin: 0, yMax: 501 },
      { char: "פ", feature: "ss01", width: 735, xMin: 33, xMax: 655, yMin: -244, yMax: 507 },
      { char: "ר", feature: "ss01", width: 652, xMin: 76, xMax: 599, yMin: -7, yMax: 509 },
      { char: "ת", feature: "ss01", width: 817, xMin: 6, xMax: 747, yMin: -15, yMax: 505 },
      { char: "א", feature: "ss02", width: 692, xMin: 103, xMax: 676, yMin: -5, yMax: 840 },
      { char: "י", feature: "ss02", width: 813, xMin: 48, xMax: 818, yMin: 205, yMax: 518 },
      { char: "ת", feature: "ss02", width: 518, xMin: 77, xMax: 527, yMin: -12, yMax: 796 },
    ],
  },
  {
    label: "ניקוד",
    chars: [
      { char: "ְ", cp: 1456, width: 0, xMin: 262, xMax: 309 },
      { char: "ֱ", cp: 1457, width: 0, xMin: -14, xMax: 303 },
      { char: "ֲ", cp: 1458, width: 0, xMin: 1, xMax: 309 },
      { char: "ֳ", cp: 1459, width: 0, xMin: 262, xMax: 309 },
      { char: "ִ", cp: 1460, width: 0, xMin: 262, xMax: 331 },
      { char: "ֵ", cp: 1461, width: 0, xMin: -14, xMax: 179 },
      { char: "ֶ", cp: 1462, width: 0, xMin: -14, xMax: 179 },
      { char: "ַ", cp: 1463, width: 0, xMin: 2, xMax: 189 },
      { char: "ָ", cp: 1464, width: 0, xMin: 2, xMax: 189 },
      { char: "ֹ", cp: 1465, width: 0, xMin: 291, xMax: 365 },
      { char: "ֺ", cp: 1466, width: 0, xMin: 304, xMax: 378 },
      { char: "ֻ", cp: 1467, width: 0, xMin: 64, xMax: 234 },
      { char: "ּ", cp: 1468, width: 0, xMin: 207, xMax: 281 },
      { char: "־", cp: 1470, width: 346, xMin: 75, xMax: 354 },
      { char: "ׇ", cp: 1479, width: 0, xMin: 227, xMax: 414 },
      { char: "ׁ", cp: 1473, width: 0, xMin: 280, xMax: 354 },
      { char: "ׂ", cp: 1474, width: 0, xMin: -20, xMax: 20 },
    ],
  },
  {
    label: "סימני פיסוק",
    chars: [
      { char: "׳", cp: 1523, width: 235, xMin: 96, xMax: 266 },
      { char: "״", cp: 1524, width: 449, xMin: 39, xMax: 450 },
      { char: "!", cp: 33, width: 227, xMin: 39, xMax: 214 },
      { char: "(", cp: 40, width: 349, xMin: 42, xMax: 356 },
      { char: ")", cp: 41, width: 332, xMin: -22, xMax: 271 },
      { char: ",", cp: 44, width: 201, xMin: -21, xMax: 114 },
      { char: "-", cp: 45, width: 300, xMin: 22, xMax: 275 },
      { char: ".", cp: 46, width: 161, xMin: -9, xMax: 90 },
      { char: "/", cp: 47, width: 189, xMin: -87, xMax: 154 },
      { char: ":", cp: 58, width: 208, xMin: -2, xMax: 157 },
      { char: "[", cp: 91, width: 176, xMin: -41, xMax: 217 },
      { char: "\\", cp: 92, width: 537, xMin: 193, xMax: 462 },
      { char: "]", cp: 93, width: 176, xMin: -45, xMax: 213 },
      { char: "_", cp: 95, width: 414, xMin: -9, xMax: 338 },
      { char: "{", cp: 123, width: 285, xMin: 30, xMax: 321 },
      { char: "}", cp: 125, width: 299, xMin: -40, xMax: 265 },
    ],
  },
  {
    label: "סימנים נוספים",
    chars: [
      { char: "–", cp: 8211, width: 394, xMin: 22, xMax: 369 },
      { char: "—", cp: 8212, width: 698, xMin: 32, xMax: 663 },
      { char: "₪", cp: 8362, width: 615, xMin: 14, xMax: 613 },
    ],
  },
];

// tall enough to fit the tallest ascender in the whole map, including the
// wide ss01/ss02 alternates (which run taller than any regular letter — up
// to yMax=840 for א.ss02, vs. 692 for the tallest regular letter)
const CHARMAP_STAGE_H = 800;
const CHARMAP_BOTTOM_PAD = 30;
const CHARMAP_FONT_PX = 690;

function initCharmap() {
  const section = document.getElementById("charmap");
  if (!section) return;

  const header = document.createElement("div");
  header.className = "charmap__header";
  header.innerHTML = "<h2>מפת אותיות</h2>";
  section.appendChild(header);

  const row = document.createElement("div");
  row.className = "charmap__row";

  // --- left: single-glyph stage — canvas draws the glyph; the horizontal
  // metric guides (real cap-height-equivalent lines, measured off the font
  // file) span the stage's full width like the reference, label at the far
  // left edge and value at the far right; the vertical pair marks this
  // glyph's own advance width (0 → the reference's own "0"/"637" pair) and
  // is repositioned every time a new character is selected.
  const stage = document.createElement("div");
  stage.className = "charmap__stage";

  const canvas = document.createElement("canvas");
  canvas.className = "charmap__canvas";
  stage.appendChild(canvas);

  const tailPx = (Math.abs(CHARMAP_METRICS[3].value) / CHARMAP_UNITS_PER_EM) * CHARMAP_FONT_PX;
  const baselineFromBottom = CHARMAP_BOTTOM_PAD + tailPx;

  CHARMAP_METRICS.forEach((m) => {
    const guide = document.createElement("div");
    guide.className = "charmap__guide";
    const bottomPx = baselineFromBottom + (m.value / CHARMAP_UNITS_PER_EM) * CHARMAP_FONT_PX;
    guide.style.bottom = `${bottomPx}px`;
    guide.innerHTML = `<span>${m.name}</span><span>${m.value}</span>`;
    stage.appendChild(guide);
  });

  const vLeft = document.createElement("div");
  vLeft.className = "charmap__vguide";
  vLeft.innerHTML = `<span>0</span>`;

  const vRight = document.createElement("div");
  vRight.className = "charmap__vguide";
  vRight.innerHTML = `<span></span>`;

  stage.appendChild(vLeft);
  stage.appendChild(vRight);
  row.appendChild(stage);

  const ctx = canvas.getContext("2d");
  const baselineY = CHARMAP_STAGE_H - baselineFromBottom;

  // The canvas backing store must match its rendered CSS size × devicePixelRatio,
  // or the glyph comes out soft/blurry on any retina-class screen — matches the
  // same fix already used for the flowers scrub canvas.
  //
  // clientWidth INCLUDES the element's own padding (it's content + padding,
  // excluding only border/scrollbar) — using it directly as the canvas's
  // width made the canvas as wide as stage's padding box instead of its
  // content box, so it overflowed past stage's inline-start edge (the right
  // side, under RTL) by exactly the padding amount. Subtract the real
  // padding explicitly instead of trusting clientWidth's width alone.
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cs = getComputedStyle(stage);
    const cssW = stage.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${CHARMAP_STAGE_H}px`;
    canvas.width = cssW * dpr;
    canvas.height = CHARMAP_STAGE_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // canvas sits in normal flow, so it's naturally inset from stage's own
  // edge by stage's left padding — but vLeft/vRight are position:absolute
  // children of stage, and `left` on an absolutely-positioned element is
  // measured from the *padding edge* of its containing block, not the
  // content edge canvas is relative to. Without adding that padding back
  // in, both guides land the same fixed amount too far toward stage's outer
  // edge — the ink (drawn via canvas, correctly content-relative) ends up
  // offset from where the lines actually are.
  // getComputedStyle only resolves a real px value once `stage` is actually
  // connected to the document — at this point in the function it's still a
  // detached node (row/section aren't appended until the end), so this must
  // stay a placeholder and get its real value assigned later, after attach.
  let stagePadLeft = 0;

  // The wide stylistic-set alternates (ss01/ss02) can only be rendered via
  // real DOM text with font-feature-settings — canvas text doesn't support
  // that in any browser yet (confirmed empirically, not assumed). This
  // overlay stands in for the canvas glyph in exactly those cases.
  //
  // A Range only reports the *declared* line-box, not the true ink position,
  // and (in this RTL page) the gap between a glyph's own advance-width box
  // and its real ink is anchored on a different side depending on how much
  // wider that box is than the ink — the wide ss01/ss02 alternates have a
  // much bigger box-vs-ink gap than a regular letter, so a single calibration
  // borrowed from measuring one reference letter doesn't transfer to them.
  // Instead, place the glyph, measure exactly where ITS OWN ink actually
  // landed, then correct by that exact delta — this needs no assumptions
  // about box width or bearing, since CSS left/top always translate to
  // viewport pixels 1:1 regardless of the glyph.
  const overlay = document.createElement("span");
  overlay.className = "charmap__overlay-glyph";
  overlay.style.fontSize = `${CHARMAP_FONT_PX}px`;
  stage.appendChild(overlay);

  function measureOverlay(char, feature, left, top) {
    overlay.style.fontFeatureSettings = feature ? `"${feature}" 1` : "normal";
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.textContent = char;
    const range = document.createRange();
    range.selectNodeContents(overlay);
    return range.getClientRects()[0];
  }

  // Unlike horizontal (where each glyph's own advance width shifts the
  // box), a Range's vertical box position/height is a fixed font-wide
  // constant — confirmed empirically: probing several glyphs (feature and
  // regular) at the same CSS `top` gave byte-identical box top/height
  // (718px) regardless of that glyph's real yMax (501 through 840). So the
  // browser places this box at a constant distance above the baseline (the
  // font's own declared ascent metric), not tied to any specific glyph's
  // ink — meaning one fixed `top` value positions every character's
  // baseline correctly, feature or not. ctx.measureText's
  // fontBoundingBoxAscent gives that same font-wide constant directly
  // (works even for feature glyphs, since it doesn't depend on which glyph
  // is drawn — only on the font itself).
  let overlayTopConstant = null;

  function drawOverlayGlyph(char, feature, xMin, xMax) {
    const scale = CHARMAP_FONT_PX / CHARMAP_UNITS_PER_EM;
    const inkWidthPx = (xMax - xMin) * scale;
    const leftGuideX = Math.max(20, (canvas.clientWidth - inkWidthPx) / 2);

    // horizontal: the rendered box's own left edge is this glyph's pen
    // origin (x=0 in font design space) — confirmed empirically, the box's
    // rendered width always matches the glyph's real advance width exactly
    // — so it behaves exactly like the canvas pen position in drawGlyph:
    // the real ink starts xMin further right than the box's own edge.
    const left = stagePadLeft + leftGuideX - xMin * scale;

    if (overlayTopConstant === null) {
      ctx.font = `${CHARMAP_FONT_PX}px Camerino`;
      const fontAscentPx = ctx.measureText("א").fontBoundingBoxAscent;
      overlayTopConstant = baselineY - fontAscentPx;
    }

    measureOverlay(char, feature, left, overlayTopConstant);
    overlay.style.opacity = "1";
    canvas.style.opacity = "0";

    vLeft.style.left = `${stagePadLeft + leftGuideX}px`;
    vLeft.querySelector("span").textContent = String(xMin);
    vRight.style.left = `${stagePadLeft + leftGuideX + inkWidthPx}px`;
    vRight.querySelector("span").textContent = String(xMax);
  }

  function drawGlyph(char, xMin, xMax) {
    overlay.style.opacity = "0";
    canvas.style.opacity = "1";
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.font = `${CHARMAP_FONT_PX}px Camerino`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink") || "#1a1a1a";

    // The vertical guides bound the glyph's real drawn ink (xMin → xMax),
    // not its advance width — those differ by the side bearings, which is
    // exactly the gap that should NOT be there. Center that ink span
    // horizontally in the stage, then work out where the pen (x=0 in font
    // units) must land so the ink comes out exactly between the guides.
    const scale = CHARMAP_FONT_PX / CHARMAP_UNITS_PER_EM;
    const inkWidthPx = (xMax - xMin) * scale;
    const leftGuideX = Math.max(20, (canvas.clientWidth - inkWidthPx) / 2);
    const penX = leftGuideX - xMin * scale;

    ctx.fillText(char, penX, baselineY);

    vLeft.style.left = `${stagePadLeft + leftGuideX}px`;
    vLeft.querySelector("span").textContent = String(xMin);
    vRight.style.left = `${stagePadLeft + leftGuideX + inkWidthPx}px`;
    vRight.querySelector("span").textContent = String(xMax);
  }

  window.addEventListener("resize", () => {
    const active = section.querySelector(".charmap__item.is-active");
    if (!active) return;
    if (active.dataset.feature) {
      drawOverlayGlyph(
        active.dataset.char,
        active.dataset.feature,
        Number(active.dataset.xmin),
        Number(active.dataset.xmax)
      );
    } else {
      drawGlyph(active.dataset.char, Number(active.dataset.xmin), Number(active.dataset.xmax));
    }
  });

  function selectChar(item, data) {
    section.querySelectorAll(".charmap__item.is-active").forEach((el) => el.classList.remove("is-active"));
    item.classList.add("is-active");
    if (data.feature) {
      drawOverlayGlyph(data.char, data.feature, data.xMin, data.xMax);
    } else {
      drawGlyph(data.char, data.xMin, data.xMax);
    }
  }

  // --- right: category grid ---
  const categoriesWrap = document.createElement("div");
  categoriesWrap.className = "charmap__categories";

  let firstItem = null;
  let firstData = null;

  CHARMAP_CATEGORIES.forEach((cat) => {
    const catEl = document.createElement("div");
    catEl.className = "charmap__category";
    const label = document.createElement("h6");
    label.textContent = cat.label;
    catEl.appendChild(label);

    const list = document.createElement("ul");
    list.className = "charmap__list";

    cat.chars.forEach((data) => {
      const item = document.createElement("li");
      item.className = "charmap__item";
      item.dataset.char = data.char;
      item.dataset.xmin = data.xMin;
      item.dataset.xmax = data.xMax;

      const unicode = document.createElement("span");
      unicode.className = "charmap__unicode";

      const glyph = document.createElement("span");
      glyph.className = "charmap__glyph";
      glyph.textContent = data.char;

      if (data.feature) {
        // stylistic-set alternate, not a separate Unicode character — show
        // the feature tag instead of a code point, and switch the feature on
        // for this one grid glyph directly via CSS (real DOM text honors
        // font-feature-settings; canvas text does not).
        item.title = data.feature;
        item.dataset.feature = data.feature;
        unicode.textContent = data.feature;
        glyph.style.fontFeatureSettings = `"${data.feature}" 1`;
      } else {
        item.title = `U+${data.cp.toString(16).toUpperCase().padStart(4, "0")}`;
        unicode.textContent = data.cp;
      }

      item.appendChild(unicode);
      item.appendChild(glyph);
      item.addEventListener("click", () => selectChar(item, data));
      list.appendChild(item);

      if (!firstItem) {
        firstItem = item;
        firstData = data;
      }
    });

    catEl.appendChild(list);
    categoriesWrap.appendChild(catEl);
  });

  row.appendChild(categoriesWrap);
  section.appendChild(row);

  // now that stage is actually connected to the document, its padding
  // resolves to a real px value instead of NaN.
  stagePadLeft = parseFloat(getComputedStyle(stage).paddingLeft);

  document.fonts.ready.then(() => {
    if (firstItem) selectChar(firstItem, firstData);
  });
}
