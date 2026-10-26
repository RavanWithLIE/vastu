import { useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { makeStyles, useTheme } from "@/src/theme";
import { CalendarEvent, formatTime, humanize } from "./api";
import { ShareCard, useShareEvent } from "./ShareCard";

type Props = {
  dateKey: string | null;
  events: CalendarEvent[];
  onClose: () => void;
};

function formatDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DaySheet({ dateKey, events, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { cardRef, sharingEvent, share, notice, reset } = useShareEvent();

  // Fresh state each time the sheet opens or closes.
  useEffect(() => reset(), [dateKey, reset]);

  return (
    <Modal visible={!!dateKey} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {sharingEvent && (
          <View style={styles.offscreen} pointerEvents="none">
            <ShareCard ref={cardRef} event={sharingEvent} />
          </View>
        )}
        <Pressable testID="day-sheet-backdrop" style={styles.flex} onPress={onClose} />
        <View testID="day-sheet" style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text testID="day-sheet-date" style={styles.title}>
                {dateKey ? formatDate(dateKey) : ""}
              </Text>
              <Text style={styles.subtitle}>
                {events.length} {events.length === 1 ? "event" : "events"}
              </Text>
            </View>
            <Pressable testID="day-sheet-close-button" onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.onSurfaceTertiary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {events.map((ev, i) => (
              <View key={ev.eventId ?? i} testID={`event-row-${i}`} style={styles.row}>
                <View style={styles.timeCol}>
                  <Text testID={`event-start-${i}`} style={styles.time}>{formatTime(ev.startAt)}</Text>
                  {!!ev.endAt && <Text style={styles.endTime}>{formatTime(ev.endAt)}</Text>}
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text testID={`event-title-${i}`} style={styles.eventTitle} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    <View style={styles.badge}>
                      <Text testID={`event-type-${i}`} style={styles.badgeText}>
                        {(ev.typeName ?? ev.type).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {!!ev.description && <Text style={styles.description}>{ev.description}</Text>}
                  {Object.entries(ev.metadata ?? {}).map(([k, v]) => (
                    <Text key={k} style={styles.meta}>
                      <Text style={styles.metaKey}>{humanize(k)}: </Text>
                      {String(v)}
                    </Text>
                  ))}
                  <Pressable
                    testID={`event-share-button-${i}`}
                    accessibilityLabel={`Share ${ev.title}`}
                    disabled={!!sharingEvent}
                    hitSlop={6}
                    onPress={() => share(ev)}
                    style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
                  >
                    {sharingEvent === ev ? (
                      <ActivityIndicator size="small" color={colors.onBrandTertiary} />
                    ) : (
                      <Ionicons name="share-social-outline" size={16} color={colors.onBrandTertiary} />
                    )}
                    <Text style={styles.shareText}>Share</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          {!!notice && (
            <View testID="share-notice" style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    maxHeight: "70%",
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  title: { fontSize: 20, fontWeight: "700", color: c.onSurface },
  subtitle: { fontSize: 14, color: c.muted, marginTop: 4 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 16, gap: 8 },
  row: {
    flexDirection: "row",
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  timeCol: { width: 72, borderRightWidth: 2, borderRightColor: c.brandPrimary, paddingRight: 8 },
  time: { fontSize: 14, fontWeight: "700", color: c.onSurface, fontVariant: ["tabular-nums"] },
  endTime: { fontSize: 12, color: c.muted, marginTop: 2, fontVariant: ["tabular-nums"] },
  description: { fontSize: 13, color: c.onSurfaceSecondary },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurfaceSecondary },
  badge: { backgroundColor: c.brandTertiary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700", color: c.onBrandTertiary, letterSpacing: 0.5 },
  meta: { fontSize: 13, color: c.muted },
  metaKey: { fontWeight: "600", color: c.onSurfaceTertiary },
  offscreen: { position: "absolute", left: -10000, top: 0 },
  shareBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: c.brandTertiary,
  },
  pressed: { opacity: 0.7 },
  shareText: { fontSize: 13, fontWeight: "700", color: c.onBrandTertiary },
  notice: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: c.surfaceInverse },
  noticeText: { fontSize: 13, color: c.onSurfaceInverse },
}));
