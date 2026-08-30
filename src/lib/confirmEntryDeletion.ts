import { Alert, Platform } from "react-native";

export function confirmEntryDeletion(): Promise<boolean> {
  const title = "Delete time entry?";
  const message = "This will permanently remove this saved time entry.";
  // React Native Web's Alert.alert is a no-op. Never interpret an unavailable
  // browser dialog (including during static rendering) as approval to delete.
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
