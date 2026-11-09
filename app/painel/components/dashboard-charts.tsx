"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, CartesianGrid } from "recharts";

const COLORS = {
  onTrack: "#10b981",
  attention: "#f59e0b",
  late: "#ef4444",
  planning: "#94a3b8",
  inProgress: "#3b82f6",
  completed: "#10b981",
  blocked: "#ef4444",
  brand: "#0c4a3e",
};

type ProjectHealth = { onTrack: number; attention: number; late: number };
type TaskBreakdown = { planned: number; inProgress: number; blocked: number; done: number };
type AreaData = { area: string; count: number };

export function HealthPieChart({ data }: { data: ProjectHealth }) {
  const chartData = [
    { name: "No prazo", value: data.onTrack, color: COLORS.onTrack },
    { name: "Atenção", value: data.attention, color: COLORS.attention },
    { name: "Atrasado", value: data.late, color: COLORS.late },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [Number(value), "Projetos"]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TasksPieChart({ data }: { data: TaskBreakdown }) {
  const chartData = [
    { name: "Planejadas", value: data.planned, color: COLORS.planning },
    { name: "Em progresso", value: data.inProgress, color: COLORS.inProgress },
    { name: "Bloqueadas", value: data.blocked, color: COLORS.late },
    { name: "Concluídas", value: data.done, color: COLORS.completed },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [Number(value), "Tarefas"]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AreaBarChart({ data }: { data: AreaData[] }) {
  if (data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>;

  const chartData = data.slice(0, 8).map((d) => ({
    name: d.area || "Sem área",
    projetos: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [Number(value), "Projetos"]} />
        <Bar dataKey="projetos" fill={COLORS.brand} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressAreaChart({ projects }: { projects: Array<{ name: string; progress: number }> }) {
  if (projects.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>;

  const chartData = projects.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    progresso: p.progress,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value) => [`${value}%`, "Progresso"]} />
        <Area type="monotone" dataKey="progresso" stroke={COLORS.brand} fill={COLORS.brand} fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
