# PicSplitter

A private, mobile-first web app that turns a collage into separate, full-resolution PNG images.

## Features

- Defaults to a 2×2 collage and supports grids from 1×1 to 10×10
- Accepts multiple collages at once and applies the selected grid to every file
- Detects white and off-white outer borders and internal separators
- Adds a two-pixel safety crop beside detected separators to remove anti-aliased fringe
- Crops borders without resizing or recompressing the source pixels
- Exports lossless PNG files at each tile's original pixel dimensions
- Processes everything locally in the browser—no server, account, or tracking
- Works as a static site on GitHub Pages

## Run locally

```sh
npm test
npm run serve
```

Then open <http://localhost:4173>.

## How border detection works

PicSplitter samples pixel rows and columns around the expected grid divisions, locates white separator bands, and then trims near-white rows and columns from every tile's four edges. The sensitivity control adjusts how close a pixel must be to white. Switching border removal off produces mathematically even grid divisions.

## Privacy

Images are decoded and processed with the browser Canvas API. They never leave the device.

## Deployment

The repository is configured for GitHub Pages using the `main` branch root.
