# PicSplitter Codex Handoff

Last updated: 2026-07-26

This document is the durable continuation context for another Codex instance. Read it together with the root `AGENTS.md`.

## Current state

- Local checkout: `/Users/beho/Library/CloudStorage/Dropbox/_dev_/picsplitter`
- GitHub repository: <https://github.com/ho-ben/picsplitter>
- Live app: <https://ho-ben.github.io/picsplitter/>
- Default/deployment branch: `main`
- Hosting: GitHub Pages, legacy branch deployment from `main` at `/`
- Current documented baseline commit: `7ea541e` (`Add Android home screen icon`)
- Repository visibility: public
- The worktree was clean when this handoff was written.

The project was created directly on `main`, and subsequent user-requested fixes have also been committed directly to `main`. There is no open PR-based workflow at present.

## Product intent

PicSplitter is a phone-optimized, general-purpose web app for turning collage-maker images into separate photos.

The user’s requirements, including later refinements:

1. Upload one or multiple collage images.
2. Default each collage to a 2×2 split.
3. Allow other rectangular grids, currently 1–10 rows and 1–10 columns.
4. Detect white/off-white borders and remove them.
5. Specifically detect inner “wall” separators even when the collage has no white outer border.
6. Remove lingering anti-aliased white fringe beside detected separators.
7. Export individual lossless PNGs without resizing the source pixels.
8. Allow individual downloads and a best-effort “Download all” action.
9. Keep all processing private and on-device.
10. Work well on phones and generally on desktop.
11. Use the PicSplitter icon when added to an Android home screen.

## Architecture

The app is deliberately dependency-free and build-free:

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic UI, upload input, grid controls, results area, manifest/icon links |
| `styles.css` | Responsive visual design; mobile breakpoint at 760px |
| `app.js` | File decoding, application state, preview Canvas, multi-file orchestration, PNG generation/downloads |
| `splitter.js` | Pure white-pixel classification, separator detection, edge trimming, tile rectangle calculation |
| `test/splitter.test.js` | Node unit/regression tests for the splitter |
| `manifest.webmanifest` | Android/PWA metadata and adaptive icon declarations |
| `icons/picsplitter-icon.svg` | Editable source icon |
| `icons/icon-192.png` | Android/home-screen icon |
| `icons/icon-512.png` | High-resolution/maskable Android icon |
| `.nojekyll` | Ensures GitHub Pages serves the static files directly |
| `package.json` | ESM mode plus test and local-server commands |

There is no backend, storage, service worker, bundler, framework, or package dependency.

## Runtime data flow

1. The `<input type="file" multiple accept="image/*">` or drag-and-drop supplies a `FileList`.
2. `loadFiles()` filters to image MIME types.
3. Files are decoded sequentially with `decodeFile()` to limit memory spikes on phones.
4. Each selected file becomes an in-memory item:

   ```js
   {
     file,
     image,
     imageData,
     sourceCanvas
   }
   ```

5. The first item is the preview image. Grid settings apply to every selected item.
6. `calculateGrid()` returns full-resolution source rectangles for every tile.
7. `splitImage()` copies each rectangle from the source Canvas to a new Canvas of exactly the rectangle’s dimensions.
8. `canvas.toBlob(..., "image/png")` creates a lossless PNG.
9. Object URLs populate the result cards and downloads. `revokeOutputs()` releases old URLs.

Output filenames are sanitized from the source basename and use a two-digit tile suffix:

```text
source-name-01.png
source-name-02.png
...
```

Tiles are ordered row-major: left-to-right, then top-to-bottom.

## Image-splitting algorithm

The public API is:

```js
calculateGrid(imageData, rows, columns, {
  trim: true,
  tolerance: 12,
  separatorPadding: 2
})
```

### Near-white classification

`isNearWhite()` considers transparent pixels white. For opaque pixels, every RGB channel must be at least:

```text
255 - round(tolerance / 100 × 255)
```

At the default 12% sensitivity, the channel floor is approximately 224.

### Inner separator detection

For every expected vertical or horizontal division:

1. Search around the mathematically expected divider.
2. Search radius is 38% of the nominal tile size.
3. Score every candidate row/column by the proportion of near-white pixels across the full image axis.
4. Apply a mild center bias so an equally white line nearer the expected grid position wins.
5. Require a peak score of at least `0.68`; otherwise fall back to the exact mathematical cut.
6. Expand from the peak while adjacent line scores remain at least `0.55`.
7. Treat the resulting range as the full separator band.

This full-band approach replaced an earlier midpoint-only design that left portions of inner white walls behind.

### Fringe removal

After excluding a detected inner separator band, crop an additional two source pixels from both adjacent photos (`separatorPadding: 2`). This was added because anti-aliased/off-white fringe could remain immediately beside an otherwise correctly detected separator.

The safety crop only applies beside a separator with `found: true`. It does not apply to mathematical fallback cuts.

### Outer-edge trimming

`trimWhiteEdges()` walks inward along each tile edge while a row or column is at least 98.5% near-white. It does not resize or resample pixels.

### Border removal disabled

When the checkbox is off, the algorithm uses rounded mathematical grid divisions. It does not search for bands, trim edges, or apply separator safety padding.

## Multi-file behavior

- The first selected collage is shown in the preview.
- One rows/columns/sensitivity setting applies to every selected collage.
- The UI reports both per-file and total output counts.
- Images decode sequentially to reduce peak pressure while loading.
- PNGs are still generated and held in memory, so very large images or large batches can exhaust mobile memory.
- “Download all” triggers individual browser downloads 180ms apart. Mobile browsers, particularly iOS, may ask permission or block some automatic downloads. Individual download buttons remain the reliable fallback.

## Privacy and quality guarantees

- No selected file is transmitted.
- No network API is used for processing.
- No analytics or tracking is installed.
- Input files exist only in browser memory.
- Outputs are cropped at original pixel coordinates and dimensions.
- PNG export is lossless, although an originally lossy JPEG cannot regain information it already lost.
- Metadata such as EXIF is not preserved because Canvas renders pixels only.

## UI/design decisions

- Palette:
  - Paper: `#f6f2e9`
  - Ink: `#1d2b24`
  - Accent orange: `#e95c35`
  - Green: `#315e49`
- The brand mark is a slightly rotated 2×2 grid.
- Main type uses system sans with Georgia for the editorial hero.
- The app is mobile-first and uses a single-column editor below 760px.
- The preview is capped for display performance, but splitting always uses the full-resolution source Canvas.

## Android home-screen icon

`manifest.webmanifest` declares:

- `display: "standalone"`
- `start_url` and `scope` as `./` so GitHub project-page paths remain correct
- theme/background color `#f6f2e9`
- 192×192 and 512×512 PNG icons
- icon purpose `"any maskable"`

The icon source is `icons/picsplitter-icon.svg`. Its mark has generous safe margins so Android launchers can mask it into a circle or squircle without clipping the four tiles.

`index.html` links the manifest, a PNG favicon, and an `apple-touch-icon`. A service worker is not currently used; the request was specifically for the correct Android add-to-home-screen icon, not offline support.

If testing after an icon update, remove an existing home-screen shortcut and add it again. Android/Chrome may cache manifest icons aggressively.

### Regenerating icon PNGs on this Mac

The source SVG was rendered through macOS Quick Look because the available `sips` and `ffmpeg` builds could not decode SVG directly:

```sh
qlmanage -t -s 1024 -o /tmp icons/picsplitter-icon.svg
sips -z 512 512 /tmp/picsplitter-icon.svg.png --out icons/icon-512.png
sips -z 192 192 /tmp/picsplitter-icon.svg.png --out icons/icon-192.png
```

Visually inspect `icons/icon-512.png` after regeneration.

## Tests

Current automated coverage:

1. Near-white sensitivity and transparent pixels.
2. Solid white outer-border trimming.
3. Off-center white divider detection.
4. Inner separators with no white outer border and imperfect/dirty separator pixels.
5. Two-pixel safety crop beside detected separators.
6. Exact equal divisions when border trimming is disabled.

Normal commands:

```sh
npm test
npm run serve
```

In the Codex desktop environment used to build this project, `npm` was not on `PATH`. The bundled runtime worked:

```sh
/Users/beho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test
/Users/beho/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173
```

The local server may require sandbox escalation because binding a localhost port can be blocked.

Useful pre-commit checks:

```sh
/Users/beho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app.js
/Users/beho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test
git diff --check
git status -sb
```

### Manual test images used previously

The repository intentionally contains no sample images. Existing workspace images were used only for local browser testing:

```text
/Users/beho/Library/CloudStorage/Dropbox/_dev_/picsplit/test.png
/Users/beho/Library/CloudStorage/Dropbox/_dev_/picsplit/test2.png
```

A two-file browser test successfully created eight result cards:

```text
test-01.png ... test-04.png
test2-01.png ... test2-04.png
```

No browser console warnings or errors came from the app during that flow.

## Deployment and verification

GitHub CLI account: `ho-ben`

Remote:

```text
origin  https://github.com/ho-ben/picsplitter.git
```

GitHub Pages is configured through the repository root on `main`. A normal publish flow is:

```sh
git status -sb
git diff --check
git add <only in-scope files>
git commit -m "<terse description>"
git push origin main
```

GitHub Pages usually rebuilds after a push, but this repository’s legacy Pages build has occasionally reported or rebuilt an older commit. If necessary, explicitly trigger it:

```sh
gh api --method POST repos/ho-ben/picsplitter/pages/builds
```

Then confirm the latest build uses the pushed commit:

```sh
gh api repos/ho-ben/picsplitter/pages/builds/latest \
  --jq '{status: .status, commit: .commit, error: .error.message}'
```

Do not report deployment complete until:

- `status` is `built`
- `commit` matches `git rev-parse HEAD`
- relevant live files return HTTP 200
- the live asset contains a recognizable marker from the new implementation

Cache-bust verification requests with the commit hash:

```sh
curl --fail --silent --show-error \
  "https://ho-ben.github.io/picsplitter/app.js?v=$(git rev-parse --short HEAD)"
```

GitHub Pages may cache assets for up to 10 minutes. User-facing testing instructions should recommend a refresh; manifest/icon changes may require removing and re-adding the Android shortcut.

## Commit history and rationale

- `01986b8` — initial mobile-first static app, basic 2×2/general grids, PNG output, and border detection.
- `03d1d9d` — changed inner-divider handling from midpoint-only detection to full separator bands.
- `f2f18df` — added the two-pixel anti-alias safety crop and multi-file upload/splitting.
- `7ea541e` — added Android manifest and adaptive home-screen icons.

## Known limitations and likely future work

- All files and outputs live in memory; there is no batch-size or megapixel guard.
- The separator detector assumes a roughly regular grid and searches near expected divisions.
- The same grid/sensitivity settings apply to every file in a batch.
- White-heavy photos can be intrinsically ambiguous with white borders. Outer-edge trimming uses a strict 98.5% threshold to reduce accidental cropping.
- The fixed two-pixel inner padding is intentionally conservative but still removes two real pixels beside a detected wall.
- Browser multi-download behavior varies; no ZIP archive is generated.
- The app does not preserve EXIF or other source metadata.
- There is no offline service worker.
- There are no automated browser/E2E tests or CI workflow; browser behavior has been verified manually.

When changing border detection, prefer adding a synthetic regression image in `test/splitter.test.js` before tuning thresholds. Avoid fixing one supplied collage by hard-coding its dimensions or exact divider positions.

## Safe next-step checklist

1. Read `AGENTS.md` and this file.
2. Check `git status -sb` and preserve unrelated changes.
3. Reproduce the reported behavior with a synthetic unit test or a local user-provided image.
4. Keep pure geometry/pixel changes in `splitter.js`.
5. Run syntax checks, unit tests, and proportionate browser verification.
6. Commit only the intended files.
7. Push `main`, trigger/check Pages, and verify the live asset.
8. Report the live URL, commit hash, tests, and any remaining limitation.
