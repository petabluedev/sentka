export const SHIPPER_FEE_CENTS = Number(process.env.NEXT_PUBLIC_SHIPPER_FEE_CENTS ?? process.env.SHIPPER_FEE_CENTS ?? 600);
export const DRIVER_ACCEPT_FEE_CENTS = Number(process.env.DRIVER_ACCEPT_FEE_CENTS ?? 500);

export function getShipperFeeCents() {
  return Number.isFinite(SHIPPER_FEE_CENTS) ? SHIPPER_FEE_CENTS : 600;
}

export function getDriverAcceptFeeCents() {
  return Number.isFinite(DRIVER_ACCEPT_FEE_CENTS) ? DRIVER_ACCEPT_FEE_CENTS : 500;
}
