import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocFromServer, onSnapshot, writeBatch } from "firebase/firestore";
import { getFirebase } from "./firebase";
import { teamId } from "./firebaseConfig";
import { parseHours, planSync, projectHours } from "./sharedHours";
import type { TeamHoursRecord, TimeEntry } from "../types/models";

export type Membership = { displayName: string; role: "member" | "admin"; active: true };
export function parseMember(value: Record<string, unknown> | undefined): Membership {
  if (!value || value.active !== true || typeof value.displayName !== "string" || !value.displayName.trim() ||
      value.displayName.length > 100 || !["admin", "member"].includes(String(value.role))) {
    throw new Error(`No active membership in ${teamId}. Ask your administrator to add your Firebase UID to this team's members collection.`);
  }
  return { displayName: value.displayName, role: value.role as Membership["role"], active: true };
}

export async function loadMembership(uid: string): Promise<Membership> {
  const snapshot = await getDocFromServer(doc(getFirebase().db, "teams", teamId, "members", uid));
  return parseMember(snapshot.data());
}

export function watchHours(receive: (rows: TeamHoursRecord[], cached: boolean) => void, fail: (error: Error) => void) {
  return onSnapshot(collection(getFirebase().db, "teams", teamId, "hours"), { includeMetadataChanges: true }, snapshot => {
    try {
      const rows = snapshot.docs.map(item => parseHours(item.data(), item.id, teamId));
      receive(rows.sort((a, b) => b.date.localeCompare(a.date) || a.memberName.localeCompare(b.memberName)), snapshot.metadata.fromCache);
    } catch (error) { fail(error instanceof Error ? error : new Error("Invalid shared data.")); }
  }, fail);
}

export async function publishLocalHours(uid: string, member: Membership, entries: TimeEntry[], cancelled: () => boolean) {
  const { auth, db } = getFirebase();
  const key = `tpt_sync_manifest_v2_1:${teamId}:${uid}`;
  const journal: { acknowledged: Record<string, string>; touched: string[] } = JSON.parse(
    await AsyncStorage.getItem(key) || '{"acknowledged":{},"touched":[]}'
  );
  const previous = { ...Object.fromEntries(journal.touched.map(id => [id, ""])), ...journal.acknowledged };
  const records = entries.map(entry => projectHours(entry, teamId, uid, member.displayName));
  const plan = planSync(records, previous);
  const operations = [
    ...plan.writes.map(row => ({ id: row.id, row })),
    ...plan.deletes.map(id => ({ id, row: null })),
  ];
  // Track this device's acknowledged changes, not the entire cloud collection.
  // Small, idempotent batches survive offline retries and process restarts.
  for (let i = 0; i < operations.length; i += 50) {
    if (cancelled() || auth.currentUser?.uid !== uid) return;
    const batch = writeBatch(db);
    const chunk = operations.slice(i, i + 50);
    // Write intent before the request: if the app dies after the server commits
    // but before acknowledgement, the next launch can retry or delete safely.
    journal.touched = [...new Set([...journal.touched, ...chunk.map(operation => operation.id)])];
    for (const operation of chunk) delete journal.acknowledged[operation.id];
    await AsyncStorage.setItem(key, JSON.stringify(journal));
    if (cancelled() || auth.currentUser?.uid !== uid) return;
    for (const operation of chunk) {
      const ref = doc(db, "teams", teamId, "hours", operation.id);
      if (operation.row) batch.set(ref, operation.row);
      else batch.delete(ref);
    }
    await batch.commit();
    for (const operation of chunk) {
      if (operation.row) journal.acknowledged[operation.id] = plan.next[operation.id];
      else delete journal.acknowledged[operation.id];
    }
    journal.touched = journal.touched.filter(id => !chunk.some(operation => operation.id === id));
    await AsyncStorage.setItem(key, JSON.stringify(journal));
  }
}
