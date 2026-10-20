import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BuildingSearch } from "@/components/BuildingSearch";
import type { BuildingFeature } from "@/lib/types";

const mk = (osm: string, addr: string | null) => ({ type: "Feature", id: 1, geometry: null, properties: { osm, addr } }) as unknown as BuildingFeature;

describe("BuildingSearch", () => {
  it("selects a building with the keyboard only", async () => {
    const onSelect = vi.fn();
    render(<BuildingSearch buildings={[mk("w1", "Kantstraße 1"), mk("w2", "Kantstraße 2"), mk("w3", null)]} onSelect={onSelect} />);
    const box = screen.getByRole("combobox", { name: /find a building/i });
    await userEvent.type(box, "kant");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ properties: { osm: "w2", addr: "Kantstraße 2" } }));
  });

  it("reports when nothing matches", async () => {
    render(<BuildingSearch buildings={[mk("w1", "Kantstraße 1")]} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText("No matching address.")).toBeInTheDocument();
  });
});
