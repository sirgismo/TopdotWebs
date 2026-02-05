"""
Generate blog JSON files from existing HTML pages (no Node required).

Outputs:
- topdotSite/data/blog.json (lightweight listing)
- topdotSite/data/blog/{id}.json (detail data, one per post)

Run:
  python topdotSite/tools/migrations/generate_blog_data.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


SITE_ROOT = Path(__file__).resolve().parents[2]
BLOG_INDEX = SITE_ROOT / "blog.html"


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def strip_leading_dots(p: str) -> str:
    return re.sub(r"^(\.\./)+", "", p)


def strip_tags(html: str) -> str:
    html = re.sub(r"<br\s*/?>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"</?[^>]+>", "", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


def decode_entities(s: str) -> str:
    return (
        s.replace("&mdash;", "—")
        .replace("&ndash;", "–")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s


def parse_meta_description(html: str) -> str:
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)
    return decode_entities(m.group(1).strip()) if m else ""


def parse_featured_image(html: str) -> str:
    m = re.search(r'id=["\']feturedImgContainer["\'][\s\S]*?<img[^>]*src=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)
    return strip_leading_dots(m.group(1)) if m else ""


def parse_post_title(html: str) -> str:
    m = re.search(r'<h1[^>]*class=["\']post-title["\'][^>]*>([\s\S]*?)</h1>', html, flags=re.IGNORECASE)
    return decode_entities(strip_tags(m.group(1))) if m else ""


def parse_blog_index_cards(html: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for m in re.finditer(r'<a[^>]*href=["\'](Blog/[^"\']+)["\'][^>]*>([\s\S]*?)</a>', html, flags=re.IGNORECASE):
        href = m.group(1)
        inner = m.group(2)
        img_m = re.search(r'<img[^>]*src=["\']([^"\']+)["\']', inner, flags=re.IGNORECASE)
        text_m = re.search(r'<div\s+class=["\']overlay-text["\'][^>]*>([\s\S]*?)</div>', inner, flags=re.IGNORECASE)
        if not img_m or not text_m:
            continue
        post_id = Path(href).stem
        title = decode_entities(strip_tags(text_m.group(1))) or post_id
        out.append(
            {
                "id": post_id,
                "title": title,
                "slug": slugify(title),
                "date": None,
                "tags": [],
                "thumbnail": strip_leading_dots(img_m.group(1)),
                "href": f"blog-post.html?id={post_id}",
                "detailJson": f"data/blog/{post_id}.json",
                "legacyHtml": href,
            }
        )
    return out


def parse_px(style: str, prop: str) -> Optional[float]:
    m = re.search(rf"{re.escape(prop)}\s*:\s*([0-9.]+)px", style, flags=re.IGNORECASE)
    return float(m.group(1)) if m else None


def extract_div_blocks_by_class(html: str, class_name: str) -> List[str]:
    """
    Extract <div class="... class_name ...">...</div> blocks by balancing nested <div> tags.
    Assumes reasonably well-formed div nesting (true for these pages).
    """
    out: List[str] = []
    start_re = re.compile(rf'<div\b[^>]*class=["\'][^"\']*\b{re.escape(class_name)}\b[^"\']*["\'][^>]*>', re.IGNORECASE)
    tag_re = re.compile(r"</?div\b[^>]*>", re.IGNORECASE)

    i = 0
    while True:
        m = start_re.search(html, i)
        if not m:
            break
        start = m.start()
        depth = 0
        for t in tag_re.finditer(html, start):
            tag = t.group(0)
            if tag.lower().startswith("</div"):
                depth -= 1
            else:
                depth += 1
            if depth == 0:
                end = t.end()
                out.append(html[start:end])
                i = end
                break
        else:
            # Unbalanced; stop to avoid infinite loop
            break

    return out


def parse_blocks_from_html(fragment_html: str) -> List[Dict[str, Any]]:
    """
    Extract blocks in DOM order (p/img/iframe) using a simple regex union.
    """
    blocks: List[Dict[str, Any]] = []

    token_re = re.compile(
        r"(<p\b[^>]*>[\s\S]*?</p>)|(<img\b[^>]*?>)|(<iframe\b[\s\S]*?</iframe>)",
        re.IGNORECASE,
    )

    for tm in token_re.finditer(fragment_html):
        token = tm.group(0) or ""

        if token.lower().startswith("<p"):
            pm = re.search(r"<p\b([^>]*)>([\s\S]*?)</p>", token, flags=re.IGNORECASE)
            if not pm:
                continue
            attrs = pm.group(1) or ""
            inner = (pm.group(2) or "").strip()
            if not decode_entities(strip_tags(inner)):
                continue
            style_m = re.search(r'\bstyle=["\']([^"\']+)["\']', attrs, flags=re.IGNORECASE)
            indent = parse_px(style_m.group(1), "margin-left") if style_m else None
            blocks.append({"type": "p", "html": inner, "indent": indent})

        elif token.lower().startswith("<img"):
            src_m = re.search(r'\bsrc=["\']([^"\']+)["\']', token, flags=re.IGNORECASE)
            if not src_m:
                continue
            alt_m = re.search(r'\balt=["\']([^"\']*)["\']', token, flags=re.IGNORECASE)
            blocks.append(
                {
                    "type": "img",
                    "src": strip_leading_dots(src_m.group(1)),
                    "alt": decode_entities(alt_m.group(1)) if alt_m else "",
                }
            )

        elif token.lower().startswith("<iframe"):
            src_m = re.search(r'\bsrc=["\']([^"\']+)["\']', token, flags=re.IGNORECASE)
            if not src_m:
                continue
            height_m = re.search(r'\bheight=["\']([^"\']+)["\']', token, flags=re.IGNORECASE)
            title_m = re.search(r'\btitle=["\']([^"\']+)["\']', token, flags=re.IGNORECASE)
            blocks.append(
                {
                    "type": "iframe",
                    "src": src_m.group(1),
                    "height": height_m.group(1) if height_m else "",
                    "title": decode_entities(title_m.group(1)) if title_m else "",
                }
            )

    return blocks


def parse_post_intro(html: str) -> List[Dict[str, Any]]:
    right_m = re.search(r'<div\s+class=["\']post-RightContainer["\'][^>]*>([\s\S]*?)</div>', html, flags=re.IGNORECASE)
    if not right_m:
        return []
    block = right_m.group(1)
    cut = re.search(r'<div\s+class=["\']collapsible["\']', block, flags=re.IGNORECASE)
    intro_html = block[: cut.start()] if cut else block
    return parse_blocks_from_html(intro_html)


def parse_post_sections(html: str) -> List[Dict[str, Any]]:
    # The collapsible block contains nested divs; extract via balanced-div parsing.
    blocks = extract_div_blocks_by_class(html, "collapsible")
    if not blocks:
        return []
    coll_html = blocks[0]
    items = extract_div_blocks_by_class(coll_html, "collapsibleItem")
    out: List[Dict[str, Any]] = []
    for item_html in items:
        id_m = re.search(r'\bid=["\']([^"\']+)["\']', item_html, flags=re.IGNORECASE)
        h3_m = re.search(r"<h3\b[^>]*>([\s\S]*?)</h3>", item_html, flags=re.IGNORECASE)
        title = decode_entities(strip_tags(h3_m.group(1))) if h3_m else ""
        if not title:
            continue
        content_m = re.search(r'<div\s+class=["\']collapsibleContent["\'][^>]*>([\s\S]*?)</div>', item_html, flags=re.IGNORECASE)
        content_html = content_m.group(1) if content_m else ""
        out.append(
            {
                "id": id_m.group(1) if id_m else slugify(title),
                "title": title,
                "blocks": parse_blocks_from_html(content_html),
            }
        )
    return out


def parse_post_detail(legacy_html_path: Path) -> Dict[str, Any]:
    html = read_text(legacy_html_path)
    post_id = legacy_html_path.stem
    title = parse_post_title(html) or post_id
    detail = {
        "id": post_id,
        "title": title,
        "slug": slugify(title),
        "date": None,
        "featuredImage": parse_featured_image(html),
        "meta": {"description": parse_meta_description(html)},
        "intro": parse_post_intro(html),
        "sections": parse_post_sections(html),
        "legacyHtml": str(legacy_html_path.relative_to(SITE_ROOT)).replace("\\", "/"),
    }
    return detail


def main() -> None:
    index_html = read_text(BLOG_INDEX)
    listing = parse_blog_index_cards(index_html)

    # If blog.html is data-driven (no hardcoded cards), build listing from Blog/*.html.
    if not listing:
        blog_dir = SITE_ROOT / "_legacy" / "Blog"
        posts = sorted(blog_dir.glob("*.html"), key=lambda p: p.name.lower())
        for p in posts:
            html = read_text(p)
            post_id = p.stem
            title = parse_post_title(html) or post_id
            featured = parse_featured_image(html)
            listing.append(
                {
                    "id": post_id,
                    "title": title,
                    "slug": slugify(title),
                    "date": None,
                    "tags": [],
                    "thumbnail": featured,
                    "href": f"blog-post.html?id={post_id}",
                    "detailJson": f"data/blog/{post_id}.json",
                    "legacyHtml": str(p.relative_to(SITE_ROOT)).replace("\\", "/"),
                }
            )

    out_dir = SITE_ROOT / "data" / "blog"
    out_dir.mkdir(parents=True, exist_ok=True)

    for item in listing:
        legacy = SITE_ROOT / item["legacyHtml"]
        if not legacy.exists():
            continue
        detail = parse_post_detail(legacy)
        if not detail.get("featuredImage") and item.get("thumbnail"):
            detail["featuredImage"] = item["thumbnail"]
        (out_dir / f'{item["id"]}.json').write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")

    (SITE_ROOT / "data" / "blog.json").write_text(json.dumps(listing, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(listing)} blog posts -> data/blog.json")
    print(f"Wrote detail JSON -> data/blog/")


if __name__ == "__main__":
    main()

