export type CalendarEvent = {
  eventId?: string;
  title: string;
  type: string;
  typeName?: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  status?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type MonthEvents = {
  year: number;
  month: number;
  totalEvents: number;
  days: Record<string, CalendarEvent[]>;
};

export async function fetchMonthEvents(year: number, month: number): Promise<MonthEvents> {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/calendar-events?year=${year}&month=${month}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Could not load events");
  }
  return res.json();
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// API times carry a zone (Z or +05:30); show them in the phone's local time.
export function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

export function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
