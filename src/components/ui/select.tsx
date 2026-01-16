import * as React from "react";

type Option = { value: string; label: string };
type Props = {
  value?: string;
  onChange?: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};
export default function Select({ value, onChange, options, placeholder, className }: Props) {
  return (
    <select
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 ${className ?? ""}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
