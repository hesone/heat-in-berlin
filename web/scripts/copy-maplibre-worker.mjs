// MapLibre 6 locates its web worker relative to import.meta.url, which does not survive bundling.
// Copy the worker shipped with the installed maplibre-gl into public/ so it is served at a fixed URL
// (see setWorkerUrl in components/MapView.tsx). Runs before dev/build, so it always matches the package version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const out = new URL("../public/maplibre/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));
console.log("copied maplibre-gl-worker.mjs to public/maplibre/");
