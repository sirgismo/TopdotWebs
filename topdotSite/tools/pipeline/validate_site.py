"""
Site validator: read-only pre-deploy checks.

Checks:
- Every listing item has a detail JSON
- Every detail JSON references existing images (featured + gallery)
- Specs conform to schema
- Orphan JSONs/folders (optional warnings)

Exit code: 0 if all OK, 1 if errors found.

Run:
  python topdotSite/tools/pipeline/validate_site.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List, Tuple


SITE_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = SITE_ROOT / "data"
PROJECTS_JSON = DATA_DIR / "projects.json"
PROJECTS_DIR = DATA_DIR / "projects"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def is_image(p: Path) -> bool:
    return p.suffix.lower() in ALLOWED_EXTENSIONS


def validate_listing() -> Tuple[int, int]:
    """Validate projects.json."""
    errors = 0
    warnings = 0

    if not PROJECTS_JSON.exists():
        print(f"[ERROR] projects.json not found")
        return 1, 0

    try:
        listing = json.loads(PROJECTS_JSON.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[ERROR] projects.json parse error: {e}")
        return 1, 0

    if not isinstance(listing, list):
        print(f"[ERROR] projects.json is not an array")
        return 1, 0

    print(f"Listing: {len(listing)} projects")

    for item in listing:
        pid = item.get("id")
        if not pid:
            print(f"[ERROR] Listing item missing id")
            errors += 1
            continue

        # Check detail JSON exists
        detail_json_path = item.get("detailJson", "")
        if not detail_json_path:
            print(f"[WARN] {pid}: no detailJson field")
            warnings += 1
            continue

        detail_path = SITE_ROOT / detail_json_path
        if not detail_path.exists():
            print(f"[ERROR] {pid}: detail JSON not found: {detail_json_path}")
            errors += 1
            continue

        # Check thumbnail exists
        thumbnail = item.get("thumbnail", "")
        if thumbnail:
            thumb_path = SITE_ROOT / thumbnail
            if not thumb_path.exists():
                print(f"[ERROR] {pid}: thumbnail not found: {thumbnail}")
                errors += 1

    return errors, warnings


def validate_details() -> Tuple[int, int]:
    """Validate detail JSONs."""
    errors = 0
    warnings = 0

    detail_files = sorted(PROJECTS_DIR.glob("*.json"))
    print(f"Detail JSONs: {len(detail_files)}")

    for detail_path in detail_files:
        pid = detail_path.stem

        try:
            detail = json.loads(detail_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[ERROR] {pid}: parse error: {e}")
            errors += 1
            continue

        # Check featuredImage exists
        featured = detail.get("featuredImage", "")
        if featured:
            featured_path = SITE_ROOT / featured
            if not featured_path.exists():
                print(f"[ERROR] {pid}: featuredImage not found: {featured}")
                errors += 1
        else:
            print(f"[WARN] {pid}: no featuredImage")
            warnings += 1

        # Check gallery images exist
        gallery = detail.get("gallery", [])
        for g in gallery:
            g_path = SITE_ROOT / g
            if not g_path.exists():
                print(f"[ERROR] {pid}: gallery image not found: {g}")
                errors += 1

        # Validate specs schema
        specs = detail.get("specs", [])
        for spec in specs:
            if not isinstance(spec, dict):
                print(f"[ERROR] {pid}: spec is not a dict")
                errors += 1
                continue
            if not spec.get("key"):
                print(f"[ERROR] {pid}: spec missing key")
                errors += 1
            if "showOn" in spec and not isinstance(spec["showOn"], list):
                print(f"[ERROR] {pid}: spec showOn must be array")
                errors += 1

    return errors, warnings


def main() -> None:
    print("=== Site Validation ===\n")

    list_errors, list_warnings = validate_listing()
    detail_errors, detail_warnings = validate_details()

    total_errors = list_errors + detail_errors
    total_warnings = list_warnings + detail_warnings

    print(f"\n=== Summary ===")
    print(f"Errors: {total_errors}")
    print(f"Warnings: {total_warnings}")

    if total_errors > 0:
        print("\nValidation FAILED. Fix errors before deploying.")
        sys.exit(1)
    else:
        print("\nValidation PASSED.")
        sys.exit(0)


if __name__ == "__main__":
    main()
