import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AccountPanel } from "../src/components/AccountPanel";
import { AnimatedPressable } from "../src/components/AnimatedPressable";
import { useAccount } from "../src/context/AccountContext";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import { loadEntries, saveEntries } from "../src/lib/storage";
import { captureStorageScope } from "../src/lib/storageScope";
import {
  calculatePayPeriodTotals,
  dateLabel,
  formatMoney,
  getPayPeriodDates,
} from "../src/lib/overtime";
import { ensureCurrentPayPeriod } from "../src/lib/timeCards";
import { formatTime12h } from "../src/lib/timeFormat";
import { firebaseMessage } from "../src/services/firebaseErrors";
import { loadMembership, watchHours } from "../src/services/firestoreTeam";
import {
  createTeamHoursEntry,
  partitionTeamHoursImports,
} from "../src/services/teamHoursImport";
import { TeamHoursRecord } from "../src/types/models";

type ReviewItem = {
  record: TeamHoursRecord;
  duplicate: boolean;
  selected: boolean;
};

export default function TeamHours() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAccount();
  const [records, setRecords] = useState<TeamHoursRecord[]>([]);
  const [message, setMessage] = useState("");
  const [cached, setCached] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setRecords([]);
      setMessage("");
      setCached(true);
      setSelectedIds([]);
      setReviewOpen(false);
      if (!user) return;
      let active = true;
      let unsubscribe: (() => void) | undefined;
      // Verify membership online before subscribing so another account cannot
      // briefly inherit a previous account's in-memory Firestore cache.
      void loadMembership(user.uid)
        .then(() => {
          if (!active) return;
          unsubscribe = watchHours(
            (rows, fromCache) => {
              if (active) {
                setRecords(rows);
                setCached(fromCache);
                setMessage("");
              }
            },
            error => {
              if (active) {
                setRecords([]);
                setMessage(firebaseMessage(error));
              }
            }
          );
        })
        .catch(error => {
          if (active) {
            setRecords([]);
            setMessage(firebaseMessage(error));
          }
        });
      return () => {
        active = false;
        unsubscribe?.();
      };
    }, [user?.uid, refresh])
  );

  useEffect(() => {
    const available = new Set(
      records.filter(record => record.userId !== user?.uid).map(record => record.id)
    );
    setSelectedIds(current => current.filter(id => available.has(id)));
  }, [records, user?.uid]);

  const selectedRecords = useMemo(
    () =>
      records.filter(
        record => record.userId !== user?.uid && selectedIds.includes(record.id)
      ),
    [records, selectedIds, user?.uid]
  );

  function toggleSelected(recordId: string) {
    setSelectedIds(current =>
      current.includes(recordId)
        ? current.filter(id => id !== recordId)
        : [...current, recordId]
    );
  }

  async function openReview() {
    if (!selectedRecords.length) return;
    const entries = await loadEntries();
    const { duplicateIds } = partitionTeamHoursImports(selectedRecords, entries);
    setReviewItems(
      selectedRecords.map(record => ({
        record,
        duplicate: duplicateIds.has(record.id),
        selected: true,
      }))
    );
    setReviewOpen(true);
  }

  async function importReviewed() {
    if (importing) return;
    const isCurrent = captureStorageScope();
    setImporting(true);
    try {
      const { settings } = await ensureCurrentPayPeriod();
      if (!isCurrent()) return;
      const currentEntries = await loadEntries();
      if (!isCurrent()) return;
      const beforeTotals = calculatePayPeriodTotals(currentEntries, settings);
      const reviewed = reviewItems
        .filter(item => item.selected)
        .map(item => item.record);
      const { ready } = partitionTeamHoursImports(reviewed, currentEntries);

      if (!ready.length) {
        Alert.alert(
          "No new hours to import",
          "Every selected shift is already in your entries or was removed from this review."
        );
        return;
      }

      const startedAt = Date.now();
      const imported = ready.map((record, index) =>
        createTeamHoursEntry(record, new Date(startedAt + index).toISOString())
      );
      const updatedEntries = [...currentEntries, ...imported];
      await saveEntries(updatedEntries);
      if (!isCurrent()) return;

      const afterTotals = calculatePayPeriodTotals(updatedEntries, settings);
      const periodDates = new Set(getPayPeriodDates(settings.periodStart));
      const currentPeriodImports = imported.filter(entry => periodDates.has(entry.date));
      const outsideCurrentPeriod = imported.length - currentPeriodImports.length;
      const straightAdded = afterTotals.regularHours - beforeTotals.regularHours;
      const overtimeAdded = afterTotals.overtimeHours - beforeTotals.overtimeHours;
      const grossAdded =
        afterTotals.estimatedGrossPay - beforeTotals.estimatedGrossPay;

      setReviewOpen(false);
      setSelectedIds([]);
      Alert.alert(
        "Team hours imported",
        `${imported.length} reviewed ${
          imported.length === 1 ? "shift was" : "shifts were"
        } added.\n\nCurrent pay period update:\nStraight time: +${straightAdded.toFixed(
          2
        )} hrs\nOvertime: +${overtimeAdded.toFixed(
          2
        )} hrs\nEstimated gross pay: +${formatMoney(grossAdded)}${
          outsideCurrentPeriod
            ? `\n\n${outsideCurrentPeriod} imported ${
                outsideCurrentPeriod === 1 ? "shift is" : "shifts are"
              } outside the current pay period and remains saved without changing current totals.`
            : ""
        }\n\nYour private rates and pay stayed local.`
      );
      // Return to Dashboard so the newly persisted local straight time,
      // overtime and estimated gross pay are visible immediately.
      router.replace("/");
    } catch {
      Alert.alert(
        "Import not completed",
        "The selected team hours could not be added. Please try again."
      );
    } finally {
      if (isCurrent()) setImporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <AnimatedPressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>
        <Text style={styles.header}>Team Hours</Text>
        <Text style={styles.subtitle}>
          Shared work hours and entry notes. Pay rates and pay totals are not
          shared. Keep private or pay information out of notes.
        </Text>
        <AccountPanel />
        {!!user && (
          <AnimatedPressable
            onPress={() => setRefresh(value => value + 1)}
            style={styles.notice}
          >
            <Text style={styles.noticeTitle}>Refresh Team Hours</Text>
            <Text style={styles.noticeText}>
              {cached
                ? "Waiting for server confirmation — displayed data may be cached."
                : "Live team hours from Firestore"}
            </Text>
          </AnimatedPressable>
        )}
        {!!user && (
          <View style={styles.importPanel}>
            <Text style={styles.importTitle}>Import coworker hours</Text>
            <Text style={styles.importText}>
              Select one or more coworker shifts below, then review them before
              adding anything to your entries. Pay and rates are never imported.
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              disabled={!selectedRecords.length}
              style={[
                styles.reviewButton,
                !selectedRecords.length && styles.disabledButton,
              ]}
              onPress={() => void openReview()}
            >
              <Text style={styles.reviewButtonText}>
                {selectedRecords.length
                  ? `REVIEW ${selectedRecords.length} SELECTED ${
                      selectedRecords.length === 1 ? "SHIFT" : "SHIFTS"
                    }`
                  : "SELECT COWORKER HOURS BELOW"}
              </Text>
            </AnimatedPressable>
          </View>
        )}
        {!!message && <Text style={styles.error}>{message}</Text>}
        {records.map(record => {
          const canImport = record.userId !== user?.uid;
          const selected = selectedIds.includes(record.id);
          return (
            <View key={record.id} style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.name}>{record.memberName}</Text>
                <Text style={styles.date}>{dateLabel(record.date)}</Text>
              </View>
              <Text style={styles.shift}>
                {formatTime12h(record.clockIn)}–{formatTime12h(record.clockOut)}
                {record.breakMinutes > 0 ? ` • ${record.breakMinutes} min break` : ""}
              </Text>
              <View style={styles.metrics}>
                <Text style={styles.metric}>{record.regularHours.toFixed(2)} ST</Text>
                <Text style={[styles.metric, { color: colors.orange }]}>
                  {record.overtimeHours.toFixed(2)} OT
                </Text>
                <Text style={styles.total}>{record.totalHours.toFixed(2)} total</Text>
              </View>
              {!!record.notes?.trim() && (
                <View style={styles.notes}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text selectable style={styles.notesText}>
                    {record.notes}
                  </Text>
                </View>
              )}
              {canImport && (
                <AnimatedPressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  style={[styles.selectButton, selected && styles.selectButtonActive]}
                  onPress={() => toggleSelected(record.id)}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      selected && { color: colors.onPrimary },
                    ]}
                  >
                    {selected ? "✓ SELECTED TO IMPORT" : "+ SELECT HOURS TO IMPORT"}
                  </Text>
                </AnimatedPressable>
              )}
            </View>
          );
        })}
        {!!user && !records.length && !message && (
          <Text style={styles.empty}>
            {cached ? "Connecting to your team…" : "No shared hours yet."}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={reviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !importing && setReviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Review Team Hours Import</Text>
              <Text style={styles.modalText}>
                Confirm the dates, clock times, and breaks below. Shared ST/OT
                totals are shown for reference only; your app recalculates them
                with your private settings after import.
              </Text>
              {reviewItems.map((item, index) => (
                <View
                  key={item.record.id}
                  style={[styles.reviewCard, item.duplicate && styles.duplicateCard]}
                >
                  <View style={styles.top}>
                    <Text style={styles.name}>{item.record.memberName}</Text>
                    <Text style={styles.date}>{dateLabel(item.record.date)}</Text>
                  </View>
                  <Text style={styles.shift}>
                    {formatTime12h(item.record.clockIn)}–
                    {formatTime12h(item.record.clockOut)} • {item.record.breakMinutes} min
                    break
                  </Text>
                  <Text style={styles.reviewMetadata}>
                    Shared summary: {item.record.regularHours.toFixed(2)} ST • {" "}
                    {item.record.overtimeHours.toFixed(2)} OT • {" "}
                    {item.record.totalHours.toFixed(2)} total
                  </Text>
                  {item.duplicate ? (
                    <Text style={styles.duplicateText}>
                      Already in your entries — this shift will be skipped.
                    </Text>
                  ) : (
                    <AnimatedPressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.selected }}
                      style={styles.reviewToggle}
                      onPress={() =>
                        setReviewItems(current =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, selected: !candidate.selected }
                              : candidate
                          )
                        )
                      }
                    >
                      <Text style={styles.reviewToggleText}>
                        {item.selected ? "☑ Import this shift" : "☐ Do not import"}
                      </Text>
                    </AnimatedPressable>
                  )}
                </View>
              ))}
              <View style={styles.modalActions}>
                <AnimatedPressable
                  disabled={importing}
                  style={styles.cancelButton}
                  onPress={() => setReviewOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  disabled={importing}
                  style={[styles.importButton, importing && styles.disabledButton]}
                  onPress={() => void importReviewed()}
                >
                  <Text style={styles.importButtonText}>
                    {importing ? "IMPORTING…" : "CONFIRM IMPORT"}
                  </Text>
                </AnimatedPressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 20, paddingBottom: 40 },
    back: { color: colors.green, fontWeight: "800", marginTop: 10 },
    header: { fontSize: 28, fontWeight: "900", color: colors.text, marginTop: 18 },
    subtitle: { color: colors.muted, lineHeight: 19, marginTop: 5, marginBottom: 16 },
    notice: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
    },
    noticeTitle: { color: colors.text, fontWeight: "900" },
    noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
    importPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 13,
      padding: 15,
      marginBottom: 14,
    },
    importTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
    importText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
    reviewButton: {
      backgroundColor: colors.green,
      borderRadius: 10,
      padding: 13,
      alignItems: "center",
      marginTop: 12,
    },
    reviewButtonText: { color: colors.onPrimary, fontSize: 11, fontWeight: "900" },
    disabledButton: { opacity: 0.5 },
    error: { color: colors.red, marginBottom: 12 },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 13,
      padding: 15,
      marginBottom: 9,
    },
    top: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    name: { color: colors.text, fontWeight: "900", fontSize: 16, flexShrink: 1 },
    date: { color: colors.muted, fontWeight: "700" },
    shift: { color: colors.text, fontWeight: "800", marginTop: 8 },
    metrics: { flexDirection: "row", gap: 14, marginTop: 10, alignItems: "center" },
    metric: { color: colors.green, fontWeight: "900", fontSize: 12 },
    total: { color: colors.text, fontWeight: "900", marginLeft: "auto", fontSize: 12 },
    notes: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    notesLabel: { color: colors.muted, fontWeight: "700", marginBottom: 4 },
    notesText: { color: colors.text, lineHeight: 21 },
    selectButton: {
      borderColor: colors.green,
      borderWidth: 1,
      borderRadius: 9,
      padding: 11,
      alignItems: "center",
      marginTop: 12,
    },
    selectButtonActive: { backgroundColor: colors.green },
    selectButtonText: { color: colors.green, fontSize: 11, fontWeight: "900" },
    empty: { color: colors.muted, textAlign: "center", padding: 24 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.62)",
      justifyContent: "center",
      padding: 18,
    },
    modalCard: {
      maxHeight: "88%",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      overflow: "hidden",
    },
    modalContent: { padding: 18 },
    modalTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
    modalText: { color: colors.muted, lineHeight: 19, marginTop: 6, marginBottom: 14 },
    reviewCard: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 13,
      marginBottom: 10,
    },
    duplicateCard: { borderColor: colors.orange },
    reviewMetadata: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
    duplicateText: { color: colors.orange, fontWeight: "800", fontSize: 12, marginTop: 9 },
    reviewToggle: { paddingVertical: 10 },
    reviewToggleText: { color: colors.green, fontWeight: "900" },
    modalActions: { flexDirection: "row", gap: 9, marginTop: 6 },
    cancelButton: {
      flex: 1,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 11,
      padding: 14,
      alignItems: "center",
    },
    cancelButtonText: { color: colors.text, fontWeight: "900" },
    importButton: {
      flex: 1,
      backgroundColor: colors.green,
      borderRadius: 11,
      padding: 14,
      alignItems: "center",
    },
    importButtonText: { color: colors.onPrimary, fontWeight: "900" },
  });
