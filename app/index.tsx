import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatCard } from "../src/components/StatCard";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import {
  calculateEntry,
  dateLabel,
  formatMoney,
  getPayPeriodDates,
} from "../src/lib/overtime";
import { addLocalDays } from "../src/lib/dates";
import { formatTime12h } from "../src/lib/timeFormat";
import { ensureCurrentPayPeriod } from "../src/lib/timeCards";
import {
  defaultSettings,
  loadEntries,
  loadSettings,
  loadActiveClock,
  subscribeActiveClock,
  subscribeEntries,
  subscribeSettings,
} from "../src/lib/storage";
import { ActiveClockSession, PaySettings, TimeEntry } from "../src/types/models";

export default function Dashboard() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [settings, setSettings] = useState<PaySettings>(defaultSettings);
  const [refreshing, setRefreshing] = useState(false);
  const [activeClock, setActiveClock] = useState<ActiveClockSession | null>(null);

  const refresh = useCallback(async () => {
    await ensureCurrentPayPeriod();
    const [savedEntries, savedSettings, savedActiveClock] = await Promise.all([
      loadEntries(),
      loadSettings(),
      loadActiveClock(),
    ]);
    setEntries(savedEntries);
    setSettings(savedSettings);
    setActiveClock(savedActiveClock);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    const unsubscribeEntries = subscribeEntries(setEntries);
    const unsubscribeSettings = subscribeSettings(setSettings);
    const unsubscribeActiveClock = subscribeActiveClock(setActiveClock);

    return () => {
      unsubscribeEntries();
      unsubscribeSettings();
      unsubscribeActiveClock();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const calculated = useMemo(
    () =>
      entries
        .map(entry =>
          calculateEntry(
            entry,
            settings.hourlyRate,
            settings.overtimeMultiplier
          )
        )
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.id.localeCompare(b.id);
        }),
    [entries, settings.hourlyRate, settings.overtimeMultiplier]
  );

  const currentPeriodDates = useMemo(
    () => new Set(getPayPeriodDates(settings.periodStart)),
    [settings.periodStart]
  );

  const currentPeriodEntries = useMemo(
    () => calculated.filter(entry => currentPeriodDates.has(entry.date)),
    [calculated, currentPeriodDates]
  );

  const totals = useMemo(
    () =>
      currentPeriodEntries.reduce(
        (total, entry) => ({
          regular: total.regular + entry.regularHours,
          overtime: total.overtime + entry.overtimeHours,
          pay: total.pay + entry.totalPay,
        }),
        { regular: 0, overtime: 0, pay: 0 }
      ),
    [currentPeriodEntries]
  );


  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title}>Time & Pay Tracker</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>◷</Text>
          </View>
        </View>

        <View style={styles.periodCard}>
          <Text style={styles.smallWhite}>CURRENT PAY PERIOD</Text>
          <Text style={styles.periodText}>
            {dateLabel(settings.periodStart)} –{" "}
            {dateLabel(addLocalDays(settings.periodStart, 13))}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progress, { width: "45%" }]} />
          </View>
        </View>

        <View style={styles.payCard}>
          <Text style={styles.small}>ESTIMATED GROSS PAY</Text>
          <Text style={styles.pay}>{formatMoney(totals.pay)}</Text>
          <View style={styles.stats}>
            <StatCard
              label="Straight Time"
              value={`${totals.regular.toFixed(1)} hrs`}
              tone="green"
            />
            <StatCard
              label="Overtime"
              value={`${totals.overtime.toFixed(1)} hrs`}
              tone="orange"
            />
            <StatCard
              label="Total Hours"
              value={`${(totals.regular + totals.overtime).toFixed(1)} hrs`}
            />
          </View>
        </View>

        <Pressable style={styles.primary} onPress={() => router.push("/clock")}>
          <Text style={styles.primaryText}>
            {activeClock ? `CLOCKED IN • ${formatTime12h(activeClock.clockIn)}` : "CLOCK IN"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => router.push("/entry")}>
          <Text style={styles.secondaryText}>+ ADD TIME ENTRY</Text>
        </Pressable>

        <View style={styles.featureRow}>
          <Pressable style={styles.featureButton} onPress={() => router.push("/team")}>
            <Text style={styles.featureText}>TEAM HOURS</Text>
          </Pressable>
          <ComingSoonScan style={styles.featureButton} />
        </View>

        <Pressable style={styles.historyButton} onPress={() => router.push("/timecards")}>
          <Text style={styles.historyButtonText}>SAVED TIME CARDS & EXPORTS</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Time</Text>
          <Pressable onPress={() => router.push("/period")}>
            <Text style={styles.link}>View all</Text>
          </Pressable>
        </View>

        {calculated
          .slice(-5)
          .reverse()
          .map(entry => (
            <Pressable
              key={entry.id}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/entry",
                  params: { id: entry.id },
                })
              }
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{dateLabel(entry.date)}</Text>
                <Text style={styles.rowSub}>
                  {formatTime12h(entry.clockIn)}–{formatTime12h(entry.clockOut)} • {entry.paidHours.toFixed(1)} hrs paid
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowPay}>{formatMoney(entry.totalPay)}</Text>
                <Text style={styles.rowSub}>
                  <Text style={{ color: colors.green }}>
                    {entry.regularHours.toFixed(1)} ST
                  </Text>
                  {"  "}
                  <Text style={{ color: colors.orange }}>
                    {entry.overtimeHours.toFixed(1)} OT
                  </Text>
                </Text>
              </View>
            </Pressable>
          ))}

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No hours entered yet</Text>
            <Text style={styles.emptyText}>
              Clock in or add your first time entry to start tracking your pay.
            </Text>
          </View>
        )}

        <View style={styles.nav}>
          <Nav label="Dashboard" active onPress={() => {}} colors={colors} />
          <Nav label="Time" onPress={() => router.push("/clock")} colors={colors} />
          <Nav
            label="Pay Period"
            onPress={() => router.push("/period")}
            colors={colors}
          />
          <Nav
            label="Settings"
            onPress={() => router.push("/settings")}
            colors={colors}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Nav({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 13, alignItems: "center" }}>
      <Text
        style={{
          color: active ? colors.green : colors.muted,
          fontSize: 11,
          fontWeight: active ? "800" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 18, paddingBottom: 30 },
    header: {
      backgroundColor: colors.navy,
      margin: -18,
      marginBottom: 16,
      padding: 22,
      paddingTop: 55,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greeting: { color: "#B9C8D8", fontSize: 13 },
    title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 3 },
    headerIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.navy2,
      alignItems: "center",
      justifyContent: "center",
    },
    headerIconText: { color: colors.green, fontSize: 22, fontWeight: "800" },
    periodCard: {
      backgroundColor: colors.navy2,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
    },
    smallWhite: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
    periodText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      marginTop: 5,
    },
    progressTrack: {
      height: 7,
      backgroundColor: colors.track,
      borderRadius: 8,
      marginTop: 14,
    },
    progress: { height: 7, backgroundColor: colors.green, borderRadius: 8 },
    payCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    small: { color: colors.muted, fontSize: 11, fontWeight: "700" },
    pay: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 5 },
    stats: { flexDirection: "row", gap: 8, marginTop: 12 },
    primary: {
      backgroundColor: colors.green,
      padding: 17,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 14,
    },
    primaryText: { color: colors.onPrimary, fontWeight: "900" },
    secondary: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 9,
      backgroundColor: colors.surface,
    },
    secondaryText: { color: colors.text, fontWeight: "900" },
    historyButton: { padding: 13, alignItems: "center", marginTop: 5 },
    featureRow: { flexDirection: "row", gap: 9, marginTop: 9 },
    featureButton: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, padding: 13, alignItems: "center" },
    featureText: { color: colors.green, fontWeight: "900", fontSize: 11 },
    historyButtonText: { color: colors.green, fontWeight: "900", fontSize: 12 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 21,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    link: { color: colors.green, fontWeight: "800" },
    row: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    rowLeft: { flex: 1 },
    rowRight: { alignItems: "flex-end" },
    rowTitle: { color: colors.text, fontWeight: "900" },
    rowSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
    rowPay: { color: colors.text, fontWeight: "900" },
    empty: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    emptyTitle: { color: colors.text, fontWeight: "900" },
    emptyText: { color: colors.muted, textAlign: "center", marginTop: 5 },
    nav: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginTop: 18,
    },
  });
import { ComingSoonScan } from "../src/components/ComingSoonScan";
