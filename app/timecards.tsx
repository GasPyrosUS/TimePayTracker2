import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AnimatedPressable } from "../src/components/AnimatedPressable";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import { dateLabel, formatMoney } from "../src/lib/overtime";
import { exportTimeCardCsv } from "../src/lib/exportTimeCard";
import { loadTimeCards } from "../src/lib/storage";
import { SavedTimeCard } from "../src/types/models";

export default function TimeCards() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cards, setCards] = useState<SavedTimeCard[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const saved = await loadTimeCards();
    setCards(saved.sort((a, b) => b.periodStart.localeCompare(a.periodStart)));
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function exportCard(card: SavedTimeCard) {
    try {
      setExportingId(card.id);
      await exportTimeCardCsv(card);
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Unable to export this time card.");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <AnimatedPressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>

        <Text style={styles.header}>Saved Time Cards</Text>
        <Text style={styles.subtitle}>
          Completed pay periods are saved automatically. You can also save the current period manually.
        </Text>

        {cards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No saved time cards yet</Text>
            <Text style={styles.emptyText}>
              Save the current pay period from the Pay Period screen, or let the app archive it automatically when the period ends.
            </Text>
          </View>
        ) : (
          cards.map(card => (
            <View key={card.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.period}>
                    {dateLabel(card.periodStart)} – {dateLabel(card.periodEnd)}
                  </Text>
                  <Text style={styles.meta}>
                    {card.source === "automatic" ? "Saved automatically" : "Saved manually"} • {card.entries.length} {card.entries.length === 1 ? "entry" : "entries"}
                  </Text>
                </View>
                <Text style={styles.gross}>{formatMoney(card.grossPay)}</Text>
              </View>

              <View style={styles.metrics}>
                <Metric label="Straight" value={`${card.regularHours.toFixed(2)} hrs`} color={colors.green} styles={styles} />
                <Metric label="Overtime" value={`${card.overtimeHours.toFixed(2)} hrs`} color={colors.orange} styles={styles} />
                <Metric label="Paid" value={`${card.paidHours.toFixed(2)} hrs`} styles={styles} />
              </View>

              <AnimatedPressable
                style={styles.exportButton}
                onPress={() => void exportCard(card)}
                disabled={exportingId === card.id}
              >
                <Text style={styles.exportText}>
                  {exportingId === card.id ? "PREPARING CSV…" : "EXPORT CSV"}
                </Text>
              </AnimatedPressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, color, styles }: { label: string; value: string; color?: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  back: { color: colors.green, fontWeight: "800", marginTop: 10 },
  header: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 18 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20 },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  emptyText: { color: colors.muted, marginTop: 6, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  period: { color: colors.text, fontSize: 17, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  gross: { color: colors.text, fontSize: 20, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 14 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 3 },
  exportButton: { borderWidth: 1, borderColor: colors.green, borderRadius: 11, padding: 13, alignItems: "center", marginTop: 12 },
  exportText: { color: colors.green, fontWeight: "900" },
});
