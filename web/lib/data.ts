/** Data access. With NEXT_PUBLIC_API_URL set, the Django API is used and the static files are the
 * fallback; without it (e.g. the Vercel demo) everything comes from /data/*.json. */
import { analyseLocally } from "./analysis";
import type { AnalysisResult, AreaGeometry, BuildingCollection, DataMode, HexCollection, Meta } from "./types";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 4000;

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new HttpError(r.status, (body as { error?: string }).error ?? r.statusText);
    }
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface WithMode<T> {
  data: T;
  mode: DataMode;
}

async function apiOrStatic<T>(apiPath: string, staticPath: string): Promise<WithMode<T>> {
  if (API) {
    try {
      return { data: await getJson<T>(`${API}${apiPath}`), mode: "api" };
    } catch (err) {
      console.warn(`[waerme] API unavailable (${String(err)}), using static data`);
    }
  }
  return { data: await getJson<T>(staticPath), mode: "static" };
}

export const fetchMeta = () => apiOrStatic<Meta>("/api/meta", "/data/meta.json");
export const fetchHexagons = () => apiOrStatic<HexCollection>("/api/hexagons", "/data/hexagons.geojson");
export const fetchBuildings = (bbox: [number, number, number, number]) =>
  apiOrStatic<BuildingCollection>(`/api/buildings?bbox=${bbox.join(",")}`, "/data/buildings.geojson");

/** Turn validation messages from either implementation into something a planner can act on. */
export function humaniseAnalysisError(message: string): string {
  if (/larger than/i.test(message)) return "This area is too large to analyse (maximum 2,000 ha). Zoom in or draw a smaller area.";
  if (/not valid|self-intersect/i.test(message)) return "The drawn outline crosses itself. Draw the corners in order around the area.";
  if (/empty/i.test(message)) return "The drawn area is empty. Add at least three corners.";
  return `The area could not be analysed: ${message}`;
}

export async function analyseArea(
  polygon: AreaGeometry,
  ctx: { mode: DataMode; buildings: BuildingCollection; meta: Meta },
): Promise<WithMode<AnalysisResult>> {
  if (API && ctx.mode === "api") {
    try {
      const data = await getJson<AnalysisResult>(`${API}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(polygon),
      });
      return { data, mode: "api" };
    } catch (err) {
      if (err instanceof HttpError && err.status === 400) throw err; // invalid polygon: report, don't mask
      console.warn(`[waerme] analyse API failed (${String(err)}), computing in the browser`);
    }
  }
  return { data: analyseLocally(polygon, ctx.buildings.features, ctx.meta.benchmarks), mode: "static" };
}
