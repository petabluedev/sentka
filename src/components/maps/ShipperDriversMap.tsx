"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

type DriverMarker = {
  id: string;
  name: string;
  status: "ONLINE" | "ON_TRIP" | "PAUSED";
  lat: number;
  lng: number;
  lastSeenAt?: string | null;
};

type Props = {
  drivers: DriverMarker[];
};

const fallbackCenter: [number, number] = [39.8283, -98.5795];

function statusColor(status: DriverMarker["status"]) {
  if (status === "ONLINE") return "#22c55e";
  if (status === "ON_TRIP") return "#f59e0b";
  return "#94a3b8";
}

export default function ShipperDriversMap({ drivers }: Props) {
  const markers = useMemo(() => drivers, [drivers]);
  const center: [number, number] = markers.length
    ? [markers[0].lat, markers[0].lng]
    : fallbackCenter;

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} zoom={markers.length ? 6 : 4} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((driver) => (
          <CircleMarker
            key={driver.id}
            center={[driver.lat, driver.lng]}
            radius={7}
            pathOptions={{ color: "#0f172a", fillColor: statusColor(driver.status), fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{driver.name}</div>
                <div>Status: {driver.status}</div>
                {driver.lastSeenAt ? <div>Last seen: {new Date(driver.lastSeenAt).toLocaleTimeString()}</div> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
