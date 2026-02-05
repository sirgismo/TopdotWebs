---
name: SheetsToProjectsPipeline
overview: "Implement a clean, Sheets-driven pipeline for projects: CSV exports in-repo compile to JSON, a separate assets sync script normalizes/renames gallery images and updates gallery lists, and a validator + change report prevents accidental breakage before deploy."
todos:
  - id: define-sheet-contract
    content: Create Google Sheet tabs/headers and export CSVs into topdotSite/data/sheets/
    status: completed
  - id: implement-sheets-compiler
    content: Implement sheets_to_projects_json.py to generate projects.json + per-project JSON, plus manifest + change report
    status: completed
  - id: implement-assets-sync
    content: Implement sync_project_assets.py to enforce Featured/Gallery conventions, rename gallery images to 01..NN, and update gallery[]
    status: completed
  - id: implement-validator
    content: Implement validate_site.py to catch missing JSON/images/spec schema issues before deploy
    status: completed
  - id: document-workflow
    content: Add a short README section describing monthly update workflow + commands
    status: completed
isProject: false
---

## Goal

- Make adding/updating projects require **only** editing one Google Spreadsheet + dropping images into folders.
- Generate the JSON your site already consumes:
- `topdotSite/data/projects.json`
- `topdotSite/data/projects/<id>.json`
- Keep implementation clean by separating responsibilities:
- **Data compiler** (Sheets → JSON)
- **Assets sync** (folders/images ordering + gallery list)
- **Validator** (read-only pre-deploy checks)

## Decisions locked in

- **Sheets ingest (v1)**: manual CSV exports committed to repo under `topdotSite/data/sheets/`.
- **Gallery ordering**: assets script renames to `01..NN` and **keeps original extension**.
- **Visibility**: single `status` field (e.g. `draft`, `coming-soon`, `published`). Export includes/excludes based on status.
- **Specs visibility**: use `show_on` to generate `specs[].showOn` (`list`, `detail`, `list|detail`). Listing UI may ignore specs for now.

## Sheet structure (one spreadsheet, multiple tabs)

Create one Google Spreadsheet with these tabs and exact headers.

### `Projects` tab (1 row per project)

- Required columns
- `id`: stable id like `cr01`, `ai03`, `muc05`
- `name`
- `type`: single slug used for filtering (e.g. `custom-residential`)
- `status`: `draft|coming-soon|published`
- `image_dir`: e.g. `images/projectsImages/customResidential/cr01/`
- Recommended columns
- `tags`: comma-separated slugs. Start with same as `type` but allows multi-tag later.
- `year`
- `location`
- `featured_ext`: default `jpg` (allows `png` for drawings)
- `sort_priority`: optional number (pin/sort control)

### `ProjectDescriptions` tab (long format)

- `project_id`
- `order` (1,2,3...)
- `text`

### `SpecDefinitions` tab (templates by type)

- `type`
- `key` (stable machine key)
- `label` (display)
- `show_on` (`detail`, `list`, `list|detail`)
- `order` (number)
- `required` (TRUE/FALSE)

### `ProjectSpecs` tab (values)

- **Recommended (wide/table format)**: one row per project, columns are spec keys.
  - `project_id`
  - `<spec_key_1>` (e.g. `location`)
  - `<spec_key_2>` (e.g. `lot_size`)
  - ...
- **Also supported (long format)**: one row per value (legacy-friendly).
  - `project_id`
  - `key`
  - `value`

## Initial spec templates (starter set)

Seed `SpecDefinitions` with a minimal, broadly useful set. You can expand later without changing code.

- `custom-residential`
- `location` (detail)
- `year` (detail)
- `type` (detail)
- `multi-unit`
- `location` (detail)
- `year` (detail)
- `units` (detail)
- `program` (detail)
- `commercial`
- `location` (detail)
- `year` (detail)
- `program` (detail)
- `mixed-use`
- `location` (detail)
- `year` (detail)
- `program` (detail)
- `art-installation`
- `location` (detail)
- `year` (detail)
- `client` (detail, optional)
- `interior-retrofit`
- `location` (detail)
- `year` (detail)
- `scope` (detail)

(Exact set can be adjusted before you start populating.)

## Repo layout changes (new tooling)

Add a dedicated pipeline folder:

- `topdotSite/tools/pipeline/`
- `sheets_to_projects_json.py` (Sheets CSV → JSON compiler)
- `sync_project_assets.py` (folder + image ordering/renaming + gallery list update)
- `validate_site.py` (read-only validation + report)

Add a data export folder:

- `topdotSite/data/sheets/` (CSV exports committed)

Add build metadata:

- `topdotSite/data/_build-manifest.json` (hashes, timestamps)
- `topdotSite/data/_change-report.txt` (human-readable diff summary)

## Script 1: Sheets → JSON compiler (`sheets_to_projects_json.py`)

Responsibilities:

- Read CSVs from `topdotSite/data/sheets/`.
- Build in-memory project objects.
- Apply visibility:
- include `published` (and optionally `coming-soon`, depending on your UX)
- exclude `draft`
- Produce listing entries:
- `id`, `name`, `slug`
- `year`
- `tags[]` (split/trim `tags` or fallback to `[type]`)
- `thumbnail` = `image_dir + 'Featured.' + featured_ext`
- `status`
- `href` = `project.html?id=<id>` (canonical)
- `detailJson` = `data/projects/<id>.json`
- Produce detail JSON:
- `featuredImage` = same as thumbnail
- `description[]` from `ProjectDescriptions`
- `specs[]` via join of `SpecDefinitions` + `ProjectSpecs`
- emit only non-empty values
- map `show_on` to `showOn: ['detail']` etc.
- `gallery[]` left as-is if already present, or empty if missing (assets sync will fill)
- Write manifest + change report:
- manifest stores a hash per project JSON payload + listing hash
- change report compares previous manifest and prints what changed

## Script 2: Assets sync (`sync_project_assets.py`)

Responsibilities (filesystem-focused, deterministic):

- For each non-draft project from `data/projects.json`:
- Ensure `image_dir` exists.
- Ensure `Featured.<ext>` exists (warn/error).
- Ensure `Gallery/` exists.
- Collect images in `Gallery/` (jpg/jpeg/png/gif/webp).
- Sort deterministically (case-insensitive filename).
- Rename sequentially to `01..NN` while keeping extension.
- Update `gallery[]` in `data/projects/<id>.json` to match folder contents.
- Support `--dry-run` to print planned renames without changing files.

## Script 3: Validation (`validate_site.py`)

Responsibilities (read-only checks):

- Verify for each listing item:
- `detailJson` exists
- `thumbnail` exists
- Verify for each detail JSON:
- `featuredImage` exists
- each `gallery[]` file exists
- specs conform to schema (key/label/value/showOn/order)
- Output:
- summary counts
- error list
- non-zero exit code on any error (so you never deploy a broken build)

## Human workflow: add a new project

- Add row in `Projects` with `status=draft`, fill `image_dir`.
- Add description rows in `ProjectDescriptions`.
- Add spec rows in `ProjectSpecs` (keys must exist in `SpecDefinitions` for that type).
- Create folders:
- `<image_dir>/Featured.<ext>`
- `<image_dir>/Gallery/` and drop images (any names)
- Run:
- `python topdotSite/tools/pipeline/sheets_to_projects_json.py`
- `python topdotSite/tools/pipeline/sync_project_assets.py`
- `python topdotSite/tools/pipeline/validate_site.py`
- Flip `status` to `published` and rerun scripts.
- Upload `topdotSite/` to host.

## Integration notes / guardrails

- Keep listing UI simple: even if `showOn=list` exists, listing renderer can show none or only the first 1–2 by `order`.
- Use Google Sheets data validation on `status` and `type` to prevent typos.
- Keep `SpecDefinitions` tab protected if you want to avoid accidental template edits.