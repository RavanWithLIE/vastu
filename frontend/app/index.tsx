import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import Animated, { FadeIn } from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";
import { fetchMonthEvents } from "@/src/calendar/api";
import { MonthGrid } from "@/src/calendar/MonthGrid";
import { DaySheet } from "@/src/calendar/DaySheet";

export default function CalendarScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["month-events", view.year, view.month],
    queryFn: () => fetchMonthEvents(view.year, view.month),
    retry: 1,
  });

  const monthPrefix = `${view.year}-${String(view.month).padStart(2, "0")}-`;
  const monthEntries = useMemo(
    () => Object.entries(data?.days ?? {}).filter(([k, v]) => k.startsWith(monthPrefix) && v.length > 0),
    [data, monthPrefix],
  );
  const eventDays = useMemo(() => new Set(monthEntries.map(([k]) => k)), [monthEntries]);
  const monthEventCount = monthEntries.reduce((n, [, v]) => n + v.length, 0);

  const shift = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(null);
    setView((v) => {
      const d = new Date(v.year, v.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };
  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) shiftRef.current(1);
        else if (g.dx > 50) shiftRef.current(-1);
      },
    }),
  ).current;

  const onDayPress = (key: string) => {
    setSelected(key);
    if (eventDays.has(key)) setSheetKey(key);
  };

  const monthLabel = new Date(view.year, view.month - 1, 1).toLocaleDateString(undefined, { month: "long" });
  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth() + 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text testID="calendar-month-title" style={styles.month} numberOfLines={1} adjustsFontSizeToFit>
            {monthLabel}
          </Text>
          <Text testID="calendar-year-title" style={styles.year}>
            {view.year}
          </Text>
        </View>
        {!isCurrentMonth && (
          <Pressable
            testID="today-button"
            style={styles.todayBtn}
            onPress={() => {
              setSelected(null);
              setView({ year: now.getFullYear(), month: now.getMonth() + 1 });
            }}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        )}
        <Pressable testID="prev-month-button" style={styles.navBtn} onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Pressable testID="next-month-button" style={styles.navBtn} onPress={() => shift(1)}>
          <Ionicons name="chevron-forward" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View
          key={`${view.year}-${view.month}`}
          entering={FadeIn.duration(220)}
          style={styles.card}
          {...pan.panHandlers}
        >
          <MonthGrid
            year={view.year}
            month={view.month}
            eventDays={eventDays}
            selectedKey={selected}
            onDayPress={onDayPress}
          />
        </Animated.View>

        <View style={styles.status}>
          {isLoading ? (
            <View testID="events-loading" style={styles.statusRow}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={styles.statusText}>Loading events…</Text>
            </View>
          ) : isError ? (
            <View testID="events-error" style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.error} />
              <Text testID="events-error-message" style={styles.errorText}>
                {(error as Error)?.message ?? "Could not load events"}
              </Text>
              <Pressable testID="events-retry-button" style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <Text testID="events-summary" style={styles.statusText}>
              {monthEventCount
                ? `${monthEventCount} ${monthEventCount === 1 ? "event" : "events"} this month · tap a dotted day`
                : "No events this month"}
            </Text>
          )}
        </View>
        <Text style={styles.hint}>Swipe left or right to change month</Text>
      </ScrollView>

      <DaySheet
        dateKey={sheetKey}
        events={sheetKey ? data?.days[sheetKey] ?? [] : []}
        onClose={() => setSheetKey(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  month: { fontSize: 32, fontWeight: "800", color: c.onSurface, letterSpacing: -0.5 },
  year: { fontSize: 16, fontWeight: "600", color: c.brandPrimary, marginTop: 2 },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  todayBtn: { height: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: c.brandTertiary, justifyContent: "center" },
  todayBtnText: { fontSize: 14, fontWeight: "600", color: c.onBrandTertiary },
  content: { paddingHorizontal: 16 },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  status: { marginTop: 24, paddingHorizontal: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, color: c.onSurfaceTertiary },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  errorText: { flex: 1, fontSize: 14, color: c.onSurfaceSecondary },
  retryBtn: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.brandPrimary, justifyContent: "center" },
  retryText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  hint: { fontSize: 12, color: c.muted, marginTop: 12, paddingHorizontal: 8 },
}));
