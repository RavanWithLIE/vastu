import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Ionicons from "@react-native-vector-icons/ionicons";

import { makeStyles, useTheme } from "@/src/theme";
import { CalendarEvent, formatTime, humanize } from "./api";

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeRange(ev: CalendarEvent) {
  return ev.endAt ? `${formatTime(ev.startAt)} – ${formatTime(ev.endAt)}` : formatTime(ev.startAt);
}

export function eventShareText(ev: CalendarEvent) {
  const lines = [
    `📅 ${ev.title}`,
    `${ev.typeName ?? ev.type}`,
    `${longDate(ev.startAt)}, ${timeRange(ev)}`,
    ...(ev.description ? [ev.description] : []),
    ...Object.entries(ev.metadata ?? {}).map(([k, v]) => `${humanize(k)}: ${v}`),
  ];
  return lines.join("\n");
}

// The image that gets shared. Rendered off-screen and captured.
export const ShareCard = forwardRef<View, { event: CalendarEvent }>(({ event }, ref) => {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.topBar} />
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{(event.typeName ?? event.type).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.line}>
          <Ionicons name="calendar-outline" size={18} color={colors.brandPrimary} />
          <Text style={styles.lineText}>{longDate(event.startAt)}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="time-outline" size={18} color={colors.brandPrimary} />
          <Text style={styles.lineText}>{timeRange(event)}</Text>
        </View>
        {!!event.description && <Text style={styles.description}>{event.description}</Text>}
        <View style={styles.metaBox}>
          {Object.entries(event.metadata ?? {}).map(([k, v]) => (
            <View key={k} style={styles.metaRow}>
              <Text style={styles.metaKey}>{humanize(k)}</Text>
              <Text style={styles.metaVal}>{String(v)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Shared from Calendar</Text>
      </View>
    </View>
  );
});
ShareCard.displayName = "ShareCard";

// Renders the card for the chosen event, captures it and opens the share sheet.
export function useShareEvent() {
  const cardRef = useRef<View>(null);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    const run = async () => {
      try {
        if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
          await new Promise((r) => setTimeout(r, 150)); // let the card paint
          const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: event.title, UTI: "public.png" });
        } else if (Platform.OS === "web" && typeof navigator !== "undefined" && !navigator.share) {
          await navigator.clipboard.writeText(eventShareText(event));
          if (!cancelled) setNotice("Event details copied. Paste them into WhatsApp or email.");
        } else {
          await Share.share({ message: eventShareText(event), title: event.title });
        }
      } catch (e) {
        if (!cancelled && (e as Error)?.name !== "AbortError") setNotice("Couldn't open sharing. Please try again.");
      } finally {
        if (!cancelled) setEvent(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [event]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const reset = useCallback(() => {
    setEvent(null);
    setNotice(null);
  }, []);

  return { cardRef, sharingEvent: event, share: setEvent, notice, reset };
}

const useStyles = makeStyles((c) => ({
  card: { width: 360, backgroundColor: c.surfaceSecondary, borderRadius: 20, overflow: "hidden" },
  topBar: { height: 10, backgroundColor: c.brandPrimary },
  body: { padding: 24, gap: 12 },
  badge: { alignSelf: "flex-start", backgroundColor: c.brandTertiary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", color: c.onBrandTertiary, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineText: { fontSize: 15, fontWeight: "600", color: c.onSurfaceSecondary },
  description: { fontSize: 14, color: c.onSurfaceSecondary },
  metaBox: { backgroundColor: c.surface, borderRadius: 12, padding: 12, gap: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metaKey: { fontSize: 13, color: c.muted },
  metaVal: { fontSize: 13, fontWeight: "600", color: c.onSurface, flexShrink: 1, textAlign: "right" },
  footer: { fontSize: 11, color: c.muted, marginTop: 4 },
}));
