# Calendar App — PRD

## Original problem statement
Calendar app: on open shows the current month; fetches extra details for that year/month from an external API (placeholder https://www.example.com/year=2026&month{N}) returning {year, month, totalEvents, days:{date:[{title,type,startAt,metadata}]}}. Days with events show an indicator; tapping one slides up a menu listing each event in row format.

## User choices
- Only real API data (no sample fallback; error + retry on failure)
- Month navigation via arrows and swipe
- One simple dot for event days

## Architecture
- Backend FastAPI proxy `GET /api/calendar-events?year&month` → calls `EVENTS_API_URL_TEMPLATE` (backend/.env, `{year}`/`{month}` placeholders). Upstream failure → 424 with message.
- Frontend single screen `app/index.tsx`; `src/calendar/{api.ts, MonthGrid.tsx, DaySheet.tsx}`; react-query per month.

## Implemented (Oct 2026)
- Month grid, today highlight, selected day, event dots (only for dates in viewed month)
- Prev/next arrows, swipe left/right, Today button
- Slide-up sheet with event rows: time, title, type badge, all metadata fields
- Loading / error + Retry / summary states
- Tested via testing agent with a local mock API (all pass; UI fixes applied)

- Connected real API: https://p7y66xn5lh.execute-api.ap-south-1.amazonaws.com/prod/events?year={year}&month={month}
- Times (UTC from API) shown in device local time with start + end; typeName badge; description shown

## Backlog
- P2: Type-based filters, add-to-device-calendar, offline cache of last month
