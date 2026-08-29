import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../context/ThemeContext";
import { ThemeColors } from "../data/theme";

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "orange";
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          tone === "green" && { color: colors.green },
          tone === "orange" && { color: colors.orange },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 4,
    },
    label: { color: colors.muted, fontSize: 12, marginBottom: 5 },
    value: { color: colors.text, fontWeight: "800", fontSize: 18 },
  });
