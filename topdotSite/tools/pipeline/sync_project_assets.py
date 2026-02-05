"""
Assets sync: enforce Featured/Gallery conventions, rename gallery images to 01..NN, update gallery[].

Responsibilities:
- For each published project, ensure image_dir structure exists.
- Validate Featured.<ext> exists.
- Collect images in Gallery/, sort deterministically, rename to 01..NN (keep ext).
- Update gallery[] in data/projects/<id>.json.
- For multi-unit projects, check Diagrams/ and warn if missing.

Run:
  python topdotSite/tools/pipeline/sync_project_assets.py [--dry-run]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import List


SITE_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = SITE_ROOT / "data"
PROJECTS_JSON = DATA_DIR / "projects.json"
PROJECTS_DIR = DATA_DIR / "projects"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def is_image(p: Path) -> bool:
    """Check if a file is a supported image."""
    return p.suffix.lower() in ALLOWED_EXTENSIONS


def normalize_gallery_order(images: List[Path]) -> List[Path]:
    """Sort images deterministically (case-insensitive filename)."""
    return sorted(images, key=lambda p: p.name.lower())

def build_gallery_list_from_disk(gallery_path: Path) -> List[str]:
    """Build gallery list from what's actually on disk (deterministic order)."""
    images = [f for f in gallery_path.iterdir() if f.is_file() and is_image(f)]
    ordered = normalize_gallery_order(images)
    return [str(p.relative_to(SITE_ROOT)).replace("\\", "/") for p in ordered]


def sync_gallery(
    project_id: str,
    gallery_path: Path,
    dry_run: bool = False
) -> List[str]:
    """
    Collect images in gallery_path, rename to 01..NN (keep ext), return relative paths.
    """
    if not gallery_path.exists():
        print(f"  [WARN] {project_id}: Gallery/ not found at {gallery_path}")
        return []

    images = [f for f in gallery_path.iterdir() if f.is_file() and is_image(f)]
    if not images:
        print(f"  [WARN] {project_id}: Gallery/ is empty")
        return []

    ordered = normalize_gallery_order(images)
    planned_gallery_list: List[str] = []
    renames = []

    for i, img in enumerate(ordered, start=1):
        ext = img.suffix.lower()
        new_name = f"{i:02d}{ext}"
        new_path = gallery_path / new_name

        if img.name != new_name:
            renames.append((img, new_path))

        # Planned relative path (what the gallery list should be after normalization).
        rel = str(new_path.relative_to(SITE_ROOT)).replace("\\", "/")
        planned_gallery_list.append(rel)

    # In dry-run mode, don't touch disk; just report the plan.
    if dry_run:
        return planned_gallery_list

    if renames and not dry_run:
        # Rename in two passes to avoid collisions
        temp_renames = []
        failed = 0
        staged = 0
        finalized = 0
        for old, new in renames:
            temp = old.parent / f"_temp_{old.name}"
            try:
                old.rename(temp)
                temp_renames.append((temp, new))
                staged += 1
            except PermissionError as e:
                failed += 1
                print(f"  [WARN] {project_id}: Cannot rename {old.name} (permission denied). Leaving as-is.")
            except OSError as e:
                failed += 1
                print(f"  [WARN] {project_id}: Cannot rename {old.name} ({e}). Leaving as-is.")

        for temp, new in temp_renames:
            try:
                temp.rename(new)
                finalized += 1
            except PermissionError:
                failed += 1
                # Best-effort revert so we don't leave temp files around.
                try:
                    original = temp.with_name(temp.name.replace("_temp_", "", 1))
                    temp.rename(original)
                except Exception:
                    pass
                print(f"  [WARN] {project_id}: Cannot finalize rename to {new.name} (permission denied).")
            except OSError as e:
                failed += 1
                try:
                    original = temp.with_name(temp.name.replace("_temp_", "", 1))
                    temp.rename(original)
                except Exception:
                    pass
                print(f"  [WARN] {project_id}: Cannot finalize rename to {new.name} ({e}).")

        # Always return the *actual* state on disk (even if renames failed).
    # Logging
    if renames:
        # staged/finalized are only set in the rename branch above; fall back gracefully.
        staged_n = locals().get("staged", 0)
        finalized_n = locals().get("finalized", 0)
        failed_n = locals().get("failed", 0)
        if finalized_n > 0:
            print(f"  Renamed {finalized_n}/{len(renames)} gallery images for {project_id}")
        else:
            print(f"  No gallery renames applied for {project_id} (permissions).")
        if failed_n:
            print(f"  [INFO] {project_id}: {failed_n} rename operations failed; gallery[] was updated from disk.")

    # In normal mode, always return what exists on disk (even when no renames were needed).
    return build_gallery_list_from_disk(gallery_path)


def check_diagrams(project_id: str, project_type: str, diagrams_path: Path) -> None:
    """Warn if multi-unit project missing diagrams."""
    if project_type not in {"multi-unit"}:
        return
    if not diagrams_path.exists() or not any(f.is_file() and is_image(f) for f in diagrams_path.iterdir()):
        print(f"  [WARN] {project_id}: No diagrams found in Diagrams/ (recommended for multi-unit)")


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    if not PROJECTS_JSON.exists():
        print(f"Error: {PROJECTS_JSON} not found")
        sys.exit(1)

    listing = json.loads(PROJECTS_JSON.read_text(encoding="utf-8"))

    for item in listing:
        pid = item.get("id")
        if not pid:
            continue

        detail_path = PROJECTS_DIR / f"{pid}.json"
        if not detail_path.exists():
            print(f"[WARN] {pid}: detail JSON not found, skipping")
            continue

        detail = json.loads(detail_path.read_text(encoding="utf-8"))
        featured = detail.get("featuredImage", "")
        if not featured:
            print(f"[WARN] {pid}: no featuredImage")
            continue

        # Infer image_dir from featuredImage
        image_dir = SITE_ROOT / Path(featured).parent

        # Check featured exists
        featured_path = SITE_ROOT / featured
        if not featured_path.exists():
            print(f"[ERROR] {pid}: Featured image not found: {featured}")

        # Sync gallery
        gallery_path = image_dir / "Gallery"
        gallery_list = sync_gallery(pid, gallery_path, dry_run)

        # Update detail JSON gallery[]
        if not dry_run and gallery_list != detail.get("gallery", []):
            detail["gallery"] = gallery_list
            detail_path.write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")
            print(f"  Updated gallery[] for {pid}")

        # Check diagrams (multi-unit only, warn)
        project_type = detail.get("type") or (detail.get("tags", [""])[0])
        diagrams_path = image_dir / "Diagrams"
        check_diagrams(pid, project_type, diagrams_path)

    print("\nAssets sync complete." + (" (dry-run)" if dry_run else ""))


if __name__ == "__main__":
    main()
