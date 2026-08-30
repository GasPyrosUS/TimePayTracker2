import React from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "../context/ThemeContext";

export function ComingSoonScan({ label = "SCAN TIMESHEET", style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppTheme();
  return <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
    accessibilityLabel={`${label} — Coming soon`} style={[style, {
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt,
      borderRadius: 11, padding: 14, alignItems: "center", justifyContent: "center", gap: 5,
    }]}>
    <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}>COMING SOON</Text>
    <Text style={{ color: colors.muted, opacity: 0.65, fontWeight: "800", fontSize: 12 }}>{label}</Text>
  </Pressable>;
}
