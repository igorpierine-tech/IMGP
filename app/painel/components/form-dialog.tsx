"use client";

import { X, Loader2 } from "lucide-react";

export default function FormDialog({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FormActions({ onCancel, onClose, loading, saving, label }: { onCancel?: () => void; onClose?: () => void; loading?: boolean; saving?: boolean; label?: string }) {
  const isLoading = loading || saving || false;
  const handleCancel = onCancel ?? onClose ?? (() => {});
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
      <button type="button" onClick={handleCancel} disabled={isLoading}
        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
        Cancelar
      </button>
      <button type="submit" disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0c4a3e] hover:bg-[#0a3d33] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        {isLoading ? "Salvando..." : label ?? "Criar"}
      </button>
    </div>
  );
}

export const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 focus:border-[#0c4a3e] outline-none transition-all";
export const selectClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0c4a3e]/20 focus:border-[#0c4a3e] outline-none bg-white transition-all";
