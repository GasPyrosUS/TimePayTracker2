import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AppThemeProvider, useAppTheme } from "../src/context/ThemeContext";
import { StartupScreen } from "../src/components/StartupScreen";
import { ensureCurrentPayPeriod } from "../src/lib/timeCards";
import { AccountProvider } from "../src/context/AccountContext";

function AppShell() {
  const { colors, resolvedMode, ready } = useAppTheme();
  const [minimumSplashComplete, setMinimumSplashComplete] = useState(false);
  const [periodReady, setPeriodReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumSplashComplete(true), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    ensureCurrentPayPeriod().catch(error => {
      if (mounted) console.warn("Pay-period initialization could not finish.", error instanceof Error ? error.message : "Storage error");
    }).finally(() => { if (mounted) setPeriodReady(true); });
    return () => { mounted = false; };
  }, []);

  if (!ready || !minimumSplashComplete || !periodReady) {
    return <StartupScreen colors={colors} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
          navigationBarHidden: true,
        }}
      />
    </View>
  );
}

export default function Layout() {
  return (
    <AppThemeProvider>
      <AccountProvider><AppShell /></AccountProvider>
    </AppThemeProvider>
  );
}
