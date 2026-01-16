"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { vehicleOptions } from "@/data/vehicles";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = typeof window !== "undefined" && publishableKey ? loadStripe(publishableKey) : null;
const corridorCities = ["Dallas", "Atlanta", "Houston", "San Antonio", "Austin"];
const vehicleYears = Array.from({ length: 16 }, (_, idx) => `${2025 - idx}`); // 2025-2010
const fieldClass = "border p-2 rounded h-11 w-full";

type CreatedLoad = {
  id: string;
  pickupCity: string;
  dropoffCity: string;
  priceCents: number;
  vehicleType?: string;
  enclosed?: boolean;
};

export default function PostLoadForm() {
  const [pickupCity, setPickupCity] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMakeModel, setVehicleMakeModel] = useState("");
  const [customVehicle, setCustomVehicle] = useState("");
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [vehicleType, setVehicleType] = useState("SEDAN");
  const [enclosed, setEnclosed] = useState(false);
  const [price, setPrice] = useState(""); // USD

  const [createdLoad, setCreatedLoad] = useState<CreatedLoad | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const priceNumber = Number(price);
  const vehicleCombined = (customVehicle || [vehicleYear, vehicleMakeModel].filter(Boolean).join(" ")).trim();
  const showCustomVehicle = vehicleMakeModel === "OTHER";
  const filteredVehicles = useMemo(() => {
    const q = vehicleSearchInput.trim().toLowerCase();
    if (!q) return vehicleOptions;
    return vehicleOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [vehicleSearchInput]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickupCity || !dropoffCity || !priceNumber) {
      alert("Pickup, Dropoff, and Price are required.");
      return;
    }
    const res = await fetch(apiUrl("/api/loads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupCity,
        dropoffCity,
        vehicle: vehicleCombined,
        vehicleType,
        enclosed,
        price, // USD; API will convert to cents
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      alert(j.error || "Failed to post");
      return;
    }
    const load = (await res.json()) as CreatedLoad;
    setCreatedLoad(load);
    setPaying(true);
    const intent = await fetch(apiUrl("/api/payments/intent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loadId: load.id,
        amountCents: Math.round(priceNumber * 100),
        currency: "usd",
      }),
    });
    if (!intent.ok) {
      const j = await intent.json().catch(() => ({} as any));
      alert(j.error || "Could not start payment");
      setPaying(false);
      return;
    }
    const data = await intent.json();
    setClientSecret(data.clientSecret);
  }

  function resetForm() {
    setPickupCity("");
    setDropoffCity("");
    setVehicleYear("");
    setVehicleMakeModel("");
    setCustomVehicle("");
    setVehicleSearchInput("");
    setPrice("");
    setEnclosed(false);
    setVehicleType("SEDAN");
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3 border rounded p-4 bg-white">
        <div className="font-semibold">Post & Pay for a Load</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select className={fieldClass} value={pickupCity} onChange={(e) => setPickupCity(e.target.value)}>
            <option value="">Pickup city</option>
            {corridorCities.map((city) => (
              <option key={`pickup-${city}`} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={dropoffCity} onChange={(e) => setDropoffCity(e.target.value)}>
            <option value="">Dropoff city</option>
            {corridorCities.map((city) => (
              <option key={`dropoff-${city}`} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="space-y-2">
            <input
              className={fieldClass}
              placeholder="Search make / model"
              value={vehicleSearchInput}
              onChange={(e) => setVehicleSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredVehicles[0]) setVehicleMakeModel(filteredVehicles[0]);
                }
              }}
            />
            {vehicleSearchInput ? (
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {filteredVehicles.slice(0, 8).map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => {
                      setVehicleMakeModel(suggestion);
                      setVehicleSearchInput(suggestion);
                      setCustomVehicle("");
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50"
                  >
                    {suggestion}
                  </button>
                ))}
                {filteredVehicles.length === 0 ? <span>No matches</span> : null}
              </div>
            ) : null}
            <div className="grid grid-cols-[120px_minmax(260px,1fr)_150px] gap-2">
              <select
                className={fieldClass}
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
              >
                <option value="">Year</option>
                {vehicleYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={vehicleMakeModel}
                onChange={(e) => {
                  setVehicleMakeModel(e.target.value);
                  if (e.target.value !== "OTHER") setCustomVehicle("");
                }}
              >
                <option value="">Make / Model</option>
                {filteredVehicles.map((car) => (
                  <option key={car} value={car}>
                    {car}
                  </option>
                ))}
                {filteredVehicles.length === 0 ? <option disabled>No matches</option> : null}
                <option value="OTHER">Other (enter manually)</option>
              </select>
              <input
                className={fieldClass}
                placeholder="Price (USD)"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          {showCustomVehicle ? (
            <input
              className={fieldClass}
              placeholder="Enter make / model or VIN"
              value={customVehicle}
              onChange={(e) => setCustomVehicle(e.target.value)}
            />
          ) : null}
          <select className={fieldClass} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="TRUCK">Truck</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="ENCLOSED">Enclosed</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enclosed} onChange={(e) => setEnclosed(e.target.checked)} />
            Enclosed
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="border px-4 py-2 rounded"
            onClick={() => {
              resetForm();
            }}
          >
            Clear
          </button>
          <button className="bg-black text-white px-4 py-2 rounded">Post & Pay</button>
        </div>
      </form>

      {paying && createdLoad && clientSecret && stripePromise ? (
        <PaymentModal
          clientSecret={clientSecret}
          stripePromise={stripePromise}
          onClose={() => {
            setPaying(false);
            setClientSecret(null);
            resetForm();
            location.reload();
          }}
          summary={{
            from: createdLoad.pickupCity,
            to: createdLoad.dropoffCity,
            amount: Math.round(priceNumber * 100) / 100,
            vehicleType: createdLoad.vehicleType ?? "Vehicle",
            enclosed: createdLoad.enclosed,
          }}
        />
      ) : null}
    </>
  );
}

function PaymentModal({
  clientSecret,
  stripePromise,
  onClose,
  summary,
}: {
  clientSecret: string;
  stripePromise: Promise<any>;
  onClose: () => void;
  summary: { from: string; to: string; amount: number; vehicleType: string; enclosed?: boolean };
}) {
  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: { theme: "stripe" },
    }),
    [clientSecret]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500">Pay for</div>
            <div className="font-semibold text-slate-900">
              {summary.from} → {summary.to}
            </div>
            <div className="text-xs text-slate-500">
              {summary.vehicleType}
              {summary.enclosed ? " · Enclosed" : ""}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="text-sm font-semibold mb-3">Amount: ${summary.amount.toFixed(2)}</div>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}

function PaymentForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (err) {
      setError(err.message || "Payment failed");
      setSubmitting(false);
      return;
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-black px-4 py-3 text-white font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}
