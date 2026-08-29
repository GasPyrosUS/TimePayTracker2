import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import {
  clearActiveClock,
  loadActiveClock,
  loadEntries,
  saveActiveClock,
  saveEntries,
} from "../src/lib/storage";
import { localDateString } from "../src/lib/dates";
import { formatTime12h } from "../src/lib/timeFormat";
import { ensureCurrentPayPeriod } from "../src/lib/timeCards";
import { ActiveClockSession } from "../src/types/models";

export default function Clock() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeClock, setActiveClock] = useState<ActiveClockSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadActiveClock().then(session => {
        if (active) setActiveClock(session);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  function now() {
    return new Date().toTimeString().slice(0, 5);
  }

  async function clockIn() {
    const session: ActiveClockSession = {
      date: localDateString(),
      clockIn: now(),
      breakMinutes: 0,
    };

    await saveActiveClock(session);
    setActiveClock(session);
  }

  async function clockOut() {
    if (!activeClock) return;

    const entries = await loadEntries();
    const clockOutTime = now();

    const entry = {
      id: `${activeClock.date}-${Date.now()}`,
      date: activeClock.date,
      clockIn: activeClock.clockIn,
      clockOut: clockOutTime,
      breakMinutes: activeClock.breakMinutes,
    };

    await saveEntries([...entries, entry]);
    await clearActiveClock();
    setActiveClock(null);
    await ensureCurrentPayPeriod();

    Alert.alert(
      "Time saved",
      `Clocked in at ${formatTime12h(activeClock.clockIn)} and clocked out at ${formatTime12h(clockOutTime)}.`
    );
    router.back();
  }

  async function toggleBreak() {
    if (!activeClock) return;

    const updated: ActiveClockSession = {
      ...activeClock,
      breakMinutes: activeClock.breakMinutes === 0 ? 30 : 0,
    };

    await saveActiveClock(updated);
    setActiveClock(updated);
  }

  const clockedIn = !!activeClock;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.header}>Time Clock</Text>

        <View style={styles.card}>
          <View style={styles.status}>
            <View
              style={[
                styles.dot,
                { backgroundColor: clockedIn ? colors.green : colors.muted },
              ]}
            />
            <Text
              style={{
                color: clockedIn ? colors.green : colors.muted,
                fontWeight: "800",
              }}
            >
              {clockedIn ? "CLOCKED IN" : "CLOCKED OUT"}
            </Text>
          </View>

          <Text style={styles.time}>
            {activeClock ? formatTime12h(activeClock.clockIn) : "Ready"}
          </Text>

          <Text style={styles.date}>
            {activeClock
              ? `Started ${activeClock.date}`
              : new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
          </Text>

          {activeClock && (
            <Text style={styles.persistNote}>
              Your clock-in is saved. You can leave this screen and come back later.
            </Text>
          )}
        </View>

        <View style={styles.rules}>
          <Text style={styles.ruleTitle}>Work Rules</Text>
          <Text style={styles.rule}>Mon–Fri • Before 7:00 AM → OT</Text>
          <Text style={styles.rule}>Mon–Fri • 7:00 AM–3:00 PM → Straight</Text>
          <Text style={styles.rule}>Mon–Fri • After 3:00 PM → OT</Text>
          <Text style={styles.rule}>Sat–Sun • All hours → OT</Text>
        </View>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: clockedIn ? colors.red : colors.green },
          ]}
          onPress={clockedIn ? clockOut : clockIn}
        >
          <Text style={styles.buttonText}>
            {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
          </Text>
        </Pressable>

        {clockedIn && (
          <Pressable style={styles.breakButton} onPress={toggleBreak}>
            <Text style={styles.breakText}>
              {activeClock?.breakMinutes
                ? "30-MIN BREAK ADDED"
                : "ADD 30-MIN BREAK"}
            </Text>
          </Pressable>
        )}

        <Pressable style={styles.manual} onPress={() => router.push("/entry")}>
          <Text style={styles.manualText}>+ MANUAL TIME ENTRY</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, padding: 20 },
    back: { color: colors.green, fontSize: 16, fontWeight: "700", marginTop: 12 },
    header: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "900",
      marginVertical: 18,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    status: { flexDirection: "row", alignItems: "center", gap: 7 },
    dot: { width: 9, height: 9, borderRadius: 9 },
    time: {
      fontSize: 52,
      fontWeight: "900",
      color: colors.text,
      marginTop: 15,
    },
    date: { color: colors.muted, marginTop: 3 },
    persistNote: {
      color: colors.muted,
      marginTop: 14,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 18,
    },
    rules: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 18,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ruleTitle: {
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 8,
      color: colors.text,
    },
    rule: { color: colors.muted, marginVertical: 4 },
    button: {
      borderRadius: 13,
      padding: 17,
      alignItems: "center",
      marginTop: 18,
    },
    buttonText: { color: colors.onPrimary, fontWeight: "900", fontSize: 15 },
    breakButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      padding: 15,
      alignItems: "center",
      marginTop: 10,
      backgroundColor: colors.surface,
    },
    breakText: { color: colors.text, fontWeight: "800" },
    manual: { marginTop: 15, alignItems: "center" },
    manualText: { color: colors.green, fontWeight: "900" },
  });
