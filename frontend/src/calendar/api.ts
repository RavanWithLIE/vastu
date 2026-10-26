export type CalendarEvent = {
  title: string;
  type: string;
  startAt: string;
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

// Show the time exactly as given by the API (avoids device-timezone shifts).
export function formatTime(startAt: string) {
  const m = /T(\d{2}):(\d{2})/.exec(startAt);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
