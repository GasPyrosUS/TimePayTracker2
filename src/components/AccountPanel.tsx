import React, { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebase } from "../services/firebase";
import { teamId } from "../services/firebaseConfig";
import { firebaseMessage } from "../services/firebaseErrors";
import { registerAccount } from "../services/registration";
import { useAccount } from "../context/AccountContext";
import { useAppTheme } from "../context/ThemeContext";
import { AnimatedPressable } from "./AnimatedPressable";

export function AccountPanel() {
  const { colors } = useAppTheme();
  const { user, syncStatus, retry } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [registering, setRegistering] = useState(false);
  const acting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "login" | "register" | "reset" | "logout") {
    if (acting.current) return;
    acting.current = true;
    setBusy(true); setMessage("");
    try {
      const { auth } = getFirebase();
      if (action === "login") { await signInWithEmailAndPassword(auth, email.trim(), password); setPassword(""); }
      if (action === "register") { await registerAccount(auth, email, password, confirmation); setPassword(""); setConfirmation(""); }
      if (action === "reset") { await sendPasswordResetEmail(auth, email.trim()); setMessage("If this account is eligible, a password reset email will arrive shortly."); }
      if (action === "logout") await signOut(auth);
    } catch (error) { setMessage(firebaseMessage(error)); }
    finally { acting.current = false; setBusy(false); }
  }
  const input = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, borderRadius: 10, padding: 13 };
  const button = { padding: 14, borderRadius: 10, backgroundColor: colors.green, opacity: busy ? 0.5 : 1 };
  return <View style={{ padding: 15, backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, gap: 12, marginBottom: 16 }}>
    <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>{user ? "Team account" : registering ? "Create your account" : "Sign in to your team"}</Text>
    <Text style={{ color: colors.muted }}>Team: {teamId}</Text>
    {user ? <>
      <Text style={{ color: colors.text }}>{user.email}</Text>
      <Text selectable style={{ color: colors.muted, fontSize: 12 }}>Firebase UID: {user.uid}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>New accounts need team approval. Send your email or UID to your administrator so they can add your membership. Creating an account does not grant access to coworkers' hours or notes.</Text>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.muted }}>{syncStatus}</Text>
      <AnimatedPressable onPress={retry} style={button}><Text style={{ color: colors.onPrimary, fontWeight: "900" }}>RETRY SYNC</Text></AnimatedPressable>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Private cards, pay and running clock sessions stay on this device under your account. Sign back into the same account to see them. Team Hours is the cross-device view.</Text>
      <AnimatedPressable disabled={busy} onPress={() => void act("logout")}><Text style={{ color: colors.green, paddingVertical: 8 }}>Sign out (keeps local data)</Text></AnimatedPressable>
    </> : <>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>Sign in or create an account. After administrator approval, saved work hours and entry notes are shared with your team. Pay rates and pay totals stay private. Do not put private or pay information in notes.</Text>
      <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={input} />
      <TextInput accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} secureTextEntry autoComplete={registering ? "new-password" : "current-password"} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} style={input} />
      {registering && <TextInput accessibilityLabel="Confirm password" autoCapitalize="none" autoCorrect={false} secureTextEntry autoComplete="new-password" value={confirmation} onChangeText={setConfirmation} placeholder="Confirm password" placeholderTextColor={colors.muted} style={input} />}
      <AnimatedPressable accessibilityRole="button" disabled={busy || !email.trim() || !password || (registering && !confirmation)} onPress={() => void act(registering ? "register" : "login")} style={button}><Text style={{ color: colors.onPrimary, fontWeight: "900" }}>{busy ? "PLEASE WAIT…" : registering ? "CREATE ACCOUNT" : "SIGN IN & SHARE HOURS"}</Text></AnimatedPressable>
      <AnimatedPressable accessibilityRole="button" disabled={busy} onPress={() => { setRegistering(!registering); setMessage(""); setPassword(""); setConfirmation(""); }}><Text style={{ color: colors.green, paddingVertical: 8 }}>{registering ? "Already have an account? Sign in" : "New here? Create an account"}</Text></AnimatedPressable>
      <AnimatedPressable disabled={busy || !email.trim()} onPress={() => void act("reset")}><Text style={{ color: colors.green, paddingVertical: 8 }}>Send password reset email</Text></AnimatedPressable>
    </>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{message}</Text>}
  </View>;
}
