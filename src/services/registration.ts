import { createUserWithEmailAndPassword, type Auth } from "firebase/auth";

// Registration grants an identity only. Team membership is administrator-managed.
export async function registerAccount(auth: Auth, email: string, password: string, confirmation: string) {
  const address = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Use a password with at least 6 characters. Your team's password policy may require more.");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  return createUserWithEmailAndPassword(auth, address, password);
}
