import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../data/theme";

export function StartupScreen({ colors }: { colors: ThemeColors }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={[styles.root, { backgroundColor: colors.navy }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fade, transform: [{ translateY: rise }] },
        ]}
      >
        <View
          style={[
            styles.logo,
            {
              backgroundColor: colors.navy2,
              borderColor: "rgba(255,255,255,0.13)",
            },
          ]}
        >
          <Ionicons name="time-outline" size={44} color={colors.green} />
        </View>

        <Text style={styles.eyebrow}>WORKFORCE TIMEKEEPING</Text>
        <Text style={styles.title}>Time & Pay Tracker</Text>
        <Text style={styles.subtitle}>
          Accurate hours. Clear overtime. Better pay visibility.
        </Text>

        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.loadingText}>Preparing your workspace</Text>
        </View>
      </Animated.View>

      <Text style={styles.footer}>TIME & PAY TRACKER • V1.4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  content: {
    alignItems: "center",
    maxWidth: 380,
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  eyebrow: {
    color: "#A9B8C9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 9,
    textAlign: "center",
  },
  subtitle: {
    color: "#AFC0D1",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 34,
  },
  loadingText: {
    color: "#D7E1EB",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 34,
    color: "#6F8398",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
});
