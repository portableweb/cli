# @portableweb/cli — Claude Context

## What this is

The official CLI for creating and validating `.pweb` bundles. Published as `@portableweb/cli` on npm. Exposes two bin names: `pweb` (primary) and `portableweb` (alias).

## Tech stack

- **Language:** TypeScript (strict mode), compiled to CommonJS via `tsc`
- **Runtime:** Node.js
- **CLI framework:** Commander.js
- **ZIP handling:** `archiver` (write), `jszip` (read/validate)
- **Source:** `src/` → compiled to `dist/` (never edit `dist/` directly)

## Commands

| Command | File | What it does |
|---|---|---|
| `pweb init [dir]` | `src/commands/init.ts` | Interactive scaffold — prompts for title, author, ID, license, permissions; writes `manifest.json`, `mimetype`, `index.html`, `style.css`, `script.js` |
| `pweb pack [source] [-o output]` | `src/commands/pack.ts` | Packs a source directory into a `.pweb` ZIP; validates manifest first |
| `pweb unpack <file> [-o dir]` | `src/commands/unpack.ts` | Extracts a `.pweb` into a directory; prevents path traversal |
| `pweb validate <file>` | `src/commands/validate.ts` | Validates a `.pweb`: checks `mimetype`, `manifest.json` required fields, entry file existence |
| `pweb open <file>` | `src/commands/open.ts` | Opens a `.pweb` in the OS native webview (**macOS only** via Swift + WKWebView); compiles a Swift script on first run |

## Critical invariant: `mimetype` entry

The `mimetype` file **must be the first entry in the ZIP, stored uncompressed (no compression), with no extra fields.** This is the EPUB convention; it lets `file(1)` identify bundles by reading the first ~80 bytes. `pack.ts` enforces this via `archive.append(..., { store: true })` before adding all other files.

Do not reorder entries or apply compression to `mimetype`. This invariant is load-bearing for the file format.

## Manifest validation rules

`validate.ts` exports `loadAndValidateManifest` (used by `pack`) and `validateBundle` (used by `validate` command). Required manifest fields:

- `spec_version`, `id`, `version`, `title`, `entry`

The `id` must match reverse-domain format: `/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/`

## Build & dev workflow

```bash
npm run build      # tsc — compiles src/ → dist/
npm run dev        # tsc --watch
node dist/index.js # run locally without installing
```

To test the built CLI locally before publishing:

```bash
npm link           # makes `pweb` available globally from this checkout
pweb --help
```

## Open command: macOS / platform notes

`open` currently works on macOS only. It writes an inline Swift script to `$TMPDIR`, compiles and runs it via `swift <script>` (requires Xcode Command Line Tools), then cleans up. The bundle is extracted to a temp dir, opened in a WKWebView window, and the temp dir is cleaned up on exit.

Adding Windows/Linux support means replacing the Swift block with a platform-specific native webview approach (e.g., a bundled Electron or a WebView2 call on Windows). The platform dispatch is at `open.ts:159` (`switch (process.platform)`).

## Relation to other packages

- `portableweb` (npm) — thin redirect package that installs this CLI. See `../portableweb-redirect/`.
- The spec lives at `github.com/portableweb/spec`. The manifest shape in `init.ts` must stay in sync with `MANIFEST.md` in that repo.
