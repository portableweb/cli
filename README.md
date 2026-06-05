# @portableweb/cli

Official CLI for creating, packing, validating, and opening `.pweb` bundles.

```bash
npm install -g @portableweb/cli
```

Or via the friendly aliases:

```bash
npm install -g portableweb   # installs both `pweb` and `portableweb` commands
```

---

## Commands

### `pweb init [dir]`

Scaffold a new `.pweb` project interactively. Prompts for title, author, ID, and permissions, then writes `manifest.json`, `mimetype`, `index.html`, `style.css`, and `script.js`.

```bash
pweb init                  # scaffold in current directory
pweb init my-bundle        # scaffold in ./my-bundle
```

---

### `pweb pack [source] [-o output]`

Pack a source directory into a `.pweb` bundle. Validates `manifest.json` before packing. The `mimetype` file is written as the first ZIP entry, uncompressed — required by the spec for file identification.

```bash
pweb pack                              # pack current directory
pweb pack ./my-bundle                  # pack a specific directory
pweb pack ./my-bundle -o hello.pweb   # specify output file name
```

---

### `pweb unpack <file> [-o dir]`

Extract a `.pweb` bundle into a directory.

```bash
pweb unpack hello.pweb                 # extracts to ./hello/ 
pweb unpack hello.pweb -o ./output    # extract to a specific directory
```

---

### `pweb validate <file>`

Validate a `.pweb` bundle against the spec. Checks:
- `mimetype` is the first ZIP entry
- `manifest.json` exists and contains all required fields (`spec_version`, `id`, `version`, `title`, `entry`)
- The declared entry file exists inside the bundle

```bash
pweb validate hello.pweb
```

---

### `pweb open-lite <file>`

Open a `.pweb` bundle in a native WKWebView window. **macOS only** — requires Xcode Command Line Tools (`xcode-select --install`). Compiles a Swift viewer on first run (takes a few seconds); subsequent opens are instant.

```bash
pweb open-lite hello.pweb
```

For a full cross-platform viewer with file association support and a home screen, see [portableweb/viewer](https://github.com/portableweb/viewer).

---

## The `.pweb` format

A `.pweb` file is a ZIP archive containing:

| File | Required | Description |
|---|---|---|
| `mimetype` | Yes | Must be first entry, uncompressed. Contains `application/vnd.portableweb+zip` |
| `manifest.json` | Yes | Bundle metadata and permissions |
| `index.html` | Yes (default entry) | Entry HTML file declared in manifest |

See the [spec](https://github.com/portableweb/spec) for full format details.

---

## Development

```bash
git clone https://github.com/portableweb/cli
cd cli
npm install
npm run build       # compile TypeScript → dist/
npm link            # make `pweb` available globally from this checkout
npm run dev         # watch mode
```

## License

MIT — see [LICENSE](LICENSE).

## Trademark

PortableWeb™ is claimed as a trademark by the PortableWeb project creator.

The .pweb file format is intended to be an open specification.

Use of the name PortableWeb must not imply endorsement, certification, or official status unless authorized.

Truthful statements such as "supports .pweb files" are permitted.
