// projects-page.js
// Data-driven Projects listing: filter bar + grid

(function () {
  const FILTERS_ID = "projectsFilters";
  const GRID_ID = "projectsGrid";
  const EMPTY_ID = "projectsEmpty";

  const ALL_TAG = "__all";

  const TAG_LABELS = {
    [ALL_TAG]: "All",
    "custom-residential": "Custom Residential",
    "multi-unit": "Multi-Unit",
    commercial: "Commercial",
    "mixed-use": "Mixed-Use",
    "art-installation": "Art Installation",
    "interior-retrofit": "Interior & Retrofit",
  };

  const toTitle = (tag) =>
    tag
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const tagLabel = (tag) => TAG_LABELS[tag] || toTitle(tag);

  const uniqInOrder = (arr) => {
    const out = [];
    const seen = new Set();
    for (const x of arr) {
      if (seen.has(x)) continue;
      seen.add(x);
      out.push(x);
    }
    return out;
  };

  const normalizeTags = (p) => {
    if (Array.isArray(p.tags)) return p.tags.filter(Boolean);
    if (typeof p.tags === "string" && p.tags.trim()) return [p.tags.trim()];
    return [];
  };

  const yearValue = (p) => {
    const y = Number(p && p.year);
    return Number.isFinite(y) ? y : -Infinity;
  };

  const fetchProjects = async () => {
    const res = await fetch("data/projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load projects.json: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("projects.json is not an array");
    const normalized = data.map((p) => ({ ...p, tags: normalizeTags(p) }));
    normalized.sort((a, b) => {
      const by = yearValue(b);
      const ay = yearValue(a);
      if (by !== ay) return by - ay; // newest first; missing years last
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    });
    return normalized;
  };

  const createFilterButton = ({ tag, isActive, onToggle }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `projects-filter${isActive ? " is-active" : ""}`;
    btn.dataset.tag = tag;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.textContent = tagLabel(tag);
    btn.addEventListener("click", () => onToggle(tag), { passive: true });
    return btn;
  };

  const createCard = (p) => {
    const a = document.createElement("a");
    a.className = "project-card";
    // Prefer the new JSON-driven detail page URL.
    // Fall back to p.href for legacy/temporary links.
    a.href = p && p.id ? `project.html?id=${encodeURIComponent(p.id)}` : p.href || "#";

    const media = document.createElement("div");
    media.className = "project-card__media";

    const img = document.createElement("img");
    img.className = "project-card__img";
    img.src = p.thumbnail || "";
    img.alt = p.name || "";
    img.loading = "lazy";
    img.decoding = "async";

    media.appendChild(img);

    const caption = document.createElement("div");
    caption.className = "project-card__caption";
    const captionText = document.createElement("span");
    captionText.className = "project-card__caption-text";
    captionText.textContent = p.name || "";
    caption.appendChild(captionText);
    media.appendChild(caption);

    a.appendChild(media);
    return a;
  };

  const fadeAndSwap = (gridEl, work) => {
    gridEl.classList.add("is-fading");
    window.setTimeout(() => {
      work();
      // Trigger a new frame so opacity animates back in
      window.requestAnimationFrame(() => {
        gridEl.classList.remove("is-fading");
      });
    }, 90);
  };

  const main = async () => {
    const filtersEl = document.getElementById(FILTERS_ID);
    const gridEl = document.getElementById(GRID_ID);
    const emptyEl = document.getElementById(EMPTY_ID);
    if (!filtersEl || !gridEl || !emptyEl) return;

    const root = document.documentElement;
    const pageEl = document.querySelector(".projects-page");
    const pageHeaderEl = document.querySelector(".projects-page__header");
    const siteHeaderEl = document.querySelector("#mainwrapper header.site-header");
    const breadcrumbEl = document.querySelector("#mainwrapper .breadcrumb-container");

    let sizeRaf = 0;
    const updateCardMediaMaxHeight = () => {
      sizeRaf = 0;
      if (!pageEl || !pageHeaderEl || !siteHeaderEl) return;

      // Prefer VisualViewport on mobile (accounts for dynamic browser UI).
      const viewportH =
        (window.visualViewport && window.visualViewport.height) || window.innerHeight || 0;
      const siteHeaderH = siteHeaderEl.getBoundingClientRect().height || 0;
      const pageHeaderH = pageHeaderEl.getBoundingClientRect().height || 0;
      const breadcrumbH = breadcrumbEl ? breadcrumbEl.getBoundingClientRect().height || 0 : 0;

      const pageStyle = window.getComputedStyle(pageEl);
      const padTop = parseFloat(pageStyle.paddingTop) || 0;
      const padBottom = parseFloat(pageStyle.paddingBottom) || 0;

      // Reserve a small buffer for breathing room (rounding, etc.).
      // Keep this small on mobile so the first row fills more of the screen.
      const buffer = window.innerWidth <= 600 ? 6 : 14;

      // Available height for ONE row of cards (image + title) within the viewport.
      // We intentionally DO NOT fill the whole viewport: cards looked too tall.
      const availableRaw =
        viewportH - siteHeaderH - breadcrumbH - pageHeaderH - padTop - padBottom - buffer;

      // Use a smaller portion of the available height so the grid feels less "vh-heavy".
      const fillRatio = window.innerWidth <= 600 ? 0.48 : 0.55;
      const available = Math.floor(Math.max(180, availableRaw * fillRatio));

      // Media fills the available "one row" height since caption is inside media.
      const mediaH = Math.floor(available);

      // Compute a dynamic aspect-ratio so the first row fills the available height.
      // aspect-ratio is width / height, so we need the current card width.
      const firstCard = gridEl.querySelector(".project-card");
      const cardW = firstCard ? firstCard.getBoundingClientRect().width : 0;

      if (cardW > 0 && mediaH > 0) {
        let ratio = cardW / mediaH;
        // Keep it within a more landscape range so cards are shorter.
        // Higher ratio => shorter cards. Cap extremes to keep layouts stable.
        ratio = Math.max(0.78, Math.min(1.18, ratio));
        root.style.setProperty("--project-card-aspect", ratio.toFixed(4));
      } else {
        root.style.removeProperty("--project-card-aspect");
      }
    };

    const requestSizeUpdate = () => {
      if (sizeRaf) return;
      sizeRaf = window.requestAnimationFrame(updateCardMediaMaxHeight);
    };

    let projects = [];
    try {
      projects = await fetchProjects();
    } catch (e) {
      emptyEl.textContent = "Projects unavailable right now.";
      emptyEl.hidden = false;
      return;
    }

    const tags = uniqInOrder(projects.flatMap((p) => p.tags));
    const active = new Set();

    const render = () => {
      // Filters
      filtersEl.replaceChildren();
      const label = document.createElement("span");
      label.className = "projects-filters__label";
      label.textContent = "Filter by:";
      filtersEl.appendChild(label);

      // "All" button: active when no specific tags are selected
      filtersEl.appendChild(
        createFilterButton({
          tag: ALL_TAG,
          isActive: active.size === 0,
          onToggle: (tag) => {
            if (tag !== ALL_TAG) return;
            if (active.size === 0) return; // already showing all
            active.clear();
            fadeAndSwap(gridEl, renderGrid);
            renderFilters();
          },
        })
      );

      tags.forEach((t) => {
        filtersEl.appendChild(
          createFilterButton({
            tag: t,
            isActive: active.has(t),
            onToggle: (tag) => {
              if (tag === ALL_TAG) return;
              if (active.has(tag)) active.delete(tag);
              else active.add(tag);
              fadeAndSwap(gridEl, renderGrid);
              // Re-render filters without fade (instant feedback)
              renderFilters();
            },
          })
        );
      });
    };

    const renderFilters = () => {
      const btns = filtersEl.querySelectorAll(".projects-filter");
      btns.forEach((b) => {
        const t = b.dataset.tag;
        const on = t === ALL_TAG ? active.size === 0 : t && active.has(t);
        b.classList.toggle("is-active", !!on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    };

    const renderGrid = () => {
      gridEl.replaceChildren();

      const filtered =
        active.size === 0
          ? projects
          : projects.filter((p) => p.tags.some((t) => active.has(t)));

      if (filtered.length === 0) {
        emptyEl.textContent = "No projects match those tags.";
        emptyEl.hidden = false;
      } else {
        emptyEl.hidden = true;
      }

      filtered.forEach((p) => {
        gridEl.appendChild(createCard(p));
      });

      requestSizeUpdate();
    };

    render();
    renderGrid();

    // Keep sizing correct on viewport changes.
    window.addEventListener("resize", requestSizeUpdate, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", requestSizeUpdate, { passive: true });
      window.visualViewport.addEventListener("scroll", requestSizeUpdate, { passive: true });
    }
  };

  document.addEventListener("DOMContentLoaded", main);
})();

