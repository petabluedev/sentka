type LoadProps = {
  pickupCity: string;
  dropoffCity: string;
  priceCents: number;
  vehicle?: string;
  vehicleType?: string;   // e.g. "SEDAN" | "SUV" | ...
  enclosed?: boolean;
  operable?: boolean;
  distance?: number | null;
};

export default function LoadCard({
  pickupCity,
  dropoffCity,
  priceCents,
  vehicle,
  vehicleType,
  enclosed,
  operable = true,
  distance,
}: LoadProps) {
  return (
    <div className="border rounded-lg p-3 bg-white flex items-center justify-between">
      <div>
        <div className="font-semibold">
          {pickupCity} → {dropoffCity}
        </div>
        <div className="text-xs text-gray-600">
          {vehicleType ? `${vehicleType}` : null}
          {vehicleType && vehicle ? " • " : null}
          {vehicle ? vehicle : null}
          {enclosed ? " • Enclosed" : ""}
          {operable === false ? " • Inoperable" : ""}
          {typeof distance === "number" ? ` • ${distance} mi` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold">${(priceCents / 100).toFixed(2)}</div>
        <div className="text-[11px] text-gray-500">all-in</div>
      </div>
    </div>
  );
}
