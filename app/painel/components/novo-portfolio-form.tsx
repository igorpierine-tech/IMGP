"use client";

import { useState, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass } from "./form-dialog";

export default function NovoPortfolioForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function reset() { setName(""); setDescription(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(appPath("/api/portfolios"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, description: description || undefined }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar portfólio");
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDialog open={open} onClose={handleClose} title="Novo Portfólio">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Nome do portfólio" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </FormField>

        <FormField label="Descrição">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} />
        </FormField>

        <FormActions onCancel={handleClose} loading={loading} />
      </form>
    </FormDialog>
  );
}
