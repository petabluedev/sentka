// src/components/tables/LoadRow.tsx
export default function LoadRow({
  pickupCity,
  dropoffCity,
  vehicle,
  bodyType,
  enclosed,
  priceCents,
  distance,
}: any) {
  return (
    <div className="grid grid-cols-[1fr_1fr_120px_120px_110px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="truncate">
        <div className="font-medium text-slate-900">{pickupCity}</div>
        <div className="text-xs text-slate-500">Pickup</div>
      </div>
      <div className="truncate">
        <div className="font-medium text-slate-900">{dropoffCity}</div>
        <div className="text-xs text-slate-500">Dropoff</div>
      </div>
      <div className="truncate text-sm text-slate-700">
        {vehicle ?? "—"} <span className="text-slate-400">·</span> {bodyType ?? "—"}
        {enclosed ? <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">Enclosed</span> : null}
      </div>
      <div className="text-sm text-slate-700">{distance ? `${distance} mi` : "—"}</div>
      <div className="text-right text-base font-semibold text-slate-900">${(priceCents / 100).toFixed(0)}</div>
    </div>
  );
}
