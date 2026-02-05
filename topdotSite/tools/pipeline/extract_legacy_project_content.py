"""
Extract project location + description paragraphs from legacy HTML files.

This is a helper for backfilling Sheets CSVs while migrating from legacy
per-project HTML pages to JSON-driven pages.

It reads legacy HTML from git (so it works even if the files are deleted
from the working tree) and prints a JSON payload to stdout.

Usage (from repo root):
  python topdotSite/tools/pipeline/extract_legacy_project_content.py --ids cr07 muc01

Or infer all ids from Projects.csv:
  python topdotSite/tools/pipeline/extract_legacy_project_content.py --from-projects-csv
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional


SITE_ROOT = Path(__file__).resolve().parents[2]
SHEETS_DIR = SITE_ROOT / "data" / "sheets"


@dataclass(frozen=True)
class LegacyContent:
    legacy_path: str
    location: str
    paragraphs: List[str]


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)


def legacy_path_for_id(project_id: str) -> Optional[str]:
    pid = project_id.strip()
    if not pid:
        return None
    if pid.startswith("cr"):
        return f"topdotSite/Projects/CustomResidential/{pid}.html"
    if pid.startswith("muc"):
        return f"topdotSite/Projects/MultiUnit-Commercial-MixedUse/{pid}.html"
    if pid.startswith("ai"):
        return f"topdotSite/Projects/ArtInstallation/{pid}.html"
    return None


def git_show(path: str) -> Optional[str]:
    try:
        raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=SITE_ROOT.parent)
    except Exception:
        return None
    return raw.decode("utf-8", errors="replace")


def extract_from_html_text(html_text: str) -> tuple[str, List[str]]:
    # Location is rendered as a subtitle <h2 class="post-subtitle">...</h2>
    loc = ""
    m = re.search(r'<h2[^>]*class="post-subtitle"[^>]*>(.*?)</h2>', html_text, flags=re.I | re.S)
    if m:
        loc = html.unescape(_strip_tags(m.group(1))).strip()

    # Description paragraphs appear in <div class="post-RightContainer"> ... <p>...</p> ...
    block = ""
    m = re.search(r'<div[^>]*class="post-RightContainer"[^>]*>([\s\S]*?)</div>', html_text, flags=re.I)
    if m:
        block = m.group(1)

    paras: List[str] = []
    for pm in re.findall(r"<p[^>]*>(.*?)</p>", block, flags=re.I | re.S):
        cleaned = html.unescape(_strip_tags(pm))
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            paras.append(cleaned)

    return loc, paras


def load_ids_from_projects_csv() -> List[str]:
    path = SHEETS_DIR / "Projects.csv"
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    ids = []
    for r in rows:
        pid = (r.get("id") or "").strip()
        if pid:
            ids.append(pid)
    return ids


def extract(project_ids: Iterable[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for pid in project_ids:
        legacy_path = legacy_path_for_id(pid)
        if not legacy_path:
            continue
        html_text = git_show(legacy_path)
        if html_text is None:
            continue
        loc, paras = extract_from_html_text(html_text)
        out[pid] = {
            "legacyPath": legacy_path,
            "location": loc,
            "paragraphs": paras,
            "paragraphCount": len(paras),
        }
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="*", default=[], help="Project ids to extract (e.g. cr07 muc01 ai04).")
    ap.add_argument(
        "--from-projects-csv",
        action="store_true",
        help="Infer ids from topdotSite/data/sheets/Projects.csv",
    )
    args = ap.parse_args()

    ids = list(args.ids)
    if args.from_projects_csv:
        ids = load_ids_from_projects_csv()

    data = extract(ids)
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

