// blog-page.js
// Data-driven Blog listing (cards grid).

(function () {
  const GRID_ID = "grid2";

  const fetchBlogIndex = async () => {
    const res = await fetch("data/blog.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("blog.json is not an array");
    return data;
  };

  const createCard = (p) => {
    const a = document.createElement("a");
    a.href = p.href || "#";

    const wrap = document.createElement("div");
    wrap.className = "image-overlay";

    const img = document.createElement("img");
    img.src = p.thumbnail || "";
    img.alt = p.title || "";
    img.loading = "lazy";
    img.decoding = "async";

    const text = document.createElement("div");
    text.className = "overlay-text";
    text.textContent = p.title || "";

    wrap.appendChild(img);
    wrap.appendChild(text);
    a.appendChild(wrap);

    return a;
  };

  const main = async () => {
    const grid = document.getElementById(GRID_ID);
    if (!grid) return;

    try {
      const posts = await fetchBlogIndex();
      grid.replaceChildren();
      posts.forEach((p) => grid.appendChild(createCard(p)));
    } catch (e) {
      // fallback: leave existing markup
    }
  };

  document.addEventListener("DOMContentLoaded", main);
})();

