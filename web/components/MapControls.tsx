import { Icon, btn } from "./ui";

export function MapToolbar({
  drawing,
  canClear,
  onDraw,
  onView,
  onClear,
}: {
  drawing: boolean;
  canClear: boolean;
  onDraw: () => void;
  onView: () => void;
  onClear: () => void;
}) {
  return (
    <div role="toolbar" aria-label="Area analysis tools" className="flex gap-1 rounded-[10px] bg-white p-1 shadow-[0_2px_8px_rgba(16,24,40,0.16)]">
      <button
        type="button"
        aria-pressed={drawing}
        onClick={onDraw}
        className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 font-semibold ${drawing ? "bg-accent text-white" : "text-ink hover:bg-ground"}`}
      >
        <Icon.polygon />
        {drawing ? (
          <>
            Cancel<span className="hidden sm:inline"> drawing</span>
          </>
        ) : (
          <>
            Draw<span className="hidden sm:inline"> area</span>
          </>
        )}
      </button>
      <button type="button" onClick={onView} className={btn.ghost}>
        <Icon.frame />
        <span className="hidden sm:inline">Use map view</span>
        <span className="sm:hidden">Map view</span>
      </button>
      <button type="button" onClick={onClear} disabled={!canClear} className={`${btn.ghost} text-muted`}>
        Clear
      </button>
    </div>
  );
}

export function ZoomControls({ onIn, onOut, onFit }: { onIn: () => void; onOut: () => void; onFit: () => void }) {
  const cls = "flex h-11 w-11 items-center justify-center bg-white text-ink hover:bg-ground";
  return (
    <div className="flex flex-col overflow-hidden rounded-[10px] shadow-[0_2px_8px_rgba(16,24,40,0.16)] [&>button+button]:border-t [&>button+button]:border-line-soft">
      <button type="button" aria-label="Zoom in" onClick={onIn} className={cls}>
        <Icon.plus />
      </button>
      <button type="button" aria-label="Zoom out" onClick={onOut} className={cls}>
        <Icon.minus />
      </button>
      <button type="button" aria-label="Fit district" onClick={onFit} className={cls}>
        <Icon.fit />
      </button>
    </div>
  );
}
