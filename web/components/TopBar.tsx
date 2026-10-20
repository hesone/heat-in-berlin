import Link from "next/link";
import type { BuildingFeature, DataMode } from "@/lib/types";
import { BuildingSearch } from "./BuildingSearch";
import { Logo } from "./ui";

export type Layer = "buildings" | "hexagons";

export function LayerSwitch({ layer, onChange }: { layer: Layer; onChange: (l: Layer) => void }) {
  const opts: [Layer, string][] = [
    ["buildings", "Buildings"],
    ["hexagons", "Heat-density grid"],
  ];
  return (
    <fieldset className="flex rounded-[10px] bg-chip p-[3px]">
      <legend className="sr-only">Map layer</legend>
      {opts.map(([value, label]) => (
        <label
          key={value}
          className={`flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
            layer === value ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-muted hover:text-ink"
          }`}
        >
          <input type="radio" name="layer" value={value} checked={layer === value} onChange={() => onChange(value)} className="sr-only" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

export function TopBar({
  district,
  layer,
  onLayer,
  mode,
  buildings,
  onSearchSelect,
}: {
  district: string;
  layer: Layer;
  onLayer: (l: Layer) => void;
  mode: DataMode;
  buildings: BuildingFeature[];
  onSearchSelect: (f: BuildingFeature) => void;
}) {
  return (
    <header className="z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-2.5 md:px-5">
      <div className="flex items-center gap-2.5">
        <Logo />
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight">Heat in Berlin</span>
          <span className="hidden text-xs text-muted sm:inline">Heat-planning map</span>
        </div>
      </div>
      <div className="flex h-10 items-center rounded-lg border border-field px-3 text-sm font-semibold max-sm:h-8 max-sm:border-0 max-sm:bg-chip" title="Ortsteil">
        {district}
      </div>
      <LayerSwitch layer={layer} onChange={onLayer} />
      <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-[200px] sm:max-w-[420px] sm:flex-[1_1_260px]">
        <BuildingSearch buildings={buildings} onSelect={onSearchSelect} />
      </div>
      <div className="ml-auto flex items-center gap-3.5 text-sm">
        <span
          className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-chip px-2.5 text-xs font-medium text-subtle max-sm:hidden"
          data-testid="data-mode"
        >
          <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${mode === "api" ? "bg-ok-fg" : "bg-[#6b7280]"}`} />
          {mode === "api" ? "Live API" : "Static demo data"}
        </span>
        <Link href="/methodology" className="font-medium">
          Methodology
        </Link>
      </div>
    </header>
  );
}
