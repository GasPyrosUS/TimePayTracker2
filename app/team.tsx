import React, { useCallback, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import { dateLabel } from "../src/lib/overtime";
import { formatTime12h } from "../src/lib/timeFormat";
import { loadMembership, watchHours } from "../src/services/firestoreTeam";
import { useAccount } from "../src/context/AccountContext";
import { AccountPanel } from "../src/components/AccountPanel";
import { firebaseMessage } from "../src/services/firebaseErrors";
import { TeamHoursRecord } from "../src/types/models";

export default function TeamHours() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<TeamHoursRecord[]>([]);
  const [message, setMessage] = useState("");
  const { user } = useAccount();
  const [cached, setCached] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    setRecords([]); setMessage(""); setCached(true);
    if (!user) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    // Verify membership online BEFORE subscribing, so a new non-member account
    // cannot briefly see the previous account's in-memory Firestore cache.
    void loadMembership(user.uid).then(() => {
      if (!active) return;
      unsubscribe = watchHours((rows, fromCache) => { if (active) { setRecords(rows); setCached(fromCache); setMessage(""); } },
        error => { if (active) { setRecords([]); setMessage(firebaseMessage(error)); } });
    }).catch(error => { if (active) { setRecords([]); setMessage(firebaseMessage(error)); } });
    return () => { active = false; unsubscribe?.(); };
  }, [user?.uid, refresh]));
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
    <Text style={styles.header}>Team Hours</Text>
    <Text style={styles.subtitle}>Shared work hours and entry notes. Pay rates and pay totals are not shared. Keep private or pay information out of notes.</Text>
    <AccountPanel />
    {!!user && <Pressable onPress={() => setRefresh(n => n + 1)} style={styles.notice}><Text style={styles.noticeTitle}>Refresh Team Hours</Text><Text style={styles.noticeText}>{cached ? "Waiting for server confirmation — displayed data may be cached." : "Live team hours from Firestore"}</Text></Pressable>}
    {!!message && <Text style={styles.error}>{message}</Text>}
    {records.map(record => <View key={record.id} style={styles.card}>
      <View style={styles.top}><Text style={styles.name}>{record.memberName}</Text><Text style={styles.date}>{dateLabel(record.date)}</Text></View>
      <Text style={styles.shift}>{formatTime12h(record.clockIn)}–{formatTime12h(record.clockOut)}</Text>
      <View style={styles.metrics}><Text style={styles.metric}>{record.regularHours.toFixed(2)} ST</Text><Text style={[styles.metric,{color:colors.orange}]}>{record.overtimeHours.toFixed(2)} OT</Text><Text style={styles.total}>{record.totalHours.toFixed(2)} total</Text></View>
      {!!record.notes?.trim() && <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}><Text style={{ color: colors.muted, fontWeight: "700", marginBottom: 4 }}>Notes</Text><Text selectable style={{ color: colors.text, lineHeight: 21 }}>{record.notes}</Text></View>}
    </View>)}
    {!!user && !records.length && !message && <Text style={styles.empty}>{cached ? "Connecting to your team…" : "No shared hours yet."}</Text>}
  </ScrollView></SafeAreaView>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({safe:{flex:1,backgroundColor:c.bg},container:{padding:20,paddingBottom:40},back:{color:c.green,fontWeight:"800",marginTop:10},header:{fontSize:28,fontWeight:"900",color:c.text,marginTop:18},subtitle:{color:c.muted,lineHeight:19,marginTop:5,marginBottom:16},notice:{backgroundColor:c.surfaceAlt,borderColor:c.border,borderWidth:1,borderRadius:12,padding:14,marginBottom:14},noticeTitle:{color:c.text,fontWeight:"900"},noticeText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:4},error:{color:c.red,marginBottom:12},card:{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:13,padding:15,marginBottom:9},top:{flexDirection:"row",justifyContent:"space-between",gap:10},name:{color:c.text,fontWeight:"900",fontSize:16},date:{color:c.muted,fontWeight:"700"},shift:{color:c.text,fontWeight:"800",marginTop:8},metrics:{flexDirection:"row",gap:14,marginTop:10,alignItems:"center"},metric:{color:c.green,fontWeight:"900",fontSize:12},total:{color:c.text,fontWeight:"900",marginLeft:"auto",fontSize:12},empty:{color:c.muted,textAlign:"center",padding:24}});
