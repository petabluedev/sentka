import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;

export const stripe = secret
  ? new Stripe(secret, {
      apiVersion: "2024-11-20.acacia",
    })
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripe;
}
