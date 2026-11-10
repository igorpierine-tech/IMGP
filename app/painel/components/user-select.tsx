"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";

type Member = { id: string; displayName: string };

let cached: Member[] | null = null;
let cachedAt = 0;
const TTL = 30_000;

function fetchMembers(cb: (m: Member[]) => void) {
  if (cached && Date.now() - cachedAt < TTL) { cb(cached); return; }
  fetch(appPath("/api/members"), { credentials: "include" })
    .then((r) => r.json() as Promise<{ members: Member[] }>)
    .then((d) => { cached = d.members; cachedAt = Date.now(); cb(d.members); })
    .catch(() => {});
}

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

  useEffect(() => { fetchMembers(setMembers); }, []);

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
  useEffect(() => { fetchMembers(setMembers); }, []);
  return members;
}
