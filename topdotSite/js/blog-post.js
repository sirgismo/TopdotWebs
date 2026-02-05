// blog-post.js
// Data-driven Blog post renderer: featured image + title + intro + sections.

(function () {
  const els = {
    breadcrumb: document.getElementById("blogBreadcrumb"),
    title: document.getElementById("blogTitle"),
    featuredImg: document.getElementById("blogFeaturedImg"),
    body: document.getElementById("blogBody"),
  };

  const getId = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && id.trim() ? id.trim() : "";
  };

  const fetchPost = async (id) => {
    const res = await fetch(`data/blog/${encodeURIComponent(id)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  };

  const setText = (el, text) => {
    if (!el) return;
    el.textContent = text;
  };

  const appendParagraph = (parent, b) => {
    const p = document.createElement("p");
    // b.html is inner HTML from legacy content; trusted content.
    p.innerHTML = b.html || "";
    if (typeof b.indent === "number" && Number.isFinite(b.indent) && b.indent > 0) {
      p.style.marginLeft = `${b.indent}px`;
    }
    parent.appendChild(p);
  };

  const normalizeLinks = (root) => {
    if (!root) return;
    const anchors = root.querySelectorAll("a");
    anchors.forEach((a) => {
      const rawHref = a.getAttribute("href") || "";
      const onclick = (a.getAttribute("onclick") || "").trim();

      // Convert legacy openCollapsible(...) links into hash links.
      const openMatch = /openCollapsible\s*\(\s*event\s*,\s*['"]([^'"]+)['"]\s*\)/i.exec(onclick);
      if (openMatch) {
        const targetId = openMatch[1];
        a.removeAttribute("onclick");
        a.setAttribute("href", `#${targetId}`);
        return;
      }

      if (!rawHref) return;
      if (rawHref.startsWith("http://") || rawHref.startsWith("https://") || rawHref.startsWith("mailto:")) return;
      if (rawHref.startsWith("#")) return;

      // Normalize ../contact.html -> contact.html
      if (rawHref.startsWith("../")) {
        a.setAttribute("href", rawHref.replace(/^\.\.\//, ""));
        return;
      }

      // Legacy intra-blog links like "best-location-for-building-a-house.html"
      // should point to the new renderer.
      if (/^[^/]+\.html$/i.test(rawHref)) {
        const id = rawHref.replace(/\.html$/i, "");
        a.setAttribute("href", `blog-post.html?id=${encodeURIComponent(id)}`);
        return;
      }

      // Legacy "Blog/foo.html"
      const blogMatch = /^Blog\/([^/]+)\.html$/i.exec(rawHref);
      if (blogMatch) {
        a.setAttribute("href", `blog-post.html?id=${encodeURIComponent(blogMatch[1])}`);
        return;
      }
    });
  };

  const appendImage = (parent, b) => {
    const img = document.createElement("img");
    img.src = b.src || "";
    img.alt = b.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = "100%";
    parent.appendChild(img);
  };

  const appendIframe = (parent, b) => {
    const iframe = document.createElement("iframe");
    iframe.src = b.src || "";
    iframe.width = "100%";
    iframe.height = b.height || "500px";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    if (b.title) iframe.title = b.title;
    iframe.style.border = "0";
    parent.appendChild(iframe);
  };

  const appendBlocks = (parent, blocks) => {
    (Array.isArray(blocks) ? blocks : []).forEach((b) => {
      if (!b || !b.type) return;
      if (b.type === "p") appendParagraph(parent, b);
      else if (b.type === "img") appendImage(parent, b);
      else if (b.type === "iframe") appendIframe(parent, b);
    });
  };

  const appendSection = (parent, s) => {
    const h = document.createElement("h3");
    h.textContent = s.title || "";
    if (s.id) h.id = s.id;
    parent.appendChild(h);
    appendBlocks(parent, s.blocks);
  };

  const main = async () => {
    if (!els.title || !els.body) return;
    const id = getId();
    if (!id) {
      setText(els.title, "Post");
      setText(els.breadcrumb, "Post");
      els.body.textContent = "No post selected.";
      return;
    }

    try {
      const post = await fetchPost(id);
      const title = post && post.title ? String(post.title) : "Post";
      setText(els.title, title);
      setText(els.breadcrumb, title);

      if (els.featuredImg && post && post.featuredImage) {
        els.featuredImg.src = String(post.featuredImage);
        els.featuredImg.alt = title;
      }

      els.body.replaceChildren();
      appendBlocks(els.body, post.intro);

      const sections = Array.isArray(post.sections) ? post.sections : [];
      sections.forEach((s) => appendSection(els.body, s));

      // Fix up legacy relative links inside inserted HTML.
      normalizeLinks(els.body);
    } catch (e) {
      setText(els.title, "Post");
      setText(els.breadcrumb, "Post");
      els.body.textContent = "Post unavailable right now.";
    }
  };

  document.addEventListener("DOMContentLoaded", main);
})();

