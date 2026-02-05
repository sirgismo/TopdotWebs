/**
 * Generate blog JSON files from existing HTML pages.
 *
 * Outputs:
 * - topdotSite/data/blog.json (lightweight listing)
 * - topdotSite/data/blog/{id}.json (detail data, one per post)
 *
 * Run:
 *   node topdotSite/tools/migrations/generate-blog-data.js
 */

const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..", "..");
const blogIndexPath = path.join(siteRoot, "blog.html");
const blogDir = path.join(siteRoot, "_legacy", "Blog");

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
  // Convert ../images/foo.jpg or ../../images/foo.jpg -> images/foo.jpg
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

function parseMetaDescription(html) {
  const m = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(html);
  return m ? decodeEntities(m[1].trim()) : "";
}

function parseFeaturedImage(html) {
  const m = /id="feturedImgContainer"[\s\S]*?<img[^>]*src=["']([^"']+)["']/i.exec(html);
  return m ? stripLeadingDots(m[1]) : "";
}

function parsePostTitle(html) {
  const m = /<h1[^>]*class=["']post-title["'][^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? decodeEntities(stripTags(m[1])) : "";
}

function parseBlogIndexCards(html) {
  // Extract <a href="Blog/foo.html"> ... <img src="..."> ... <div class="overlay-text">Title</div>
  const items = [];
  const re = /<a[^>]*href=["'](Blog\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    const inner = m[2];

    const imgMatch = /<img[^>]*src=["']([^"']+)["'][^>]*>/i.exec(inner);
    const textMatch = /<div\s+class=["']overlay-text["'][^>]*>([\s\S]*?)<\/div>/i.exec(inner);
    if (!imgMatch || !textMatch) continue;

    const legacyHtml = href;
    const id = path.basename(href, path.extname(href));
    const title = decodeEntities(stripTags(textMatch[1]));
    const slug = slugify(title || id);

    items.push({
      id,
      title: title || id,
      slug,
      date: null,
      tags: [],
      thumbnail: stripLeadingDots(imgMatch[1]),
      href: `blog-post.html?id=${encodeURIComponent(id)}`,
      detailJson: `data/blog/${id}.json`,
      legacyHtml,
    });
  }
  return items;
}

function parsePxStyleValue(style, prop) {
  // Return numeric px value if present, else null.
  const re = new RegExp(`${prop}\\s*:\\s*([0-9.]+)px`, "i");
  const m = re.exec(style || "");
  return m ? Number(m[1]) : null;
}

function extractDivBlocksByClass(html, className) {
  // Find each <div class="className"...>...</div> by balancing nested <div> tags.
  const out = [];
  const startRe = new RegExp(`<div\\b([^>]*?)class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, "gi");

  let m;
  while ((m = startRe.exec(html))) {
    const start = m.index;
    let i = start;
    let depth = 0;
    const tagRe = /<\/?div\b[^>]*>/gi;
    tagRe.lastIndex = start;

    let t;
    while ((t = tagRe.exec(html))) {
      const tag = t[0];
      const isClose = /^<\/div/i.test(tag);
      if (!isClose) depth += 1;
      else depth -= 1;

      if (depth === 0) {
        const end = tagRe.lastIndex;
        out.push(html.slice(start, end));
        startRe.lastIndex = end;
        break;
      }
      i = tagRe.lastIndex;
    }
  }

  return out;
}

function parseBlocksFromHtml(fragmentHtml) {
  const blocks = [];

  // Images (standalone)
  const imgRe = /<img\b([^>]*?)>/gi;
  let im;
  while ((im = imgRe.exec(fragmentHtml))) {
    const tag = im[0];
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(tag);
    if (!srcMatch) continue;
    const altMatch = /\balt=["']([^"']*)["']/i.exec(tag);
    blocks.push({
      type: "img",
      src: stripLeadingDots(srcMatch[1]),
      alt: altMatch ? decodeEntities(altMatch[1]) : "",
    });
  }

  // Iframes
  const iframeRe = /<iframe\b([\s\S]*?)<\/iframe>/gi;
  let ifm;
  while ((ifm = iframeRe.exec(fragmentHtml))) {
    const tag = ifm[0];
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(tag);
    if (!srcMatch) continue;
    const heightMatch = /\bheight=["']([^"']+)["']/i.exec(tag);
    const titleMatch = /\btitle=["']([^"']+)["']/i.exec(tag);
    blocks.push({
      type: "iframe",
      src: srcMatch[1],
      height: heightMatch ? heightMatch[1] : "",
      title: titleMatch ? decodeEntities(titleMatch[1]) : "",
    });
  }

  // Paragraphs (we keep inner HTML so links + <strong> survive)
  const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(fragmentHtml))) {
    const attrs = pm[1] || "";
    const inner = (pm[2] || "").trim();
    const text = decodeEntities(stripTags(inner));
    if (!text) continue;

    const styleMatch = /\bstyle=["']([^"']+)["']/i.exec(attrs);
    const indent = styleMatch ? parsePxStyleValue(styleMatch[1], "margin-left") : null;

    blocks.push({
      type: "p",
      html: inner,
      indent: Number.isFinite(indent) ? indent : null,
    });
  }

  return blocks;
}

function parsePostSections(html) {
  const collapsibleMatch = /<div\s+class=["']collapsible["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!collapsibleMatch) return [];

  const collapsibleHtml = collapsibleMatch[1];
  const items = extractDivBlocksByClass(collapsibleHtml, "collapsibleItem");

  return items
    .map((itemHtml) => {
      const idMatch = /<div\b[^>]*class=["'][^"']*\bcollapsibleItem\b[^"']*["'][^>]*\bid=["']([^"']+)["'][^>]*>/i.exec(
        itemHtml
      );
      const h3Match = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(itemHtml);
      const title = h3Match ? decodeEntities(stripTags(h3Match[1])) : "";
      if (!title) return null;

      const contentMatch = /<div\s+class=["']collapsibleContent["'][^>]*>([\s\S]*?)<\/div>/i.exec(itemHtml);
      const contentHtml = contentMatch ? contentMatch[1] : "";

      const sectionId = idMatch ? idMatch[1] : slugify(title);
      const blocks = parseBlocksFromHtml(contentHtml);

      return {
        id: sectionId,
        title,
        blocks,
      };
    })
    .filter(Boolean);
}

function parsePostIntro(html) {
  // Right container contains intro paragraphs and sometimes inline images before collapsible.
  const rightMatch = /<div\s+class=["']post-RightContainer["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!rightMatch) return [];

  const block = rightMatch[1];
  const cutIdx = block.search(/<div\s+class=["']collapsible["']/i);
  const introHtml = cutIdx >= 0 ? block.slice(0, cutIdx) : block;
  return parseBlocksFromHtml(introHtml);
}

function parsePostDetail(filePath) {
  const html = readText(filePath);
  const title = parsePostTitle(html) || path.basename(filePath, path.extname(filePath));
  const featuredImage = parseFeaturedImage(html);
  const description = parseMetaDescription(html);
  const slug = slugify(title);

  const intro = parsePostIntro(html);
  const sections = parsePostSections(html);

  return {
    id: path.basename(filePath, path.extname(filePath)),
    title,
    slug,
    date: null,
    featuredImage,
    meta: { description },
    intro,
    sections,
    legacyHtml: toWebPath(path.relative(siteRoot, filePath)),
  };
}

function main() {
  const indexHtml = readText(blogIndexPath);
  const listing = parseBlogIndexCards(indexHtml);

  const outDir = path.join(siteRoot, "data", "blog");
  ensureDir(outDir);

  for (const item of listing) {
    const legacyPath = path.join(siteRoot, item.legacyHtml);
    if (!fs.existsSync(legacyPath)) continue;
    const detail = parsePostDetail(legacyPath);

    // Prefer thumbnail as featured if featured not found
    if (!detail.featuredImage && item.thumbnail) detail.featuredImage = item.thumbnail;

    fs.writeFileSync(path.join(outDir, `${item.id}.json`), JSON.stringify(detail, null, 2) + "\n", "utf8");
  }

  const listingOut = path.join(siteRoot, "data", "blog.json");
  fs.writeFileSync(listingOut, JSON.stringify(listing, null, 2) + "\n", "utf8");

  console.log(`Wrote ${listing.length} blog posts -> ${toWebPath(path.relative(process.cwd(), listingOut))}`);
  console.log(`Wrote detail JSON -> ${toWebPath(path.relative(process.cwd(), outDir))}`);
}

main();

