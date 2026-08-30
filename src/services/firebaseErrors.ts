export function firebaseMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "auth/email-already-in-use") return "An account already uses this email. Sign in or reset your password.";
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") return "Choose a stronger password that meets your Firebase project's password policy.";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code || "")) return "Check your email and password, then try again.";
  if (code === "auth/operation-not-allowed") return "Enable Email/Password sign-in in Firebase Authentication first.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait before trying again.";
  if (code === "permission-denied") return "Access denied. Check the published Firestore rules and your active team membership. Local entries are still saved.";
  if (code === "unavailable" || code === "auth/network-request-failed") return "No connection to Firebase. Local entries remain saved; try again when online.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
