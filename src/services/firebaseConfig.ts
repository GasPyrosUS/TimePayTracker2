// Public Firebase client identifiers supplied by the project owner.
// Authorization is enforced by firestore.rules, never by hiding these values.
export const firebaseConfig = {
  apiKey: "AIzaSyCrSCAzo_DlAhvo4V3oFkCandIJqfywl6Q",
  authDomain: "timepaytracker.firebaseapp.com",
  projectId: "timepaytracker",
  storageBucket: "timepaytracker.firebasestorage.app",
  messagingSenderId: "315987222271",
  appId: "1:315987222271:web:546fc302d81dcc7583b6ca",
};

export const teamId = process.env.EXPO_PUBLIC_TEAM_ID || "company-team";
