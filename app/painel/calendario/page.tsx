"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

type CalendarEvent = { id: number; title: string; start: string; end?: string; type: string; status?: string; color?: string };

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const TYPE_COLORS: Record<string, string> = {
  task: "bg-blue-500",
  sprint: "bg-purple-500",
  milestone: "bg-amber-500",
};

export default function CalendarioPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = new Date(year, month + 1, 0);
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

    fetch(appPath(`/api/calendar?start=${start}&end=${end}`), { credentials: "include" })
      .then(async (r) => {
        const body = await r.json() as { events?: CalendarEvent[] };
        if (r.ok) setEvents(body.events ?? []);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start <= dateStr && (!e.end || e.end >= dateStr));
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-gray-900">Calendário</h1><p className="text-sm text-gray-500 mt-1">Tarefas e sprints no mês</p></div>

      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin mr-2" size={20} /> Carregando...</div>
        ) : (
          <div className="p-2">
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map((w) => <div key={w} className="text-center text-xs font-medium text-gray-500 py-2">{w}</div>)}
              {days.map((day, i) => (
                <div key={i} className={`min-h-[80px] p-1 border border-gray-100 rounded ${day ? "bg-white" : "bg-gray-50"}`}>
                  {day && (
                    <>
                      <div className="text-xs text-gray-500 mb-1">{day}</div>
                      <div className="space-y-0.5">
                        {eventsForDay(day).slice(0, 3).map((ev) => (
                          <div key={ev.id} className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`} title={ev.title}>
                            {ev.title}
                          </div>
                        ))}
                        {eventsForDay(day).length > 3 && <div className="text-[10px] text-gray-400">+{eventsForDay(day).length - 3} mais</div>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Tarefas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Sprints</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Marcos</span>
        </div>
      </div>
    </div>
  );
}
