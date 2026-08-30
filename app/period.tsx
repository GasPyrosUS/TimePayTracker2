import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
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
import { defaultSettings, loadEntries, loadSettings } from "../src/lib/storage";
import { saveCurrentTimeCard } from "../src/lib/timeCards";
import { PaySettings, TimeEntry } from "../src/types/models";

export default function Period() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [settings, setSettings] = useState<PaySettings>(defaultSettings);
  const [savingCard, setSavingCard] = useState(false);

  const refresh = useCallback(async () => {
    const [savedEntries, savedSettings] = await Promise.all([
      loadEntries(),
      loadSettings(),
    ]);

    setEntries(savedEntries);
    setSettings(savedSettings);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([loadEntries(), loadSettings()]).then(
        ([savedEntries, savedSettings]) => {
          if (!active) return;
          setEntries(savedEntries);
          setSettings(savedSettings);
        }
      );

      return () => {
        active = false;
      };
    }, [])
  );

  async function saveTimeCard() {
    if (savingCard) return;

    try {
      setSavingCard(true);

      const card = await saveCurrentTimeCard();

      Alert.alert(
        "Time card saved",
        `${dateLabel(card.periodStart)} – ${dateLabel(
          card.periodEnd
        )}\n${card.paidHours.toFixed(2)} paid hours\n${formatMoney(
          card.grossPay
        )} estimated gross pay`,
        [
          {
            text: "View Saved Cards",
            onPress: () => router.push("/timecards"),
          },
          { text: "OK" },
        ]
      );

      await refresh();
    } catch (error) {
      Alert.alert(
        "Could not save time card",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSavingCard(false);
    }
  }

  const dates = useMemo(
    () => getPayPeriodDates(settings.periodStart),
    [settings.periodStart]
  );

  const calculated = useMemo(
    () =>
      entries.map(entry =>
        calculateEntry(
          entry,
          settings.hourlyRate,
          settings.overtimeMultiplier
        )
      ),
    [entries, settings]
  );

  const days = dates.map(date => {
    const matching = calculated.filter(entry => entry.date === date);

    return matching.reduce(
      (summary, entry) => ({
        date,
        regular: summary.regular + entry.regularHours,
        overtime: summary.overtime + entry.overtimeHours,
        pay: summary.pay + entry.totalPay,
      }),
      { date, regular: 0, overtime: 0, pay: 0 }
    );
  });

  const totals = days.reduce(
    (summary, day) => ({
      regular: summary.regular + day.regular,
      overtime: summary.overtime + day.overtime,
      pay: summary.pay + day.pay,
    }),
    { regular: 0, overtime: 0, pay: 0 }
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.header}>Pay Period</Text>
        <Text style={styles.range}>
          {dateLabel(settings.periodStart)} –{" "}
          {dateLabel(addLocalDays(settings.periodStart, 13))}
        </Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>ESTIMATED GROSS PAY</Text>
          <Text style={styles.totalPay}>{formatMoney(totals.pay)}</Text>

          <View style={styles.totalRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Straight</Text>
              <Text style={[styles.metricValue, { color: colors.green }]}>
                {totals.regular.toFixed(1)} hrs
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Overtime</Text>
              <Text style={[styles.metricValue, { color: colors.orange }]}>
                {totals.overtime.toFixed(1)} hrs
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total</Text>
              <Text style={styles.metricValue}>
                {(totals.regular + totals.overtime).toFixed(1)} hrs
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={[
              styles.saveCardButton,
              savingCard && styles.buttonDisabled,
            ]}
            onPress={() => void saveTimeCard()}
            disabled={savingCard}
          >
            <Text style={styles.saveCardText}>
              {savingCard ? "SAVING…" : "SAVE TIME CARD"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/timecards")}
          >
            <Text style={styles.historyText}>
              VIEW SAVED CARDS / EXPORT
            </Text>
          </Pressable>
        </View>

        <ComingSoonScan style={styles.scanButton} label="SCAN / IMPORT TIMESHEET" />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Saved Entries</Text>
          <Text style={styles.sectionHint}>Tap to edit</Text>
        </View>

        {calculated
          .filter(entry => dates.includes(entry.date))
          .sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.id.localeCompare(a.id);
          })
          .map(entry => (
            <Pressable
              key={entry.id}
              style={styles.savedEntry}
              onPress={() =>
                router.push({
                  pathname: "/entry",
                  params: { id: entry.id },
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{dateLabel(entry.date)}</Text>

                <Text style={styles.rowSub}>
                  {formatTime12h(entry.clockIn)}–
                  {formatTime12h(entry.clockOut)} •{" "}
                  {entry.paidHours.toFixed(1)} hrs
                </Text>

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

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.rowPay}>
                  {formatMoney(entry.totalPay)}
                </Text>
                <Text style={styles.editLink}>EDIT ›</Text>
              </View>
            </Pressable>
          ))}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
          Daily Breakdown
        </Text>

        {days.map(day => (
          <View key={day.date} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{dateLabel(day.date)}</Text>

              <Text style={styles.rowSub}>
                <Text style={{ color: colors.green }}>
                  {day.regular.toFixed(1)} ST
                </Text>
                {"  "}
                <Text style={{ color: colors.orange }}>
                  {day.overtime.toFixed(1)} OT
                </Text>
              </Text>
            </View>

            <Text style={styles.rowPay}>{formatMoney(day.pay)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 20, paddingBottom: 40 },
    back: { color: colors.green, fontWeight: "800", marginTop: 10 },
    header: {
      fontSize: 28,
      fontWeight: "900",
      color: colors.text,
      marginTop: 18,
    },
    range: {
      color: colors.muted,
      marginTop: 4,
      marginBottom: 16,
    },
    totalCard: {
      backgroundColor: colors.navy2,
      borderRadius: 17,
      padding: 18,
      marginBottom: 20,
    },
    totalLabel: {
      color: "#CBD5E1",
      fontSize: 11,
      fontWeight: "800",
    },
    totalPay: {
      color: "#FFFFFF",
      fontSize: 32,
      fontWeight: "900",
      marginTop: 5,
    },
    totalRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
    },
    metric: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 11,
      padding: 11,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 11,
    },
    metricValue: {
      color: colors.text,
      fontWeight: "900",
      marginTop: 4,
      fontSize: 14,
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    saveCardButton: {
      flex: 1,
      backgroundColor: colors.green,
      borderRadius: 11,
      padding: 13,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    saveCardText: {
      color: colors.onPrimary,
      fontWeight: "900",
      fontSize: 12,
    },
    historyButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 11,
      padding: 13,
      alignItems: "center",
    },
    historyText: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 11,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 9,
    },
    scanButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 11, padding: 14, alignItems: "center", marginTop: -10, marginBottom: 20 },
    scanText: { color: colors.green, fontWeight: "900", fontSize: 12 },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 9,
    },
    sectionHint: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    savedEntry: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    editLink: {
      color: colors.green,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 5,
    },
    row: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rowTitle: {
      color: colors.text,
      fontWeight: "900",
    },
    rowSub: {
      color: colors.muted,
      marginTop: 4,
      fontSize: 12,
    },
    rowPay: {
      color: colors.text,
      fontWeight: "900",
    },
  });
import { ComingSoonScan } from "../src/components/ComingSoonScan";
