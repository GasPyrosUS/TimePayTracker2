import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AnimatedPressable } from "../src/components/AnimatedPressable";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import {
  defaultSettings,
  loadSettings,
  saveSettings,
} from "../src/lib/storage";
import { addLocalDays } from "../src/lib/dates";
import { dateLabel } from "../src/lib/overtime";
import { AppearanceMode, PaySettings } from "../src/types/models";

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export default function Settings() {
  const { colors, mode, resolvedMode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [settings, setSettings] = useState<PaySettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadSettings().then(saved => {
        if (active) setSettings(saved);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const periodEnd = isValidDateString(settings.periodStart)
    ? addLocalDays(settings.periodStart, 13)
    : "";

  async function save() {
    if (!Number.isFinite(settings.hourlyRate) || settings.hourlyRate <= 0) {
      Alert.alert("Check hourly rate", "Enter an hourly rate greater than $0.");
      return;
    }

    if (
      !Number.isFinite(settings.overtimeMultiplier) ||
      settings.overtimeMultiplier <= 0
    ) {
      Alert.alert(
        "Check overtime multiplier",
        "Enter an overtime multiplier greater than 0."
      );
      return;
    }

    if (!isValidDateString(settings.periodStart)) {
      Alert.alert(
        "Check pay period date",
        "Enter the pay period start as YYYY-MM-DD."
      );
      return;
    }

    setSaving(true);
    setAppliedMessage("");
    try {
      await saveSettings(settings);
      const period = `${dateLabel(settings.periodStart)} – ${dateLabel(
        addLocalDays(settings.periodStart, 13)
      )}`;
      setAppliedMessage(`Settings applied • Current pay period: ${period}`);
      Alert.alert(
        "Settings applied",
        `Your pay settings have been saved and applied.\n\nCurrent pay period:\n${period}`
      );
    } catch {
      Alert.alert(
        "Settings not applied",
        "Your settings could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function shiftPeriod(days: number) {
    if (!isValidDateString(settings.periodStart)) {
      Alert.alert(
        "Check pay period date",
        "Enter a valid start date before moving the pay period."
      );
      return;
    }

    setSettings(current => ({
      ...current,
      periodStart: addLocalDays(current.periodStart, days),
    }));
  }

  function appearanceOption(label: string, value: AppearanceMode, detail: string) {
    const selected = mode === value;

    return (
      <AnimatedPressable
        key={value}
        style={[styles.appearanceOption, selected && styles.appearanceSelected]}
        onPress={() => void setMode(value)}
      >
        <View style={styles.appearanceText}>
          <Text
            style={[
              styles.appearanceTitle,
              selected && { color: colors.green },
            ]}
          >
            {label}
          </Text>
          <Text style={styles.appearanceDetail}>{detail}</Text>
        </View>
        <View
          style={[
            styles.radioOuter,
            selected && { borderColor: colors.green },
          ]}
        >
          {selected && <View style={styles.radioInner} />}
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <AnimatedPressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>

        <Text style={styles.header}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.help}>
            Choose how Time & Pay Tracker looks. System follows your phone's
            current appearance automatically.
          </Text>

          {appearanceOption("System", "system", `Currently ${resolvedMode}`)}
          {appearanceOption("Light", "light", "Always use the light interface")}
          {appearanceOption("Dark", "dark", "Always use the dark interface")}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Settings</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Hourly Rate</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.inputNoBorder}
                keyboardType="decimal-pad"
                value={String(settings.hourlyRate)}
                placeholderTextColor={colors.muted}
                onChangeText={value =>
                  setSettings({
                    ...settings,
                    hourlyRate: Number(value) || 0,
                  })
                }
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Overtime Multiplier</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={String(settings.overtimeMultiplier)}
              placeholderTextColor={colors.muted}
              onChangeText={value =>
                setSettings({
                  ...settings,
                  overtimeMultiplier: Number(value) || 0,
                })
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Period Dates</Text>
          <Text style={styles.help}>
            Pay periods are fixed at 14 days. Change the start date and the end
            date will update automatically.
          </Text>

          <View style={styles.periodCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>START DATE</Text>
              <TextInput
                style={styles.dateInput}
                value={settings.periodStart}
                onChangeText={periodStart =>
                  setSettings({ ...settings, periodStart })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
              {isValidDateString(settings.periodStart) && (
                <Text style={styles.prettyDate}>
                  {dateLabel(settings.periodStart)}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>END DATE</Text>
              <View style={styles.endDateBox}>
                <Text style={styles.endDateText}>
                  {periodEnd || "Enter a valid start date"}
                </Text>
              </View>
              {!!periodEnd && (
                <Text style={styles.prettyDate}>{dateLabel(periodEnd)}</Text>
              )}
            </View>
          </View>

          <View style={styles.periodButtons}>
            <AnimatedPressable
              style={styles.periodButton}
              onPress={() => shiftPeriod(-14)}
            >
              <Text style={styles.periodButtonText}>‹ PREVIOUS 14 DAYS</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.periodButton}
              onPress={() => shiftPeriod(14)}
            >
              <Text style={styles.periodButtonText}>NEXT 14 DAYS ›</Text>
            </AnimatedPressable>
          </View>

          {isValidDateString(settings.periodStart) && (
            <View style={styles.currentPeriod}>
              <Text style={styles.currentPeriodLabel}>
                CURRENT SELECTED PERIOD
              </Text>
              <Text style={styles.currentPeriodText}>
                {dateLabel(settings.periodStart)} – {dateLabel(periodEnd)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overtime Rules</Text>

          <View style={styles.rule}>
            <Text style={styles.ruleTitle}>Monday–Friday</Text>
            <Text style={styles.ruleText}>Before 7:00 AM — Overtime</Text>
            <Text style={styles.ruleText}>
              7:00 AM–3:00 PM — Straight Time
            </Text>
            <Text style={styles.ruleText}>After 3:00 PM — Overtime</Text>
          </View>

          <View style={styles.rule}>
            <Text style={styles.ruleTitle}>Saturday & Sunday</Text>
            <Text style={styles.ruleText}>All worked hours — Overtime</Text>
          </View>
        </View>

        <AnimatedPressable
          style={[styles.saveButton, saving && { opacity: 0.5 }]}
          disabled={saving}
          onPress={() => void save()}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "APPLYING SETTINGS…" : "SAVE & APPLY SETTINGS"}
          </Text>
        </AnimatedPressable>
        {!!appliedMessage && (
          <View accessibilityRole="alert" style={styles.appliedNotice}>
            <Text style={styles.appliedTitle}>✓ Settings applied</Text>
            <Text style={styles.appliedText}>{appliedMessage}</Text>
          </View>
        )}
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
      marginVertical: 18,
    },
    section: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 12,
    },
    help: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    appearanceOption: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 13,
      marginBottom: 8,
      backgroundColor: colors.surfaceAlt,
    },
    appearanceSelected: {
      borderColor: colors.green,
    },
    appearanceText: { flex: 1 },
    appearanceTitle: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 15,
    },
    appearanceDetail: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.green,
    },
    field: { marginBottom: 14 },
    label: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      padding: 14,
      color: colors.text,
      fontSize: 16,
      backgroundColor: colors.input,
    },
    moneyInput: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      paddingHorizontal: 14,
      backgroundColor: colors.input,
    },
    prefix: { fontSize: 16, color: colors.text, fontWeight: "700" },
    inputNoBorder: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 6,
      color: colors.text,
      fontSize: 16,
    },
    periodCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      backgroundColor: colors.surfaceAlt,
    },
    dateBlock: { gap: 6 },
    dateLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 10,
      padding: 13,
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    endDateBox: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 13,
    },
    endDateText: { color: colors.text, fontSize: 17, fontWeight: "800" },
    prettyDate: { color: colors.muted, fontSize: 12 },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    periodButtons: { flexDirection: "row", gap: 8, marginTop: 10 },
    periodButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
    },
    periodButtonText: { color: colors.text, fontSize: 11, fontWeight: "900" },
    currentPeriod: {
      marginTop: 12,
      padding: 13,
      borderRadius: 10,
      backgroundColor: colors.navy2,
    },
    currentPeriodLabel: {
      color: "#CBD5E1",
      fontSize: 10,
      fontWeight: "900",
    },
    currentPeriodText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
      marginTop: 4,
    },
    rule: {
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      marginBottom: 9,
      backgroundColor: colors.surfaceAlt,
    },
    ruleTitle: { color: colors.text, fontWeight: "900", marginBottom: 5 },
    ruleText: { color: colors.muted, marginTop: 2 },
    saveButton: {
      backgroundColor: colors.green,
      borderRadius: 12,
      padding: 17,
      alignItems: "center",
    },
    saveButtonText: { color: colors.onPrimary, fontWeight: "900" },
    appliedNotice: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.green,
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 12,
      padding: 14,
    },
    appliedTitle: { color: colors.green, fontWeight: "900" },
    appliedText: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  });
