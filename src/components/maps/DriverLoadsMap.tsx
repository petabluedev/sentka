"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

type LoadMarker = {
  id: string;
  lane: string;
  pay: number;
  miles: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
};

type Props = {
  loads: LoadMarker[];
  driverLocation?: { lat: number; lng: number } | null;
};

const fallbackCenter: [number, number] = [39.8283, -98.5795];

export default function DriverLoadsMap({ loads, driverLocation }: Props) {
  const markers = useMemo(
    () => loads.filter((l) => l.pickupLat != null && l.pickupLng != null),
    [loads]
  );

  const center: [number, number] = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : markers.length
    ? [markers[0].pickupLat as number, markers[0].pickupLng as number]
    : fallbackCenter;

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} zoom={driverLocation ? 7 : 4} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((load) => (
          <CircleMarker
            key={load.id}
            center={[load.pickupLat as number, load.pickupLng as number]}
            radius={8}
            pathOptions={{ color: "#0f172a", fillColor: "#38bdf8", fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{load.lane}</div>
                <div>${load.pay} · {load.miles} mi</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
