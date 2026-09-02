import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AnimatedPressable } from "../src/components/AnimatedPressable";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import {
  calculateEntry,
  formatMoney,
  getPayPeriodDates,
} from "../src/lib/overtime";
import { localDateString, weekdayDateLabel } from "../src/lib/dates";
import { captureStorageScope } from "../src/lib/storageScope";
import { confirmEntryDeletion } from "../src/lib/confirmEntryDeletion";
import { formatTime12h, parseTimeInput } from "../src/lib/timeFormat";
import {
  defaultSettings,
  loadEntries,
  loadSettings,
  saveEntries,
} from "../src/lib/storage";
import { PaySettings, TimeEntry } from "../src/types/models";

type Choice = {
  label: string;
  value: string;
  detail?: string;
};

type PickerState = {
  title: string;
  value: string;
  choices: Choice[];
  onSelect: (value: string) => void;
} | null;

function timeChoices(current?: string): Choice[] {
  const values = new Set<string>();

  for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay += 5) {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    values.add(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  if (current) values.add(current);

  return [...values]
    .sort()
    .map(value => ({ value, label: formatTime12h(value) }));
}

export default function Entry() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const editing = !!entryId;

  const [date, setDate] = useState(localDateString());
  const [clockInText, setClockInText] = useState("7:00 AM");
  const [clockOutText, setClockOutText] = useState("3:00 PM");
  const clockIn = parseTimeInput(clockInText);
  const clockOut = parseTimeInput(clockOutText);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [notes, setNotes] = useState("");
  const [settings, setSettings] = useState<PaySettings>(defaultSettings);
  const [loadedEntry, setLoadedEntry] = useState<TimeEntry | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteInProgress = useRef(false);

  useEffect(() => {
    loadSettings().then(saved => {
      setSettings(saved);

      if (!editing) {
        const dates = getPayPeriodDates(saved.periodStart);
        const today = localDateString();
        setDate(dates.includes(today) ? today : saved.periodStart);
      }
    });
  }, [editing]);

  useEffect(() => {
    if (!entryId) return;

    loadEntries().then(entries => {
      const found = entries.find(entry => entry.id === entryId);

      if (!found) {
        Alert.alert("Entry not found", "This saved time entry could not be found.");
        router.back();
        return;
      }

      setLoadedEntry(found);
      setDate(found.date);
      setClockInText(formatTime12h(found.clockIn));
      setClockOutText(formatTime12h(found.clockOut));
      setBreakMinutes(found.breakMinutes ?? 0);
      setNotes(found.notes ?? "");
    });
  }, [entryId]);

  const dateChoices = useMemo(() => {
    const values = new Set(getPayPeriodDates(settings.periodStart));
    if (loadedEntry?.date) values.add(loadedEntry.date);
    const today = localDateString();

    return [...values].sort().map(value => ({
      value,
      label: weekdayDateLabel(value),
      detail: value === today ? "Today" : undefined,
    }));
  }, [settings.periodStart, loadedEntry?.date]);

  const clockInChoices = useMemo(() => timeChoices(clockIn ?? undefined), [clockIn]);
  const clockOutChoices = useMemo(() => timeChoices(clockOut ?? undefined), [clockOut]);

  const breakChoices = useMemo(() => {
    const values = new Set([0, 15, 30, 45, 60, breakMinutes]);
    return [...values]
      .filter(value => value >= 0)
      .sort((a, b) => a - b)
      .map(value => ({
        value: String(value),
        label: value === 0 ? "No unpaid break" : `${value} minutes`,
      }));
  }, [breakMinutes]);

  const preview = useMemo(
    () =>
      clockIn && clockOut ? calculateEntry(
        {
          id: entryId ?? "preview",
          date,
          clockIn,
          clockOut,
          breakMinutes,
          notes,
        },
        settings.hourlyRate,
        settings.overtimeMultiplier,
        settings.weekdayBaseHoursEnabled
      ) : null,
    [
      entryId,
      date,
      clockIn,
      clockOut,
      breakMinutes,
      notes,
      settings.hourlyRate,
      settings.overtimeMultiplier,
      settings.weekdayBaseHoursEnabled,
    ]
  );

  function openPicker(
    title: string,
    value: string,
    choices: Choice[],
    onSelect: (value: string) => void
  ) {
    setPicker({ title, value, choices, onSelect });
  }

  async function save() {
    // Draft text never enters storage or the calculator until both times parse.
    if (!clockIn || !clockOut) return;
    const isCurrent = captureStorageScope();
    const entries = await loadEntries();
    if (!isCurrent()) return;

    const updatedEntry: TimeEntry = {
      id: entryId ?? `${date}-${Date.now()}`,
      date,
      clockIn,
      clockOut,
      breakMinutes,
      notes,
    };

    const nextEntries = editing
      ? entries.map(entry => (entry.id === entryId ? updatedEntry : entry))
      : [...entries, updatedEntry];

    await saveEntries(nextEntries);
    if (!isCurrent()) return;

    const result = calculateEntry(
      updatedEntry,
      settings.hourlyRate,
      settings.overtimeMultiplier,
      settings.weekdayBaseHoursEnabled
    );

    Alert.alert(
      editing ? "Entry updated" : "Time entry saved",
      `Straight: ${result.regularHours.toFixed(2)} hrs\nOvertime: ${result.overtimeHours.toFixed(2)} hrs\nEstimated pay: ${formatMoney(result.totalPay)}`
    );

    router.back();
  }

  async function confirmDelete() {
    if (!entryId || deleteInProgress.current) return;
    const isCurrent = captureStorageScope();
    deleteInProgress.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      if (!await confirmEntryDeletion() || !isCurrent()) return;
      const entries = await loadEntries();
      if (!isCurrent()) return;
      // Use the same storage path as native deletion, including team-sync events.
      await saveEntries(entries.filter(entry => entry.id !== entryId));
      if (isCurrent()) router.back();
    } catch {
      if (isCurrent()) setDeleteError("Could not delete this entry. Please try again.");
    } finally {
      deleteInProgress.current = false;
      if (isCurrent()) setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AnimatedPressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>

        <View style={styles.top}>
          <Text style={styles.header}>
            {editing ? "Edit Time Entry" : "Add Time Entry"}
          </Text>
          <Text style={styles.subtitle}>
            Type clock times or use the dropdown arrows to choose them.
          </Text>
        </View>

        {editing && loadedEntry && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeTitle}>Editing saved entry</Text>
            <Text style={styles.editNoticeText}>
              Your hours and estimated pay update automatically as you make changes.
            </Text>
          </View>
        )}

        {!editing && <ComingSoonScan style={styles.scanButton} label="SCAN PHYSICAL TIMESHEET" />}

        {settings.weekdayBaseHoursEnabled && (
          <View style={styles.weekdayModeNotice}>
            <Text style={styles.weekdayModeTitle}>8-hour weekday mode is on</Text>
            <Text style={styles.weekdayModeText}>
              Monday–Friday straight time is added separately. This entry adds
              only qualifying overtime hours and overtime pay.
            </Text>
          </View>
        )}

        <SelectField
          label="Work Date"
          value={`${weekdayDateLabel(date)}${date === localDateString() ? " • Today" : ""}`}
          onPress={() => openPicker("Work Date", date, dateChoices, setDate)}
          styles={styles}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <TimeInputField
              label="Clock In"
              value={clockInText}
              onChangeText={setClockInText}
              onBlur={() => { if (clockIn) setClockInText(formatTime12h(clockIn)); }}
              invalid={!clockIn}
              onPress={() =>
                openPicker("Clock In", clockIn ?? "", clockInChoices, value => setClockInText(formatTime12h(value)))
              }
              styles={styles}
            />
          </View>

          <View style={styles.timeColumn}>
            <TimeInputField
              label="Clock Out"
              value={clockOutText}
              onChangeText={setClockOutText}
              onBlur={() => { if (clockOut) setClockOutText(formatTime12h(clockOut)); }}
              invalid={!clockOut}
              onPress={() =>
                openPicker("Clock Out", clockOut ?? "", clockOutChoices, value => setClockOutText(formatTime12h(value)))
              }
              styles={styles}
            />
          </View>
        </View>

        <Text style={styles.timeHint}>Examples: 7:30 AM, 3:45 PM, or 15:45 (24-hour). Include AM/PM for 12-hour times.</Text>

        <SelectField
          label="Unpaid Break"
          value={
            breakMinutes === 0 ? "No unpaid break" : `${breakMinutes} minutes`
          }
          onPress={() =>
            openPicker(
              "Unpaid Break",
              String(breakMinutes),
              breakChoices,
              value => setBreakMinutes(Number(value))
            )
          }
          styles={styles}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional — shared with your team)</Text>
          <Text style={styles.timeHint}>Notes on saved entries sync to Team Hours when your account has team access. Do not include private or pay information.</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add a note"
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
          />
        </View>

        {preview && clockIn && clockOut ? <View style={styles.preview}>
          <View style={styles.previewTop}>
            <View>
              <Text style={styles.previewLabel}>ENTRY PREVIEW</Text>
              <Text style={styles.previewShift}>
                {formatTime12h(clockIn)} – {formatTime12h(clockOut)}
              </Text>
            </View>
            <Text style={styles.previewDate}>{weekdayDateLabel(date)}</Text>
          </View>

          <View style={styles.statsRow}>
            <Stat
              label="Straight"
              value={`${preview.regularHours.toFixed(2)} hrs`}
              color={colors.green}
              styles={styles}
            />
            <Stat
              label="Overtime"
              value={`${preview.overtimeHours.toFixed(2)} hrs`}
              color={colors.orange}
              styles={styles}
            />
            <Stat
              label="Paid"
              value={`${preview.paidHours.toFixed(2)} hrs`}
              styles={styles}
            />
          </View>

          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Estimated pay</Text>
            <Text style={styles.payValue}>{formatMoney(preview.totalPay)}</Text>
          </View>
        </View> : <Text accessibilityLiveRegion="polite" style={styles.timeError}>Enter two valid times to see the hours and pay preview.</Text>}

        <AnimatedPressable accessibilityRole="button" style={[styles.button, (!clockIn || !clockOut || deleting) && { opacity: 0.5 }]} disabled={deleting || !clockIn || !clockOut} onPress={save}>
          <Text style={styles.buttonText}>
            {editing ? "SAVE CHANGES" : "SAVE ENTRY"}
          </Text>
        </AnimatedPressable>

        {editing && (
          <AnimatedPressable accessibilityRole="button" style={[styles.deleteButton, deleting && { opacity: 0.5 }]} disabled={deleting} onPress={() => void confirmDelete()}>
            <Text style={styles.deleteText}>{deleting ? "DELETING…" : "DELETE ENTRY"}</Text>
          </AnimatedPressable>
        )}
        {!!deleteError && <Text accessibilityRole="alert" style={[styles.deleteText, { marginTop: 10 }]}>{deleteError}</Text>}
      </ScrollView>

      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <AnimatedPressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPicker(null)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Choose {picker?.title ?? ""}
              </Text>
              <AnimatedPressable style={styles.closeButton} onPress={() => setPicker(null)}>
                <Text style={styles.closeText}>×</Text>
              </AnimatedPressable>
            </View>

            <FlatList
              data={picker?.choices ?? []}
              keyExtractor={item => item.value}
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              initialNumToRender={24}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.value === picker?.value;

                return (
                  <AnimatedPressable
                    style={[
                      styles.option,
                      selected && styles.optionSelected,
                    ]}
                    onPress={() => {
                      picker?.onSelect(item.value);
                      setPicker(null);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionText,
                          selected && { color: colors.green },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {!!item.detail && (
                        <Text style={styles.optionDetail}>{item.detail}</Text>
                      )}
                    </View>
                    {selected && <Text style={styles.check}>✓</Text>}
                  </AnimatedPressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TimeInputField({ label, value, onChangeText, onBlur, invalid, onPress, styles }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  invalid: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.timeInputContainer}>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint="Type a time with AM or PM, or a 24-hour time. Use the adjacent button for a list."
        style={styles.timeInput}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCorrect={false}
        autoCapitalize="characters"
        selectTextOnFocus
        returnKeyType="done"
      />
      <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Choose ${label} from list`} style={styles.timeDropdown} onPress={onPress}>
        <Text style={styles.chevron}>⌄</Text>
      </AnimatedPressable>
    </View>
    {invalid && <Text accessibilityLiveRegion="polite" style={styles.timeError}>Use a valid time, e.g. 7:30 AM.</Text>}
  </View>;
}

function SelectField({
  label,
  value,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedPressable style={styles.select} onPress={onPress}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </AnimatedPressable>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: string;
  color?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.stat, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 20, paddingBottom: 40 },
    back: { color: colors.green, fontWeight: "800", marginTop: 10 },
    top: { marginVertical: 18 },
    header: { fontSize: 28, fontWeight: "900", color: colors.text },
    subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
    editNotice: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 13,
      marginBottom: 14,
    },
    editNoticeTitle: { color: colors.text, fontWeight: "900" },
    editNoticeText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    timeRow: { flexDirection: "row", gap: 10 },
    timeColumn: { flex: 1, minWidth: 0 },
    timeInputContainer: { flexDirection: "row", alignItems: "center", minHeight: 52, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 11, overflow: "hidden" },
    timeInput: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, fontWeight: "800", color: colors.text },
    timeDropdown: { width: 44, minHeight: 50, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: colors.border },
    timeHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 14 },
    timeError: { color: colors.red, fontSize: 12, lineHeight: 18, marginTop: 5 },
    field: { marginBottom: 14 },
    label: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6,
    },
    select: {
      minHeight: 52,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    selectText: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    chevron: { color: colors.muted, fontSize: 22, marginTop: -4 },
    input: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    notes: { minHeight: 86 },
    preview: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    },
    previewLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.7,
    },
    previewShift: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 18,
      marginTop: 4,
    },
    previewDate: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    statsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "800",
    },
    stat: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 15,
      marginTop: 3,
    },
    payRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 14,
      paddingTop: 13,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    payLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
    payValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
    button: {
      backgroundColor: colors.green,
      borderRadius: 12,
      padding: 17,
      alignItems: "center",
      marginTop: 15,
    },
    buttonText: { color: colors.onPrimary, fontWeight: "900" },
    deleteButton: {
      borderWidth: 1,
      borderColor: colors.red,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginTop: 10,
      backgroundColor: colors.surface,
    },
    deleteText: { color: colors.red, fontWeight: "900" },
    scanButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 11, padding: 14, alignItems: "center", marginBottom: 14 },
    scanText: { color: colors.green, fontWeight: "900", fontSize: 12 },
    weekdayModeNotice: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.green,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 14,
      padding: 13,
    },
    weekdayModeTitle: { color: colors.green, fontWeight: "900" },
    weekdayModeText: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      maxHeight: "72%",
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    modalHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceAlt,
    },
    closeText: { color: colors.text, fontSize: 28, lineHeight: 30 },
    optionList: { flexGrow: 0 },
    optionListContent: { padding: 8 },
    option: {
      minHeight: 50,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    optionSelected: { backgroundColor: colors.surfaceAlt },
    optionText: { color: colors.text, fontSize: 15, fontWeight: "700" },
    optionDetail: { color: colors.muted, fontSize: 11, marginTop: 2 },
    check: { color: colors.green, fontWeight: "900", fontSize: 20 },
  });
import { ComingSoonScan } from "../src/components/ComingSoonScan";
