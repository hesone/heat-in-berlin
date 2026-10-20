import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Legend } from "@/components/Legend";
import { HEAT_CLASSES, bandFor, heatClassFor, heatClassIndex } from "@/lib/legend";
import { META } from "./fixtures/meta";

const bands = META.benchmarks.heat_density_bands;

describe("Legend (buildings)", () => {
  it("announces every heat class as text with units, plus the not-estimated entry", () => {
    render(<Legend layer="buildings" bands={bands} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(HEAT_CLASSES.length);
    expect(items[0]).toHaveTextContent("under 50 MWh/a");
    expect(items[5]).toHaveTextContent("800 and more MWh/a");
    expect(screen.getByText(/not estimated/i)).toBeInTheDocument();
    expect(screen.getByText(/estimate/, { selector: "span" })).toBeInTheDocument();
  });

  it("marks the selected building's class on the ramp", () => {
    const { rerender } = render(<Legend layer="buildings" bands={bands} />);
    expect(screen.queryByTestId("legend-marker")).toBeNull();
    rerender(<Legend layer="buildings" bands={bands} markerKwh={258_240} />);
    // 258 MWh/a is class index 3 (200–400): centre of the 4th of 6 segments
    expect(screen.getByTestId("legend-marker")).toHaveStyle({ left: `${(3.5 / 6) * 100}%` });
    expect(screen.getByText("Marker: the selected building")).toBeInTheDocument();
  });
});

describe("Legend (hexagons)", () => {
  it("shows the five bands with ranges and the boundary note", () => {
    render(<Legend layer="hexagons" bands={bands} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent("0–70");
    expect(items[4]).toHaveTextContent("1,050+");
    expect(items[4]).toHaveTextContent("Very high");
    expect(items[5]).toHaveTextContent(/cut by the district boundary/i);
  });
});

describe("class lookup", () => {
  it("maps kWh/a to heat classes with lower-inclusive edges", () => {
    expect(heatClassFor(null)).toBeNull();
    expect(heatClassFor(49_999)!.label).toBe("under 50");
    expect(heatClassFor(50_000)!.label).toBe("50 – 100");
    expect(heatClassFor(5_000_000)!.label).toBe("800 and more");
    expect(heatClassIndex(399_999)).toBe(3);
  });

  it.each([
    [0, "none"],
    [69.9, "none"],
    [70, "new_build"],
    [415, "conventional"],
    [1050, "very_high"],
  ])("density %d falls in band %s", (d, id) => {
    expect(bandFor(d, bands).id).toBe(id);
  });
});
