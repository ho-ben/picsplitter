# Codex Instructions for PicSplitter

Read [docs/CODEX_HANDOFF.md](docs/CODEX_HANDOFF.md) before changing this project. It contains the product requirements, architecture, image-splitting algorithm, deployment details, validation history, and known tradeoffs.

## Non-negotiable product requirements

- Keep the app mobile-first while retaining a good desktop layout.
- Keep all image processing local to the browser. Do not add uploads, analytics, accounts, tracking, or a backend.
- Preserve source pixels: crop with Canvas and export lossless PNGs; never resize the output tiles.
- Default to a 2×2 grid and keep the 1–10 row/column controls.
- Support selecting or dropping multiple collages and apply the current grid settings to every selected file.
- Detect and remove white/off-white outer borders and inner separator walls, including anti-aliased fringe.
- Preserve Android home-screen support through `manifest.webmanifest` and the maskable 192px/512px icons.

## Engineering conventions

- This is intentionally a dependency-free static site. Prefer plain HTML, CSS, and browser JavaScript over adding a framework or build step.
- Keep the pure pixel/grid logic in `splitter.js`; UI and Canvas orchestration belong in `app.js`.
- Add or update Node tests in `test/splitter.test.js` for every algorithm change.
- Avoid committing sample/user images. Existing manual test images live outside this repository.
- Run `npm test` when npm is available. In the Codex desktop environment, npm may be absent; use the bundled Node executable documented in the handoff.
- Run `git diff --check` before committing.
- Deploy from `main` at the repository root through GitHub Pages. Verify the deployed commit, not only the local files.

## Publishing

The user expects completed changes to reach the live app unless they explicitly request local-only work. Commit only in-scope files, push `main`, trigger/check the GitHub Pages build, and verify the changed live assets.
