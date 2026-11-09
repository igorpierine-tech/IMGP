"use client";

import { useState, useEffect, FormEvent } from "react";
import { appPath } from "@/lib/app-path";
import FormDialog, { FormField, FormActions, inputClass } from "./form-dialog";

type PortfolioEdit = { id: number; name: string; description?: string | null };

export default function NovoPortfolioForm({ open, onClose, onCreated, editing }: { open: boolean; onClose: () => void; onCreated?: () => void; editing?: PortfolioEdit | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && editing) { setName(editing.name); setDescription(editing.description ?? ""); }
    else if (open) { reset(); }
  }, [open, editing]);

  function reset() { setName(""); setDescription(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = editing
        ? { id: editing.id, name, description: description || undefined }
        : { action: "create", name, description: description || undefined };
      const res = await fetch(appPath("/api/portfolios"), {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? (editing ? "Erro ao atualizar portfólio" : "Erro ao criar portfólio"));
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
    <FormDialog open={open} onClose={handleClose} title={editing ? "Editar Portfólio" : "Novo Portfólio"}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <FormField label="Nome do portfólio" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </FormField>

        <FormField label="Descrição">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={3} />
        </FormField>

        <FormActions onCancel={handleClose} loading={loading} label={editing ? "Salvar" : "Criar"} />
      </form>
    </FormDialog>
  );
}
