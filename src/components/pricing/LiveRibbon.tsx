"use client";
import useLivePricing from "./useLivePricing";
import PricingRibbon from "./PricingRibbon";
import { useEffect, useState } from "react";

export default function LiveRibbon() {
  const signal = useLivePricing(720); // starting anchor price
  return <PricingRibbon {...signal} />;
}
