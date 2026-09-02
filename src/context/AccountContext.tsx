import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, SafeAreaView, Text, View } from "react-native";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebase } from "../services/firebase";
import { hasUnclaimedData, selectStorageScope } from "../lib/storageScope";
import { loadEntries, subscribeEntries } from "../lib/storage";
import { loadMembership, publishLocalHours } from "../services/firestoreTeam";
import { firebaseMessage } from "../services/firebaseErrors";
import { useAppTheme } from "./ThemeContext";
import { AnimatedPressable } from "../components/AnimatedPressable";

const Context = createContext<{ user: User | null; syncStatus: string; retry: () => void }>({
  user: null, syncStatus: "Sign in to share hours.", retry: () => {},
});
export const useAccount = () => useContext(Context);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [scope, setScope] = useState<string | null>(null);
  const [claim, setClaim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("Sign in to share hours.");
  const retryRequest = useRef<() => void>(() => {});

  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(getFirebase().auth, next => {
      const ticket = ++generation;
      setScope(null); setClaim(false); setError(""); setUser(next);
      void (async () => {
        if (next && await hasUnclaimedData()) {
          if (ticket === generation) setClaim(true);
          return;
        }
        if (ticket !== generation) return;
        const selected = await selectStorageScope(next?.uid || null);
        if (ticket === generation) setScope(selected);
      })().catch(e => { if (ticket === generation) setError(firebaseMessage(e)); });
    });
    return () => { generation++; unsubscribe(); };
  }, []);

  async function chooseLegacy(importExisting: boolean) {
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      const selected = await selectStorageScope(user.uid, importExisting);
      setClaim(false); setScope(selected);
    } catch (e) { setError(firebaseMessage(e)); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!user || !scope || claim) { setSyncStatus("Sign in to share hours."); return; }
    let cancelled = false;
    let running = false;
    let dirty = false;
    async function request() {
      dirty = true;
      if (running || cancelled) return;
      running = true;
      try {
        while (dirty && !cancelled) {
          dirty = false;
          setSyncStatus("Syncing hours… If offline, changes will wait for a connection.");
          const member = await loadMembership(user!.uid);
          if (cancelled) return;
          const entries = await loadEntries();
          if (cancelled) return;
          await publishLocalHours(user!.uid, member, entries, () => cancelled);
          if (!cancelled) setSyncStatus(`Hours synced • ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
        }
      } catch (e) { if (!cancelled) setSyncStatus(firebaseMessage(e)); }
      finally { running = false; }
    }
    const unsubscribe = subscribeEntries(() => { void request(); });
    retryRequest.current = () => { void request(); };
    const foreground = AppState.addEventListener("change", state => { if (state === "active") void request(); });
    const interval = setInterval(() => { if (AppState.currentState !== "background") void request(); }, 60000);
    void request();
    return () => { cancelled = true; retryRequest.current = () => {}; unsubscribe(); foreground.remove(); clearInterval(interval); };
  }, [user?.uid, scope, claim]);

  if (!scope || claim) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><View style={{ padding: 24, gap: 16 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>{claim ? "Keep your existing time cards" : "Opening your account…"}</Text>
      {claim && <>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>Signed in as {user?.email}. Do the entries and private pay settings already on this device belong to you? If yes, they will be copied to this account and work hours and entry notes will be shared after team approval. Rates, pay and saved card files stay private on this device. Keep private or pay information out of notes. The originals remain as a backup.</Text>
        <AnimatedPressable disabled={busy} onPress={() => void chooseLegacy(true)} style={{ padding: 16, backgroundColor: colors.green, borderRadius: 12 }}><Text style={{ color: colors.onPrimary, fontWeight: "900" }}>YES — USE MY EXISTING DATA</Text></AnimatedPressable>
        <AnimatedPressable disabled={busy} onPress={() => void chooseLegacy(false)} style={{ padding: 16 }}><Text style={{ color: colors.text }}>No — start this account empty</Text></AnimatedPressable>
      </>}
      {!!error && <Text style={{ color: colors.red }}>{error}</Text>}
      {(claim || !!error) && <AnimatedPressable disabled={busy} onPress={() => void signOut(getFirebase().auth).catch(e => setError(firebaseMessage(e)))}><Text style={{ color: colors.green }}>Sign out</Text></AnimatedPressable>}
    </View></SafeAreaView>;
  }

  return <Context.Provider value={{ user, syncStatus, retry: () => retryRequest.current() }}>
    <React.Fragment key={scope}>{children}</React.Fragment>
  </Context.Provider>;
}
