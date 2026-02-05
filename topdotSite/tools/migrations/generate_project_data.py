"""
Generate project data JSON files from existing HTML pages.

Outputs:
- topdotSite/data/projects.json (lightweight listing)
- topdotSite/data/projects/{id}.json (detail data, one per project)

Run:
  python topdotSite/tools/migrations/generate_project_data.py
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple


SITE_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class CategoryPage:
    tags: List[str]
    page: Path
    page_dir: Path


CATEGORY_PAGES: List[CategoryPage] = [
    CategoryPage(
        tags=["custom-residential"],
        page=SITE_ROOT / "_legacy" / "Projects" / "customResidential.html",
        page_dir=SITE_ROOT / "_legacy" / "Projects",
    ),
    CategoryPage(
        # Split into independent tags for filtering.
        # We'll refine per-project tags with heuristics below.
        tags=["multi-unit", "commercial", "mixed-use"],
        page=SITE_ROOT / "_legacy" / "Projects" / "multiUnit-Commercial-MixedUse.html",
        page_dir=SITE_ROOT / "_legacy" / "Projects",
    ),
    CategoryPage(
        tags=["art-installation"],
        page=SITE_ROOT / "_legacy" / "Projects" / "artInstallation.html",
        page_dir=SITE_ROOT / "_legacy" / "Projects",
    ),
]


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def strip_leading_dots(p: str) -> str:
    # Convert ../../images/foo.jpg -> images/foo.jpg
    return re.sub(r"^(\.\./)+", "", p)


def strip_tags(html: str) -> str:
    html = re.sub(r"<br\s*/?>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"</?[^>]+>", "", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


def decode_entities(s: str) -> str:
    # Minimal decode for common entities used in your content.
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


def parse_page_names() -> Dict[str, str]:
    js = read_text(SITE_ROOT / "js" / "pageNames.js")
    # var cr01 = "Angle House";
    out: Dict[str, str] = {}
    for m in re.finditer(r'var\s+([a-zA-Z0-9_]+)\s*=\s*"([^"]+)";', js):
        out[m.group(1)] = m.group(2)
    return out


@dataclass
class GridItem:
    id: str
    href: str
    disabled: bool
    thumbnail: str
    title_from_overlay: str
    legacy_html: str


def parse_category_grid_items(html: str, page_dir: Path) -> List[GridItem]:
    items: List[GridItem] = []

    # Extract each <a ... href="..."> ... </a>, then look for img + overlay-text inside.
    for m in re.finditer(r'<a([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)</a>', html, flags=re.IGNORECASE):
        href = m.group(2)
        anchor_attrs = f"{m.group(1)} {m.group(3)}".lower()
        inner = m.group(4)

        img_m = re.search(r'<img[^>]*src="([^"]+)"[^>]*>', inner, flags=re.IGNORECASE)
        text_m = re.search(r'<div\s+class="overlay-text"[^>]*>([\s\S]*?)</div>', inner, flags=re.IGNORECASE)
        if not img_m or not text_m:
            continue

        raw_img = img_m.group(1)
        raw_text = text_m.group(1)

        is_disabled = ("pointer-events: none" in anchor_attrs) or bool(re.search(r"coming\s+soon", raw_text, re.IGNORECASE)) or href == "#"

        proj_id = Path(href).stem  # CustomResidential/cr10.html -> cr10
        detail_path = page_dir / href
        has_detail = detail_path.exists()

        items.append(
            GridItem(
                id=proj_id,
                href=href,
                disabled=is_disabled or (not has_detail),
                thumbnail=strip_leading_dots(raw_img),
                title_from_overlay=decode_entities(strip_tags(raw_text)),
                legacy_html=str(Path("_legacy") / "Projects" / href).replace("\\", "/"),
            )
        )

    return items


def parse_detail_page(detail_file: Path) -> Tuple[str, List[str], List[str], str]:
    html = read_text(detail_file)

    loc_m = re.search(r'<h2\s+class="post-subtitle"\s*>([^<]+)</h2>', html, flags=re.IGNORECASE)
    location = decode_entities(loc_m.group(1).strip()) if loc_m else ""

    desc: List[str] = []
    right_m = re.search(r'<div\s+class="post-RightContainer"[^>]*>([\s\S]*?)</div>', html, flags=re.IGNORECASE)
    if right_m:
        block = right_m.group(1)
        for pm in re.finditer(r"<p[^>]*>([\s\S]*?)</p>", block, flags=re.IGNORECASE):
            t = decode_entities(strip_tags(pm.group(1)))
            if t:
                desc.append(t)

    gallery: List[str] = []
    for im in re.finditer(r'<img[^>]*src="([^"]+)"[^>]*>', html, flags=re.IGNORECASE):
        src = im.group(1)
        if "/Gallery/" not in src and "/gallery/" not in src:
            continue
        gallery.append(strip_leading_dots(src))

    featured_m = re.search(r'id="feturedImgContainer"[\s\S]*?<img[^>]*src="([^"]+)"', html, flags=re.IGNORECASE)
    featured = strip_leading_dots(featured_m.group(1)) if featured_m else ""

    return location, desc, gallery, featured


def infer_muc_tags(*, name: str, description: List[str]) -> List[str]:
    """
    Best-effort tag inference for the legacy MultiUnit-Commercial-MixedUse category.
    This is intentionally conservative; final tagging should come from Sheets.
    """
    hay = (name + " " + " ".join(description)).lower()

    # "Multi-unit" signals.
    is_multi = any(
        k in hay
        for k in [
            "multiplex",
            "multi",
            "units",
            "unit",
            "housing",
            "apartment",
            "duplex",
            "triplex",
            "fourplex",
            "sixplex",
            "missing middle",
            "residential",
        ]
    )

    # "Commercial" signals.
    # NOTE: Don't treat "home office" as a commercial indicator.
    commercial_keywords = [
        "restaurant",
        "burger",
        "retail",
        "shop",
        "store",
        "clinic",
        "dentist",
        "museum",
        "centre",
        "center",
        "park",
    ]
    is_commercial = any(k in hay for k in commercial_keywords)
    if not is_commercial and re.search(r"\boffice\b", hay) and not re.search(r"\bhome\s+office\b", hay):
        is_commercial = True

    is_mixed = any(k in hay for k in ["mixed-use", "mixed use", "retail at grade", "commercial at grade"])

    tags: List[str] = []

    # If a project is clearly a public/commercial program (museum/centre/park/etc.),
    # prefer "commercial" unless there are strong housing terms.
    public_program = any(k in hay for k in ["museum", "centre", "center", "park"])
    if public_program and not any(k in hay for k in ["multiplex", "housing", "apartment", "duplex", "triplex", "fourplex", "sixplex"]):
        is_multi = False

    if is_multi:
        tags.append("multi-unit")
    if is_commercial:
        tags.append("commercial")
    if is_mixed:
        tags.append("mixed-use")

    # Fallback: pick one reasonable tag so filtering is meaningful even without data.
    if not tags:
        if "burger" in hay or "dentist" in hay or "museum" in hay or "centre" in hay or "center" in hay:
            tags = ["commercial"]
        else:
            tags = ["multi-unit"]

    return tags


def build_default_specs(*, location: str) -> List[dict]:
    """
    Build a minimal specs list from what we can reliably extract today.
    This is intentionally small; richer specs can come from Google Sheets later.
    """
    specs: List[dict] = []

    if location:
        specs.append(
            {
                "key": "location",
                "label": "Location",
                "value": location,
                # Listing page might want location later; safe to expose on both.
                "showOn": ["list", "detail"],
                "order": 10,
            }
        )

    return specs


def main() -> None:
    page_names = parse_page_names()

    listing: List[dict] = []
    seen: set[str] = set()

    for cat in CATEGORY_PAGES:
        html = read_text(cat.page)
        items = parse_category_grid_items(html, cat.page_dir)

        for it in items:
            if it.id in seen:
                continue
            seen.add(it.id)

            name = page_names.get(it.id) or it.title_from_overlay or it.id
            slug = slugify(name)
            href = f"ProjectsUnderDevelop.html?project={it.id}"
            status = "coming-soon" if it.disabled else "published"

            tags = list(cat.tags)

            # Refine tags for the legacy "multi-unit/commercial/mixed-use" bucket.
            if set(cat.tags) == {"multi-unit", "commercial", "mixed-use"}:
                detail_path = cat.page_dir / it.href
                if detail_path.exists():
                    _, desc, _, _ = parse_detail_page(detail_path)
                else:
                    desc = []
                tags = infer_muc_tags(name=name, description=desc)

            listing.append(
                {
                    "id": it.id,
                    "name": name,
                    "slug": slug,
                    # Year is used for sorting on the Projects page.
                    # We don't reliably have it in legacy HTML yet, so leave null for now
                    # and populate later from Google Sheets.
                    "year": None,
                    "tags": tags,
                    "thumbnail": it.thumbnail,
                    "status": status,
                    "href": href,
                    "detailJson": f"data/projects/{it.id}.json",
                    "legacyHtml": it.legacy_html,
                }
            )

    out_dir = SITE_ROOT / "data" / "projects"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write per-project detail files
    for p in listing:
        legacy_html = p["legacyHtml"].replace("_legacy/Projects/", "")
        detail_path = SITE_ROOT / "_legacy" / "Projects" / legacy_html

        if detail_path.exists():
            location, description, gallery, featured = parse_detail_page(detail_path)
        else:
            location, description, gallery, featured = "", [], [], ""

        specs = build_default_specs(location=location)

        detail_json = {
            "id": p["id"],
            "name": p["name"],
            "slug": p["slug"],
            "year": p.get("year"),
            "tags": p["tags"],
            "status": p["status"],
            "location": location,
            "featuredImage": featured or p["thumbnail"],
            "description": description,
            "gallery": gallery,
            # Placeholder for future “Specs” table (from Sheets)
            "specs": specs,
            # Pointer to legacy HTML while migrating
            "legacyHtml": p["legacyHtml"],
        }

        (out_dir / f'{p["id"]}.json').write_text(json.dumps(detail_json, indent=2) + "\n", encoding="utf-8")

    # Write listing json
    listing_out = SITE_ROOT / "data" / "projects.json"
    listing_out.write_text(json.dumps(listing, indent=2) + "\n", encoding="utf-8")

    rel_listing = os.path.relpath(listing_out, Path.cwd())
    rel_detail_dir = os.path.relpath(out_dir, Path.cwd())
    print(f"Wrote {len(listing)} projects -> {rel_listing}")
    print(f"Wrote detail JSON -> {rel_detail_dir}")


if __name__ == "__main__":
    main()

