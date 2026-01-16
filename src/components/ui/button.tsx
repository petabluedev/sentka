import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({ className = "", variant = "default", ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white hover:bg-gray-50"
      : "bg-black text-white hover:bg-gray-800";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}
