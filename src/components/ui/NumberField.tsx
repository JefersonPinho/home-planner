"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, formatNumber, parseMeters, roundMm } from "@/lib/format";

export function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(formatNumber(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatNumber(value));
  }, [value]);

  const commit = () => {
    const parsed = parseMeters(text);
    if (parsed === null) {
      setText(formatNumber(value));
      return;
    }
    const next = roundMm(clamp(parsed, min, max));
    onCommit(next);
    setText(formatNumber(next));
  };

  return (
    <label className="grid min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
      <span className="truncate text-neutral-500">{label}</span>
      <input
        inputMode="decimal"
        className="h-8 min-w-0 border border-neutral-300 bg-white px-2 text-right outline-none focus:border-neutral-900"
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <span className="w-4 text-neutral-400">{suffix}</span>
    </label>
  );
}
