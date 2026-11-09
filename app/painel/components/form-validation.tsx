"use client";

import { useState, useCallback } from "react";

type Rule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  message?: string;
};

type FieldErrors = Record<string, string>;
type FieldRules = Record<string, Rule>;

export function useFormValidation(rules: FieldRules) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = useCallback(
    (values: Record<string, string>) => {
      const newErrors: FieldErrors = {};
      for (const [field, rule] of Object.entries(rules)) {
        const value = values[field] ?? "";
        if (rule.required && !value.trim()) {
          newErrors[field] = rule.message ?? "Campo obrigatório";
          continue;
        }
        if (rule.minLength && value.length < rule.minLength) {
          newErrors[field] = rule.message ?? `Mínimo ${rule.minLength} caracteres`;
          continue;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          newErrors[field] = rule.message ?? `Máximo ${rule.maxLength} caracteres`;
          continue;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          newErrors[field] = rule.message ?? "Formato inválido";
          continue;
        }
        if (rule.custom) {
          const msg = rule.custom(value);
          if (msg) newErrors[field] = msg;
        }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [rules],
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  return { errors, validate, clearError, clearAll };
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export function ValidatedInput({
  value,
  onChange,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        value={value}
        onChange={onChange}
        className={`${className ?? ""} ${error ? "border-red-300 focus:ring-red-200 focus:border-red-400" : ""}`}
        {...props}
      />
      <FieldError message={error} />
    </div>
  );
}
