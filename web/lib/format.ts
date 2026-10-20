const LOCALE = "en-GB";

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

/** kWh/a → human-readable energy per year, switching to MWh or GWh. Rounded to 2 significant figures
 * below 100 and to whole units above, because the inputs are estimates. */
export function formatEnergyPerYear(kwh: number): string {
  const abs = Math.abs(kwh);
  if (abs >= 1e6) return `${formatNumber(kwh / 1e6, abs >= 1e8 ? 0 : 1)} GWh/a`;
  if (abs >= 1e3) return `${formatNumber(kwh / 1e3, abs >= 1e5 ? 0 : 1)} MWh/a`;
  return `${formatNumber(kwh, 0)} kWh/a`;
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2, 0)} m²`;
}

export function formatHectares(ha: number): string {
  return `${formatNumber(ha, ha < 10 ? 2 : 1)} ha`;
}

export function formatPower(kwp: number): string {
  if (kwp >= 1000) return `${formatNumber(kwp / 1000, kwp >= 100_000 ? 1 : 2)} MWp`;
  return `${formatNumber(kwp, 1)} kWp`;
}

export function formatDensity(mwhPerHa: number): string {
  return `${formatNumber(mwhPerHa, 0)} MWh/(ha·a)`;
}
