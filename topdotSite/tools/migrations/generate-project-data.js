/**
 * Generate project data JSON files from existing HTML pages.
 *
 * Outputs:
 * - topdotSite/data/projects.json (lightweight listing)
 * - topdotSite/data/projects/{id}.json (detail data, one per project)
 *
 * Run:
 *   node topdotSite/tools/migrations/generate-project-data.js
 */

const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..", "..");

const categoryPages = [
  {
    tag: "custom-residential",
    page: path.join(siteRoot, "_legacy", "Projects", "customResidential.html"),
    pageDir: path.join(siteRoot, "_legacy", "Projects"),
  },
  {
    tag: "multi-unit-commercial-mixed-use",
    page: path.join(siteRoot, "_legacy", "Projects", "multiUnit-Commercial-MixedUse.html"),
    pageDir: path.join(siteRoot, "_legacy", "Projects"),
  },
  {
    tag: "art-installation",
    page: path.join(siteRoot, "_legacy", "Projects", "artInstallation.html"),
    pageDir: path.join(siteRoot, "_legacy", "Projects"),
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function toWebPath(p) {
  return p.replace(/\\/g, "/");
}

function stripLeadingDots(p) {
  // Convert ../../images/foo.jpg -> images/foo.jpg
  return p.replace(/^(\.\.\/)+/g, "");
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s) {
  // Minimal decode for common entities used in your content.
  return s
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parsePageNames() {
  const filePath = path.join(siteRoot, "js", "pageNames.js");
  const js = readText(filePath);
  const map = new Map();

  const re = /var\s+([a-zA-Z0-9_]+)\s*=\s*"([^"]+)";/g;
  let m;
  while ((m = re.exec(js))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function parseCategoryGridItems({ html, pageDir }) {
  // Extract <a href="..."> ... <img src="..."> ... <div class="overlay-text">...</div>
  // This is intentionally lenient; HTML is not strictly formatted.
  const items = [];
  const re =
    /<a([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi;

  let m;
  while ((m = re.exec(html))) {
    const href = m[2];
    const anchorAttrs = `${m[1]} ${m[3]}`.toLowerCase();
    const inner = m[4];

    const imgMatch = /<img[^>]*src="([^"]+)"[^>]*>/i.exec(inner);
    const textMatch = /<div\s+class="overlay-text"[^>]*>([\s\S]*?)<\/div>/i.exec(inner);
    if (!imgMatch || !textMatch) continue;

    const rawImg = imgMatch[1];
    const rawText = textMatch[1];

    const isDisabled =
      anchorAttrs.includes("pointer-events: none") ||
      /coming\s+soon/i.test(rawText) ||
      href === "#";

    // Determine id from href filename: CustomResidential/cr10.html -> cr10
    const base = path.basename(href, path.extname(href));
    const detailPath = path.join(pageDir, href);
    const hasDetailFile = fs.existsSync(detailPath);

    items.push({
      id: base,
      href,
      disabled: isDisabled || !hasDetailFile,
      thumbnail: stripLeadingDots(rawImg),
      titleFromOverlay: decodeEntities(stripTags(rawText)),
      legacyHtmlPath: toWebPath(path.join("Projects", href)),
    });
  }

  return items;
}

function parseDetailPage(detailFilePath) {
  const html = readText(detailFilePath);

  const locationMatch = /<h2\s+class="post-subtitle"\s*>([^<]+)<\/h2>/i.exec(html);
  const location = locationMatch ? decodeEntities(locationMatch[1].trim()) : "";

  const rightMatch = /<div\s+class="post-RightContainer"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  const description = [];
  if (rightMatch) {
    const block = rightMatch[1];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(block))) {
      const text = decodeEntities(stripTags(pm[1]));
      if (text) description.push(text);
    }
  }

  const gallery = [];
  const imgRe = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  let im;
  while ((im = imgRe.exec(html))) {
    const src = im[1];
    if (!/\/Gallery\//i.test(src)) continue;
    gallery.push(stripLeadingDots(src));
  }

  // Featured image (best-effort): first <div id="feturedImgContainer"><img src="...">
  const featuredMatch = /id="feturedImgContainer"[\s\S]*?<img[^>]*src="([^"]+)"/i.exec(html);
  const featured = featuredMatch ? stripLeadingDots(featuredMatch[1]) : "";

  return { location, description, gallery, featured };
}

function main() {
  const pageNames = parsePageNames();

  const listing = [];
  const seen = new Set();

  for (const cat of categoryPages) {
    const html = readText(cat.page);
    const items = parseCategoryGridItems({ html, pageDir: cat.pageDir });

    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);

      const name = pageNames.get(it.id) || it.titleFromOverlay || it.id;
      const slug = slugify(name);

      // For now: every card points to the temporary detail page.
      const href = `ProjectsUnderDevelop.html?project=${encodeURIComponent(it.id)}`;

      const status = it.disabled ? "coming-soon" : "published";

      listing.push({
        id: it.id,
        name,
        slug,
        tags: [cat.tag],
        thumbnail: it.thumbnail,
        status,
        href,
        detailJson: `data/projects/${it.id}.json`,
        legacyHtml: it.legacyHtmlPath,
      });
    }
  }

  // Write per-project detail JSON for published projects with actual detail pages.
  const detailOutDir = path.join(siteRoot, "data", "projects");
  ensureDir(detailOutDir);

  for (const p of listing) {
    const legacyRel = p.legacyHtml.replace(/^Projects\//, "");
    const detailPath = path.join(siteRoot, "Projects", legacyRel);
    const hasDetail = fs.existsSync(detailPath);

    const detail = hasDetail ? parseDetailPage(detailPath) : { location: "", description: [], gallery: [], featured: "" };

    const detailJson = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      tags: p.tags,
      status: p.status,
      location: detail.location,
      featuredImage: detail.featured || p.thumbnail,
      description: detail.description,
      gallery: detail.gallery,
      // Placeholder for your future “Specs” table (from Sheets)
      specs: [],
      // Keep a pointer to the legacy page while migrating
      legacyHtml: p.legacyHtml,
    };

    fs.writeFileSync(path.join(detailOutDir, `${p.id}.json`), JSON.stringify(detailJson, null, 2) + "\n", "utf8");
  }

  // Write the listing JSON.
  const listingOutPath = path.join(siteRoot, "data", "projects.json");
  fs.writeFileSync(listingOutPath, JSON.stringify(listing, null, 2) + "\n", "utf8");

  console.log(`Wrote ${listing.length} projects to ${toWebPath(path.relative(process.cwd(), listingOutPath))}`);
  console.log(`Wrote detail JSON files to ${toWebPath(path.relative(process.cwd(), detailOutDir))}`);
}

main();

