import { Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SavedTimeCard } from "../types/models";
import { timeCardToCsv } from "./timeCardCsv";

export { timeCardToCsv } from "./timeCardCsv";

export async function exportTimeCardCsv(card: SavedTimeCard) {
  const csv = timeCardToCsv(card);
  const fileName = `time-card_${card.periodStart}_to_${card.periodEnd}.csv`;

  if (!FileSystem.cacheDirectory) {
    throw new Error("Temporary file storage is unavailable on this device.");
  }

  const uri = FileSystem.cacheDirectory + fileName;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: "Export Time Card",
      UTI: "public.comma-separated-values-text",
    });
    return;
  }

  await Share.share({
    title: fileName,
    message: csv,
  });
}
