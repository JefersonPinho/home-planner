"use client";

import type { ReactNode } from "react";

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/30 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md border border-neutral-200 bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" className="text-neutral-500 hover:text-neutral-900" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
