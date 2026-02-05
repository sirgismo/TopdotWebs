"""
Sheets → Projects JSON compiler.

Reads CSV exports from Google Sheets and generates:
- topdotSite/data/projects.json (listing)
- topdotSite/data/projects/<id>.json (detail)
- topdotSite/data/_build-manifest.json (hashes for change detection)
- topdotSite/data/_change-report.txt (human-readable diff)

Run:
  python topdotSite/tools/pipeline/sheets_to_projects_json.py
"""

from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


SITE_ROOT = Path(__file__).resolve().parents[2]
SHEETS_DIR = SITE_ROOT / "data" / "sheets"
DATA_DIR = SITE_ROOT / "data"
PROJECTS_DIR = DATA_DIR / "projects"
MANIFEST_PATH = DATA_DIR / "_build-manifest.json"
REPORT_PATH = DATA_DIR / "_change-report.txt"


def read_csv(name: str) -> List[Dict[str, str]]:
    """Read a CSV from the sheets directory."""
    path = SHEETS_DIR / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def slugify(name: str) -> str:
    import re
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s


def compute_hash(data: Any) -> str:
    """Compute deterministic hash of JSON-serializable data."""
    s = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def parse_tags(tags_str: str) -> List[str]:
    """Split comma-separated tags."""
    return [t.strip() for t in (tags_str or "").split(",") if t.strip()]


def parse_show_on(show_on_str: str) -> List[str]:
    """Parse show_on field into array."""
    s = (show_on_str or "").strip()
    if not s:
        return []
    if "|" in s:
        return [x.strip() for x in s.split("|") if x.strip()]
    return [s]


def is_truthy(val: str) -> bool:
    """Check if a CSV value is TRUE/YES/1."""
    return str(val).strip().upper() in {"TRUE", "YES", "1", "T", "Y"}


def is_empty(val: str) -> bool:
    """Check if a value is effectively empty."""
    return not val or not str(val).strip()


@dataclass
class Project:
    id: str
    name: str
    type: str
    tags: List[str]
    status: str
    year: Optional[int]
    location: str
    image_dir: str
    featured_ext: str
    sort_priority: Optional[int]


@dataclass
class SpecDef:
    key: str
    label: str
    emit: bool
    show_on: List[str]
    order: int
    required: bool


def load_projects() -> List[Project]:
    """Load Projects tab."""
    rows = read_csv("Projects.csv")
    out: List[Project] = []
    for r in rows:
        pid = r.get("id", "").strip()
        if not pid:
            continue
        name = r.get("name", "").strip() or pid
        ptype = r.get("type", "").strip()
        tags_raw = r.get("tags", "").strip()
        tags = parse_tags(tags_raw) if tags_raw else ([ptype] if ptype else [])
        status = r.get("status", "").strip() or "draft"
        year_str = r.get("year", "").strip()
        year = int(year_str) if year_str.isdigit() else None
        location = r.get("location", "").strip()
        image_dir = r.get("image_dir", "").strip()
        featured_ext = r.get("featured_ext", "").strip() or "jpg"
        sort_str = r.get("sort_priority", "").strip()
        sort_priority = int(sort_str) if sort_str.isdigit() else None

        out.append(
            Project(
                id=pid,
                name=name,
                type=ptype,
                tags=tags,
                status=status,
                year=year,
                location=location,
                image_dir=image_dir,
                featured_ext=featured_ext,
                sort_priority=sort_priority,
            )
        )
    return out


def load_spec_defs() -> Dict[str, SpecDef]:
    """Load SpecDefinitions tab (global, no type column)."""
    rows = read_csv("SpecDefinitions.csv")
    out: Dict[str, SpecDef] = {}
    for r in rows:
        key = r.get("key", "").strip()
        if not key:
            continue
        label = r.get("label", "").strip() or key
        emit = is_truthy(r.get("emit", ""))
        show_on = parse_show_on(r.get("show_on", ""))
        order_str = r.get("order", "").strip()
        order = int(order_str) if order_str.isdigit() else 0
        required = is_truthy(r.get("required", ""))
        out[key] = SpecDef(
            key=key,
            label=label,
            emit=emit,
            show_on=show_on,
            order=order,
            required=required,
        )
    return out


def load_descriptions() -> Dict[str, List[str]]:
    """Load ProjectDescriptions tab (long format)."""
    rows = read_csv("ProjectDescriptions.csv")
    out: Dict[str, List[tuple[int, str]]] = {}
    for r in rows:
        pid = r.get("project_id", "").strip()
        if not pid:
            continue
        order_str = r.get("order", "").strip()
        order = int(order_str) if order_str.isdigit() else 0
        text = r.get("text", "").strip()
        if not text:
            continue
        out.setdefault(pid, []).append((order, text))

    # Sort and return as list of strings
    return {pid: [t for _, t in sorted(items)] for pid, items in out.items()}


def load_specs() -> Dict[str, List[tuple[str, str]]]:
    """
    Load ProjectSpecs tab.

    Supports TWO CSV shapes:
    - Long format (original): columns project_id,key,value
    - Wide format (recommended for humans): one row per project, with columns:
      project_id,<spec_key_1>,<spec_key_2>,...
    """
    rows = read_csv("ProjectSpecs.csv")
    out: Dict[str, List[tuple[str, str]]] = {}
    if not rows:
        return out

    # Detect shape by presence of "key" + "value" columns.
    # DictReader returns keys for all columns, even if empty per-row.
    first_keys = {k.strip() for k in rows[0].keys() if k is not None}
    is_long = "key" in first_keys and "value" in first_keys

    if not is_long:
        # Wide format: project_id + spec-key columns.
        for r in rows:
            pid = (r.get("project_id") or r.get("id") or "").strip()
            if not pid:
                continue
            for col, val in r.items():
                if not col:
                    continue
                key = col.strip()
                if key in {"project_id", "id"}:
                    continue
                value = (val or "").strip()
                if is_empty(value):
                    continue
                out.setdefault(pid, []).append((key, value))
        return out

    # Long format: project_id, key, value
    for r in rows:
        pid = r.get("project_id", "").strip()
        if not pid:
            continue
        key = r.get("key", "").strip()
        value = r.get("value", "").strip()
        if not key or is_empty(value):
            continue
        out.setdefault(pid, []).append((key, value))
    return out


def build_specs_array(project_specs: List[tuple[str, str]], spec_defs: Dict[str, SpecDef]) -> List[Dict[str, Any]]:
    """Build specs[] for a project by joining values with definitions."""
    specs = []
    for key, value in project_specs:
        spec_def = spec_defs.get(key)
        if not spec_def or not spec_def.emit:
            continue
        specs.append(
            {
                "key": key,
                "label": spec_def.label,
                "value": value,
                "showOn": spec_def.show_on,
                "order": spec_def.order,
            }
        )
    specs.sort(key=lambda s: s["order"])
    return specs


def should_publish(status: str) -> bool:
    """Determine if a project should appear on the public site."""
    return status.lower() in {"published", "coming-soon"}


def build_listing_entry(p: Project) -> Dict[str, Any]:
    """Build a listing entry for projects.json."""
    thumbnail = f"{p.image_dir}Featured.{p.featured_ext}"
    return {
        "id": p.id,
        "name": p.name,
        "slug": slugify(p.name),
        "year": p.year,
        "tags": p.tags,
        "thumbnail": thumbnail,
        "status": p.status,
        "href": f"project.html?id={p.id}",
        "detailJson": f"data/projects/{p.id}.json",
    }


def build_detail_json(
    p: Project,
    descriptions: List[str],
    specs_arr: List[Dict[str, Any]],
    existing_gallery: List[str],
) -> Dict[str, Any]:
    """Build a detail JSON for a project."""
    featured = f"{p.image_dir}Featured.{p.featured_ext}"
    return {
        "id": p.id,
        "name": p.name,
        "slug": slugify(p.name),
        "year": p.year,
        "tags": p.tags,
        "status": p.status,
        "location": p.location,
        "featuredImage": featured,
        "description": descriptions,
        "gallery": existing_gallery,
        "specs": specs_arr,
    }


def load_manifest() -> Dict[str, Any]:
    """Load previous build manifest if exists."""
    if not MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except:
        return {}


def save_manifest(manifest: Dict[str, Any]) -> None:
    """Save build manifest."""
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def generate_change_report(old_manifest: Dict[str, Any], new_manifest: Dict[str, Any]) -> str:
    """Generate human-readable change report."""
    lines = []
    lines.append("=== Build Change Report ===\n")

    old_hashes = old_manifest.get("projects", {})
    new_hashes = new_manifest.get("projects", {})

    added = set(new_hashes.keys()) - set(old_hashes.keys())
    removed = set(old_hashes.keys()) - set(new_hashes.keys())
    changed = {k for k in new_hashes if k in old_hashes and new_hashes[k] != old_hashes[k]}

    if added:
        lines.append(f"Added: {len(added)}")
        for pid in sorted(added):
            lines.append(f"  + {pid}")
        lines.append("")

    if removed:
        lines.append(f"Removed: {len(removed)}")
        for pid in sorted(removed):
            lines.append(f"  - {pid}")
        lines.append("")

    if changed:
        lines.append(f"Changed: {len(changed)}")
        for pid in sorted(changed):
            lines.append(f"  ~ {pid}")
        lines.append("")

    if not added and not removed and not changed:
        lines.append("No changes detected.\n")

    return "\n".join(lines)


def main() -> None:
    projects = load_projects()
    spec_defs = load_spec_defs()
    all_descriptions = load_descriptions()
    all_specs = load_specs()

    publishable = [p for p in projects if should_publish(p.status)]

    # Build listing
    listing = [build_listing_entry(p) for p in publishable]

    # Build details
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    project_hashes: Dict[str, str] = {}

    for p in publishable:
        descriptions = all_descriptions.get(p.id, [])
        project_specs = all_specs.get(p.id, [])
        specs_arr = build_specs_array(project_specs, spec_defs)

        # Preserve existing gallery if present (assets sync updates it)
        detail_path = PROJECTS_DIR / f"{p.id}.json"
        existing_gallery = []
        if detail_path.exists():
            try:
                existing = json.loads(detail_path.read_text(encoding="utf-8"))
                existing_gallery = existing.get("gallery", [])
            except:
                pass

        detail = build_detail_json(p, descriptions, specs_arr, existing_gallery)
        project_hashes[p.id] = compute_hash(detail)
        detail_path.write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")

    # Write listing
    listing_path = DATA_DIR / "projects.json"
    listing_path.write_text(json.dumps(listing, indent=2) + "\n", encoding="utf-8")

    # Manifest
    old_manifest = load_manifest()
    new_manifest = {
        "generated_at": "now",
        "listing_hash": compute_hash(listing),
        "projects": project_hashes,
    }
    save_manifest(new_manifest)

    # Change report
    report = generate_change_report(old_manifest, new_manifest)
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(report)

    print(f"Wrote {len(publishable)} projects -> data/projects.json")
    print(f"Wrote detail JSONs -> data/projects/")


if __name__ == "__main__":
    main()
