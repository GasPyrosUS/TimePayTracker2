import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActiveClockSession,
  AppearanceMode,
  PaySettings,
  SavedTimeCard,
  TimeEntry,
} from "../types/models";
import { localDateString } from "./dates";
import { privateKey } from "./storageScope";

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
  weekdayBaseHoursEnabled: false,
};

export async function loadEntries(): Promise<TimeEntry[]> {
  const raw = await AsyncStorage.getItem(privateKey(ENTRIES_KEY));
  return raw ? JSON.parse(raw) : [];
}

export async function saveEntries(entries: TimeEntry[]) {
  const key = privateKey(ENTRIES_KEY);
  await AsyncStorage.setItem(key, JSON.stringify(entries));
  if (key === privateKey(ENTRIES_KEY)) entriesListeners.forEach(listener => listener(entries));
}

export function subscribeEntries(listener: EntriesListener) {
  entriesListeners.add(listener);
  return () => entriesListeners.delete(listener);
}

export async function loadSettings(): Promise<PaySettings> {
  const raw = await AsyncStorage.getItem(privateKey(SETTINGS_KEY));
  return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
}

export async function saveSettings(settings: PaySettings) {
  const key = privateKey(SETTINGS_KEY);
  await AsyncStorage.setItem(key, JSON.stringify(settings));
  if (key === privateKey(SETTINGS_KEY)) settingsListeners.forEach(listener => listener(settings));
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
  const raw = await AsyncStorage.getItem(privateKey(ACTIVE_CLOCK_KEY));
  return raw ? JSON.parse(raw) : null;
}

export async function saveActiveClock(session: ActiveClockSession) {
  const key = privateKey(ACTIVE_CLOCK_KEY);
  await AsyncStorage.setItem(key, JSON.stringify(session));
  if (key === privateKey(ACTIVE_CLOCK_KEY)) activeClockListeners.forEach(listener => listener(session));
}

export async function clearActiveClock() {
  const key = privateKey(ACTIVE_CLOCK_KEY);
  await AsyncStorage.removeItem(key);
  if (key === privateKey(ACTIVE_CLOCK_KEY)) activeClockListeners.forEach(listener => listener(null));
}

export function subscribeActiveClock(listener: ActiveClockListener) {
  activeClockListeners.add(listener);
  return () => activeClockListeners.delete(listener);
}


export async function loadTimeCards(): Promise<SavedTimeCard[]> {
  const raw = await AsyncStorage.getItem(privateKey(TIME_CARDS_KEY));
  return raw ? JSON.parse(raw) : [];
}

export async function saveTimeCards(cards: SavedTimeCard[]) {
  const key = privateKey(TIME_CARDS_KEY);
  await AsyncStorage.setItem(key, JSON.stringify(cards));
  if (key === privateKey(TIME_CARDS_KEY)) timeCardsListeners.forEach(listener => listener(cards));
}

export function subscribeTimeCards(listener: TimeCardsListener) {
  timeCardsListeners.add(listener);
  return () => timeCardsListeners.delete(listener);
}
