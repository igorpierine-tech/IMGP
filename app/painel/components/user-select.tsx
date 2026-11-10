"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";

type Member = { id: string; displayName: string };

let cached: Member[] | null = null;

export default function UserSelect({
  value,
  onChange,
  className,
  placeholder = "Selecione...",
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [members, setMembers] = useState<Member[]>(cached ?? []);

  useEffect(() => {
    if (cached) return;
    fetch(appPath("/api/members"), { credentials: "include" })
      .then((r) => r.json() as Promise<{ members: Member[] }>)
      .then((d) => { cached = d.members; setMembers(d.members); })
      .catch(() => {});
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder}</option>
      {members.map((m) => (
        <option key={m.id} value={m.displayName}>{m.displayName}</option>
      ))}
    </select>
  );
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>(cached ?? []);
  useEffect(() => {
    if (cached) { setMembers(cached); return; }
    fetch(appPath("/api/members"), { credentials: "include" })
      .then((r) => r.json() as Promise<{ members: Member[] }>)
      .then((d) => { cached = d.members; setMembers(d.members); })
      .catch(() => {});
  }, []);
  return members;
}
