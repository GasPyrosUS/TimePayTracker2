import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "../src/context/ThemeContext";
import { ThemeColors } from "../src/data/theme";
import { formatTime12h } from "../src/lib/timeFormat";
import { loadEntries, saveEntries } from "../src/lib/storage";
import { captureStorageScope } from "../src/lib/storageScope";
import { timesheetOcrService, validateImportedRow } from "../src/services/timesheetOcr";
import { ImportedTimeEntry } from "../src/types/models";

export default function ScanTimesheet() {
 const { colors } = useAppTheme(); const styles = useMemo(() => createStyles(colors), [colors]);
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
  <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
  <Text style={styles.header}>Scan Timesheet</Text>
  <Text style={styles.subtitle}>Coming soon. Photo scanning and timesheet importing are not available in this release. Please use Add Time Entry to enter hours manually.</Text>
  <View style={styles.actions}>
   {Platform.OS !== "web" && <ComingSoonScan label="TAKE PHOTO" />}
   <ComingSoonScan label={Platform.OS === "web" ? "UPLOAD IMAGE" : "CHOOSE PHOTO"} />
  </View>
 </ScrollView></SafeAreaView>;
}

// Retained for future OCR integration; not mounted or reachable in this release.
function ScanTimesheetPreview(){
 const {colors}=useAppTheme(); const styles=useMemo(()=>createStyles(colors),[colors]);
 const [rows,setRows]=useState<ImportedTimeEntry[]>([]); const [busy,setBusy]=useState(false);
 async function choose(camera:boolean){
  if(camera){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted){Alert.alert("Camera permission needed","Camera access is used only to photograph a timesheet.");return;}}
  const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.9}):await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:.9});
  if(result.canceled)return; setBusy(true);
  try{setRows(await timesheetOcrService.scan(result.assets[0].uri));}catch(e){Alert.alert("Scan not available",e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}
 }
 function update(id:string,field:"date"|"clockIn"|"clockOut"|"breakMinutes",value:string){setRows(old=>old.map(row=>row.id!==id?row:validateImportedRow({...row,[field]:field==="breakMinutes"?Number(value):value})));}
 async function importRows(){const isCurrent=captureStorageScope();const ready=rows.filter(r=>r.selected&&r.warnings.length===0);if(!ready.length){Alert.alert("Nothing ready to import","Correct flagged rows and select at least one entry.");return;}const current=await loadEntries();if(!isCurrent())return;await saveEntries([...current,...ready.map(r=>({id:`import-${Date.now()}-${r.id}`,date:r.date,clockIn:r.clockIn,clockOut:r.clockOut,breakMinutes:r.breakMinutes,notes:"Imported from timesheet photo"}))]);if(!isCurrent())return;Alert.alert("Entries imported",`${ready.length} reviewed ${ready.length===1?"entry":"entries"} added.`,[{text:"View Pay Period",onPress:()=>router.replace("/period")}]);}
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
  <Pressable onPress={()=>router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.header}>Scan Timesheet</Text><Text style={styles.subtitle}>Choose an image, then review every detected row before importing. Nothing is auto-saved.</Text>
  <View style={styles.actions}>{Platform.OS!=="web"&&<Pressable style={styles.primary} onPress={()=>void choose(true)}><Text style={styles.primaryText}>TAKE PHOTO</Text></Pressable>}<Pressable style={styles.secondary} onPress={()=>void choose(false)}><Text style={styles.secondaryText}>{Platform.OS==="web"?"UPLOAD IMAGE":"CHOOSE PHOTO"}</Text></Pressable></View>
  {!timesheetOcrService.configured&&<View style={styles.notice}><Text style={styles.noticeTitle}>OCR setup required</Text><Text style={styles.noticeText}>Set EXPO_PUBLIC_OCR_API_URL to your secure OCR adapter. No image leaves the device until you select one and start a scan.</Text></View>}
  {busy&&<Text style={styles.status}>Reading timesheet…</Text>}
  {!!rows.length&&<><Text style={styles.review}>Review Imported Entries</Text>{rows.map(row=><View key={row.id} style={styles.card}>
   <Pressable onPress={()=>setRows(old=>old.map(r=>r.id===row.id?{...r,selected:!r.selected}:r))}><Text style={styles.select}>{row.selected?"☑ Selected":"☐ Not selected"}</Text></Pressable>
   <Text style={styles.label}>Work date</Text><TextInput style={styles.input} value={row.date} onChangeText={v=>update(row.id,"date",v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted}/>
   <View style={styles.row}><View style={styles.half}><Text style={styles.label}>Clock in (HH:MM)</Text><TextInput style={styles.input} value={row.clockIn} onChangeText={v=>update(row.id,"clockIn",v)}/>{/^([01]\d|2[0-3]):[0-5]\d$/.test(row.clockIn)&&<Text style={styles.display}>{formatTime12h(row.clockIn)}</Text>}</View><View style={styles.half}><Text style={styles.label}>Clock out (HH:MM)</Text><TextInput style={styles.input} value={row.clockOut} onChangeText={v=>update(row.id,"clockOut",v)}/>{/^([01]\d|2[0-3]):[0-5]\d$/.test(row.clockOut)&&<Text style={styles.display}>{formatTime12h(row.clockOut)}</Text>}</View></View>
   <Text style={styles.label}>Break minutes</Text><TextInput style={styles.input} keyboardType="number-pad" value={String(row.breakMinutes)} onChangeText={v=>update(row.id,"breakMinutes",v)}/>{row.warnings.map(w=><Text key={w} style={styles.warning}>⚠ {w}</Text>)}
  </View>)}<Pressable style={styles.primary} onPress={()=>void importRows()}><Text style={styles.primaryText}>IMPORT REVIEWED ENTRIES</Text></Pressable></>}
 </ScrollView></SafeAreaView>;
}
const createStyles=(c:ThemeColors)=>StyleSheet.create({safe:{flex:1,backgroundColor:c.bg},container:{padding:20,paddingBottom:40},back:{color:c.green,fontWeight:"800",marginTop:10},header:{fontSize:28,fontWeight:"900",color:c.text,marginTop:18},subtitle:{color:c.muted,lineHeight:19,marginTop:5,marginBottom:16},actions:{gap:9},primary:{backgroundColor:c.green,padding:16,borderRadius:12,alignItems:"center",marginTop:8},primaryText:{color:c.onPrimary,fontWeight:"900"},secondary:{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,padding:15,borderRadius:12,alignItems:"center"},secondaryText:{color:c.text,fontWeight:"900"},notice:{backgroundColor:c.surfaceAlt,borderColor:c.border,borderWidth:1,borderRadius:12,padding:14,marginTop:15},noticeTitle:{color:c.text,fontWeight:"900"},noticeText:{color:c.muted,fontSize:12,lineHeight:18,marginTop:4},status:{color:c.muted,textAlign:"center",padding:20},review:{fontSize:20,fontWeight:"900",color:c.text,marginTop:22,marginBottom:10},card:{backgroundColor:c.surface,borderColor:c.border,borderWidth:1,borderRadius:13,padding:14,marginBottom:10},select:{color:c.green,fontWeight:"900",marginBottom:12},label:{color:c.muted,fontSize:11,fontWeight:"800",marginBottom:5,marginTop:7},input:{backgroundColor:c.input,borderColor:c.border,borderWidth:1,borderRadius:9,padding:11,color:c.text},row:{flexDirection:"row",gap:9},half:{flex:1},display:{color:c.muted,fontSize:11,marginTop:3},warning:{color:c.red,fontSize:12,marginTop:6}});
import { ComingSoonScan } from "../src/components/ComingSoonScan";
