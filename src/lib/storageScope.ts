import AsyncStorage from "@react-native-async-storage/async-storage";

// Legacy keys are preserved as a backup. Only the first explicitly consenting
// account can claim them. Other accounts and signed-out mode use separate keys.
const OWNER = "tpt_legacy_owner_v2_1";
const PRIVATE_KEYS = ["tpt_entries_v1_1", "tpt_settings_v1_1", "tpt_active_clock_v1", "tpt_time_cards_v1"];
let scope = "legacy";
let revision = 0;

export function captureStorageScope() {
  const captured = revision;
  return () => captured === revision;
}

export function privateKey(key: string) {
  return scope === "legacy" ? key : `${key}:${scope}`;
}

export async function hasUnclaimedData() {
  if (await AsyncStorage.getItem(OWNER)) return false;
  const values = await AsyncStorage.multiGet(PRIVATE_KEYS);
  return values.some(([, value]) => value !== null && value !== "[]" && value !== "null");
}

export async function selectStorageScope(uid: string | null, claim = false) {
  const owner = await AsyncStorage.getItem(OWNER);
  if (uid && claim) {
    if (owner && owner !== uid) throw new Error("Existing data has already been assigned to another account.");
    // Each copy is idempotent. Do not overwrite existing account data after a crash.
    for (const key of PRIVATE_KEYS) {
      const target = `${key}:user:${uid}`;
      const value = await AsyncStorage.getItem(key);
      if (value !== null && await AsyncStorage.getItem(target) === null) {
        await AsyncStorage.setItem(target, value);
      }
    }
    await AsyncStorage.setItem(OWNER, uid);
  }
  scope = uid ? `user:${uid}` : owner ? "guest" : "legacy";
  revision++;
  return scope;
}
