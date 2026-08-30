import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

let auth: Auth | undefined;
// Firebase's common declaration entry omits this documented RN-only export.
// Metro resolves the RN implementation; the web variant never imports it.
const { getReactNativePersistence } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
export function getFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!auth) {
    try { auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
    catch (error) {
      if ((error as { code?: string }).code !== "auth/already-initialized") throw error;
      auth = getAuth(app);
    }
  }
  return { auth, db: getFirestore(app) };
}
