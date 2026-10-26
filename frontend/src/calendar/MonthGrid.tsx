import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { makeStyles } from "@/src/theme";
import { dateKey } from "./api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  year: number;
  month: number; // 1-12
  eventDays: Set<string>;
  selectedKey: string | null;
  onDayPress: (key: string) => void;
};

export function MonthGrid({ year, month, eventDays, selectedKey, onDayPress }: Props) {
  const styles = useStyles();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View testID="month-grid">
      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.cell} />;
            const key = dateKey(year, month, day);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const hasEvents = eventDays.has(key);
            return (
              <Pressable
                key={di}
                testID={`day-cell-${key}`}
                accessibilityLabel={`${key}${hasEvents ? ", has events" : ""}`}
                style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onDayPress(key);
                }}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && !isToday && styles.selectedCircle,
                    isToday && styles.todayCircle,
                  ]}
                >
                  <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                </View>
                <View
                  testID={hasEvents ? `event-dot-${key}` : undefined}
                  style={[styles.dot, hasEvents && styles.dotVisible]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: c.muted,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cell: { flex: 1, height: 56, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  todayCircle: { backgroundColor: c.brandPrimary },
  selectedCircle: { backgroundColor: c.brandTertiary },
  dayText: { fontSize: 16, color: c.onSurface, fontVariant: ["tabular-nums"], fontWeight: "500" },
  todayText: { color: c.onBrandPrimary, fontWeight: "700" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: "transparent" },
  dotVisible: { backgroundColor: c.brandPrimary },
}));
