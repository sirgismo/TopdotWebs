// project-detail.js
// Data-driven Project detail page: hero + stats + description + gallery + lightbox

(function () {
  const els = {
    breadcrumb: document.getElementById("projectBreadcrumb"),
    hero: document.getElementById("projectHero"),
    heroImg: document.getElementById("projectHeroImg"),
    title: document.getElementById("projectTitle"),
    stats: document.getElementById("projectStats"),
    description: document.getElementById("projectDescription"),
    gallery: document.getElementById("projectGallery"),
    empty: document.getElementById("projectEmpty"),
    lightbox: document.getElementById("lightbox"),
    lightboxImg: document.getElementById("lightboxImg"),
    lightboxClose: document.getElementById("lightboxClose"),
    lightboxPrev: document.getElementById("lightboxPrev"),
    lightboxNext: document.getElementById("lightboxNext"),
  };

  const getProjectId = () => {
    const params = new URLSearchParams(window.location.search);
    // Primary: project.html?id=ai01
    const id = params.get("id");
    if (id && id.trim()) return id.trim();
    // Back-compat: ProjectsUnderDevelop.html?project=ai01
    const legacy = params.get("project");
    if (legacy && legacy.trim()) return legacy.trim();
    return "";
  };

  const isEmptyValue = (v) => v == null || String(v).trim() === "";

  const normalizeSpecs = (p) => {
    const specs = Array.isArray(p && p.specs) ? p.specs : [];
    const out = specs
      .filter((s) => s && Array.isArray(s.showOn) && s.showOn.includes("detail"))
      .filter((s) => !isEmptyValue(s.value))
      .sort((a, b) => {
        const ao = Number(a.order);
        const bo = Number(b.order);
        const aN = Number.isFinite(ao) ? ao : 0;
        const bN = Number.isFinite(bo) ? bo : 0;
        return aN - bN;
      });

    // Fallback: if location exists but wasn't included in specs, show it.
    const hasLocation =
      out.some((s) => String(s.key || "").toLowerCase() === "location") ||
      out.some((s) => String(s.label || "").toLowerCase() === "location");
    const loc = p && !isEmptyValue(p.location) ? String(p.location).trim() : "";
    if (!hasLocation && loc) {
      out.unshift({
        key: "location",
        label: "Location",
        value: loc,
        showOn: ["detail"],
        order: 10,
      });
    }

    return out;
  };

  const createStat = (s) => {
    const wrap = document.createElement("div");
    wrap.className = "project-stat";

    const label = document.createElement("span");
    label.className = "project-stat__label";
    label.textContent = s.label || s.key || "";

    const value = document.createElement("span");
    value.className = "project-stat__value";
    value.textContent = String(s.value);

    if (!label.textContent) {
      // If no label, render just value.
      wrap.appendChild(value);
      return wrap;
    }

    wrap.appendChild(label);
    wrap.appendChild(value);
    return wrap;
  };

  const setText = (el, text) => {
    if (!el) return;
    el.textContent = text;
  };

  const setHidden = (el, hidden) => {
    if (!el) return;
    el.hidden = !!hidden;
  };

  const fetchProject = async (id) => {
    const res = await fetch(`data/projects/${encodeURIComponent(id)}.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  };

  const lightbox = (() => {
    let urls = [];
    let idx = 0;
    let prevFocus = null;
    let isOpen = false;
    let failCount = 0;

    const syncNav = () => {
      if (!els.lightboxPrev || !els.lightboxNext) return;
      const many = urls.length > 1;
      els.lightboxPrev.disabled = !many;
      els.lightboxNext.disabled = !many;
      els.lightboxPrev.style.opacity = many ? "" : "0.5";
      els.lightboxNext.style.opacity = many ? "" : "0.5";
    };

    const render = () => {
      if (!els.lightboxImg) return;
      const url = urls[idx] || "";
      els.lightboxImg.src = url;
    };

    const openAt = (nextUrls, nextIdx) => {
      if (!els.lightbox || !els.lightboxImg) return;
      urls = Array.isArray(nextUrls) ? nextUrls : [];
      idx = Math.max(0, Math.min(urls.length - 1, Number(nextIdx) || 0));
      failCount = 0;
      prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      render();
      syncNav();

      isOpen = true;
      els.lightbox.hidden = false;
      els.lightbox.setAttribute("aria-hidden", "false");
      // Next frame so CSS transition kicks in.
      window.requestAnimationFrame(() => {
        els.lightbox.classList.add("is-open");
      });

      // Prevent background scroll
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      // Focus close for keyboard users.
      if (els.lightboxClose) els.lightboxClose.focus();
    };

    const close = () => {
      if (!els.lightbox) return;
      isOpen = false;
      els.lightbox.classList.remove("is-open");
      els.lightbox.setAttribute("aria-hidden", "true");

      // Restore scroll immediately.
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";

      window.setTimeout(() => {
        if (!isOpen) els.lightbox.hidden = true;
      }, 210);

      if (prevFocus) prevFocus.focus();
    };

    const prev = () => {
      if (urls.length < 2) return;
      idx = (idx - 1 + urls.length) % urls.length;
      render();
    };

    const next = () => {
      if (urls.length < 2) return;
      idx = (idx + 1) % urls.length;
      render();
    };

    const onKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };

    const wire = () => {
      if (!els.lightbox) return;

      document.addEventListener("keydown", onKeyDown);

      if (els.lightboxImg) {
        els.lightboxImg.addEventListener("error", () => {
          // If an image can't be loaded, try the next one.
          // If none load, close the lightbox.
          failCount += 1;
          if (urls.length > 1 && failCount < urls.length) next();
          else close();
        });
        els.lightboxImg.addEventListener("load", () => {
          failCount = 0;
        });
      }

      els.lightbox.addEventListener(
        "click",
        (e) => {
          // Close when clicking the overlay (not the image/dialog).
          if (e.target === els.lightbox) close();
        },
        { passive: true }
      );

      if (els.lightboxClose) els.lightboxClose.addEventListener("click", close, { passive: true });
      if (els.lightboxPrev) els.lightboxPrev.addEventListener("click", prev, { passive: true });
      if (els.lightboxNext) els.lightboxNext.addEventListener("click", next, { passive: true });
    };

    return { openAt, close, prev, next, wire };
  })();

  const renderProject = (p) => {
    const name = (p && p.name) || "Project";
    setText(els.title, name);
    setText(els.breadcrumb, name);

    // Hero
    const heroUrl = p && p.featuredImage ? String(p.featuredImage) : "";
    if (els.heroImg && heroUrl) {
      els.heroImg.src = heroUrl;
      els.heroImg.alt = name;
      setHidden(els.hero, false);
    } else {
      setHidden(els.hero, true);
    }

    // Stats
    if (els.stats) {
      els.stats.replaceChildren();
      const specs = normalizeSpecs(p);
      specs.forEach((s) => {
        els.stats.appendChild(createStat(s));
      });
      setHidden(els.stats, specs.length === 0);
    }

    // Description (first paragraph only)
    const firstParagraph =
      p && Array.isArray(p.description) && p.description.length > 0 ? String(p.description[0] || "").trim() : "";

    if (els.description) {
      if (firstParagraph) {
        els.description.replaceChildren();
        const para = document.createElement("p");
        para.textContent = firstParagraph;
        els.description.appendChild(para);
        setHidden(els.description, false);
      } else {
        setHidden(els.description, true);
      }
    }

    // Gallery
    const urls = p && Array.isArray(p.gallery) ? p.gallery.filter((x) => !isEmptyValue(x)).map(String) : [];
    if (els.gallery) els.gallery.replaceChildren();

    const syncGalleryEmpty = () => {
      const count = els.gallery ? els.gallery.childElementCount : 0;
      if (count === 0) {
        setHidden(els.empty, false);
        if (els.empty) els.empty.textContent = "Gallery coming soon.";
      } else {
        setHidden(els.empty, true);
      }
    };

    if (!urls.length) {
      setHidden(els.empty, false);
      if (els.empty) els.empty.textContent = "Gallery coming soon.";
      return;
    }

    setHidden(els.empty, true);
    urls.forEach((src, initialIndex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "project-gallery__item";
      btn.setAttribute("aria-label", `Open image ${initialIndex + 1} of ${urls.length}`);

      const media = document.createElement("div");
      media.className = "project-gallery__media";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = `${name} gallery image ${initialIndex + 1}`;
      img.src = src;

      media.appendChild(img);
      btn.appendChild(media);

      img.addEventListener(
        "error",
        () => {
          // Remove broken images from the grid and from the lightbox list.
          const idxInUrls = urls.indexOf(src);
          if (idxInUrls >= 0) urls.splice(idxInUrls, 1);
          btn.remove();
          syncGalleryEmpty();
        },
        { passive: true }
      );

      btn.addEventListener(
        "click",
        () => {
          const idxInUrls = urls.indexOf(src);
          if (idxInUrls < 0) return;
          lightbox.openAt(urls, idxInUrls);
        },
        { passive: true }
      );

      els.gallery.appendChild(btn);
    });

    syncGalleryEmpty();
  };

  const main = async () => {
    if (!els.title) return;

    const id = getProjectId();
    if (!id) {
      if (els.empty) {
        els.empty.textContent = "No project selected.";
        els.empty.hidden = false;
      }
      return;
    }

    lightbox.wire();

    try {
      const p = await fetchProject(id);
      renderProject(p);
    } catch (e) {
      if (els.empty) {
        els.empty.textContent = "Project unavailable right now.";
        els.empty.hidden = false;
      }
      setHidden(els.hero, true);
      setHidden(els.description, true);
      setHidden(els.stats, true);
    }
  };

  document.addEventListener("DOMContentLoaded", main);
})();

