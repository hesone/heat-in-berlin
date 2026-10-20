"use client";

import { useId, useMemo, useState } from "react";
import type { BuildingFeature } from "@/lib/types";
import { buildingTitle } from "./labels";
import { Icon } from "./ui";

const MAX_RESULTS = 12;

/** Keyboard path to selecting a building: an ARIA combobox over addresses and OSM ids. */
export function BuildingSearch({
  buildings,
  onSelect,
}: {
  buildings: BuildingFeature[];
  onSelect: (f: BuildingFeature) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return buildings
      .filter((f) => (f.properties.addr ?? "").toLowerCase().includes(q) || f.properties.osm.toLowerCase() === q)
      .slice(0, MAX_RESULTS);
  }, [query, buildings]);
  const open = results.length > 0;

  function choose(f: BuildingFeature) {
    onSelect(f);
    setQuery("");
  }

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="sr-only">
        Find a building by address or OSM id
      </label>
      <span className="pointer-events-none absolute left-3 top-3 text-muted">
        <Icon.search />
      </span>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        className="h-10 w-full rounded-lg border border-field bg-white pl-9 pr-3 text-sm text-ink placeholder:text-muted"
        value={query}
        placeholder="Find address or OSM id"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            setQuery("");
          }
        }}
      />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-field bg-white py-1 text-sm shadow-lg"
        >
          {results.map((f, i) => (
            <li
              key={f.properties.osm}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer justify-between gap-3 px-3 py-2 ${i === active ? "bg-pv-bg" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(f);
              }}
            >
              <span>{buildingTitle(f.properties)}</span>
              <span className="font-mono text-xs text-muted">{f.properties.osm}</span>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !open && (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-field bg-white px-3 py-2 text-sm text-subtle shadow-lg">
          No matching address.
        </p>
      )}
    </div>
  );
}
