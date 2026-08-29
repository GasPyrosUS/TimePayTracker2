import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActiveClockSession,
  AppearanceMode,
  PaySettings,
  SavedTimeCard,
  TimeEntry,
} from "../types/models";
import { localDateString } from "./dates";

const ENTRIES_KEY = "tpt_entries_v1_1";
const SETTINGS_KEY = "tpt_settings_v1_1";
const APPEARANCE_KEY = "tpt_appearance_v1";
const ACTIVE_CLOCK_KEY = "tpt_active_clock_v1";
const TIME_CARDS_KEY = "tpt_time_cards_v1";

type EntriesListener = (entries: TimeEntry[]) => void;
type SettingsListener = (settings: PaySettings) => void;
type AppearanceListener = (mode: AppearanceMode) => void;
type ActiveClockListener = (session: ActiveClockSession | null) => void;
type TimeCardsListener = (cards: SavedTimeCard[]) => void;

const entriesListeners = new Set<EntriesListener>();
const settingsListeners = new Set<SettingsListener>();
const appearanceListeners = new Set<AppearanceListener>();
const activeClockListeners = new Set<ActiveClockListener>();
const timeCardsListeners = new Set<TimeCardsListener>();

export const defaultSettings: PaySettings = {
  hourlyRate: 25,
  overtimeMultiplier: 1.5,
  periodStart: localDateString(),
};

export async function loadEntries(): Promise<TimeEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveEntries(entries: TimeEntry[]) {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  entriesListeners.forEach(listener => listener(entries));
}

export function subscribeEntries(listener: EntriesListener) {
  entriesListeners.add(listener);
  return () => entriesListeners.delete(listener);
}

export async function loadSettings(): Promise<PaySettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
}

export async function saveSettings(settings: PaySettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  settingsListeners.forEach(listener => listener(settings));
}

export function subscribeSettings(listener: SettingsListener) {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
}

export async function loadAppearance(): Promise<AppearanceMode> {
  const raw = await AsyncStorage.getItem(APPEARANCE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export async function saveAppearance(mode: AppearanceMode) {
  await AsyncStorage.setItem(APPEARANCE_KEY, mode);
  appearanceListeners.forEach(listener => listener(mode));
}

export function subscribeAppearance(listener: AppearanceListener) {
  appearanceListeners.add(listener);
  return () => appearanceListeners.delete(listener);
}

export async function loadActiveClock(): Promise<ActiveClockSession | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_CLOCK_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveActiveClock(session: ActiveClockSession) {
  await AsyncStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(session));
  activeClockListeners.forEach(listener => listener(session));
}

export async function clearActiveClock() {
  await AsyncStorage.removeItem(ACTIVE_CLOCK_KEY);
  activeClockListeners.forEach(listener => listener(null));
}

export function subscribeActiveClock(listener: ActiveClockListener) {
  activeClockListeners.add(listener);
  return () => activeClockListeners.delete(listener);
}


export async function loadTimeCards(): Promise<SavedTimeCard[]> {
  const raw = await AsyncStorage.getItem(TIME_CARDS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTimeCards(cards: SavedTimeCard[]) {
  await AsyncStorage.setItem(TIME_CARDS_KEY, JSON.stringify(cards));
  timeCardsListeners.forEach(listener => listener(cards));
}

export function subscribeTimeCards(listener: TimeCardsListener) {
  timeCardsListeners.add(listener);
  return () => timeCardsListeners.delete(listener);
}
