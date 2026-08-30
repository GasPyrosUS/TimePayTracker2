# TimePayTracker 2.3 — finish Firebase setup

The app now contains the supplied `timepaytracker` Firebase client configuration.
Default team: `company-team`. You do NOT need a custom cross-device API server.
Firebase Authentication identifies users and Firestore stores shared hours and entry notes.
No live Firebase settings, rules, accounts or data were changed during development.

## 1. Enable sign-in and create accounts

In Firebase Console, open Authentication → Sign-in method and enable Email/Password.
Employees can now choose Team Hours → New here? Create an account in the app.
Alternatively, add employee accounts in Authentication → Users.
Enable a password policy and email-enumeration protection. Do not share passwords
in chat; employees should use the password-reset flow to set their own passwords.
Google sign-in is not implemented. Self-registration creates an identity only;
an administrator must approve team access using the membership document below.

Under Authentication → Settings → Authorized domains, add `gaspyrosus.github.io`.
Add `localhost` for local testing if it is not present, and your custom web domain
if you use one. Enter host names only, not `/TimePayTracker2` or an `https://` prefix.

## 2. Check team memberships

In Firestore → Data, create/select `teams` → `company-team` → `members`.
For each employee, the member document ID MUST equal that employee's Authentication
UID (not an email address, name, or automatically generated Firestore ID).

Each member document must contain:

| Field | Type | Value |
| --- | --- | --- |
| displayName | string | Employee's display name (1–100 characters) |
| role | string | member or admin |
| active | boolean | true |

Names are copied from these approved member documents, not typed by employees.
Setting active to false blocks subsequent cloud access. Previously viewed hours
cannot be revoked from someone's memory or screenshots. Existing local private
records remain on their own device.

If your team ID differs, change `EXPO_PUBLIC_TEAM_ID` before building (or change
the default in `src/services/firebaseConfig.ts`). Builds on GitHub and EAS must
use the same team ID. The default requires no environment variables.

## 3. Review and publish the NEW security rules

Use the `firestore.rules` file in THIS 2.1 package, not the earlier chat draft.
The earlier example did not check the existing owner on updates; the new file does.
It also checks active membership and rejects extra fields such as rates/pay.

Before publishing, save a copy of any existing rules. In Firestore → Rules,
replace the editor contents with the supplied file and click Publish. This ruleset
denies unrelated collections; if the Firebase project serves other apps, merge
and review those applications' rules instead of replacing them wholesale.

Rules are not deployed merely by uploading this app to GitHub Pages. They are a
separate Firebase step. For CLI users: `firebase deploy --only firestore:rules
--project timepaytracker` (run as one command after reviewing the target project).

## 4. Start the new app

- Keep the same application package and signing credentials for Android upgrades;
  do not uninstall the old app if you want to retain its local data.
- Keep the same web origin/browser profile to retain existing web storage.
- For the project ZIP, run `npm ci`, then `npm start`. For web, run `npm run web`.
- Open Team Hours, then sign in with your Firebase email and password.
- If prompted about existing local records, choose YES only if those records are
  yours. This copies your entries, private settings, active clock and saved cards
  to your account without deleting the originals. Only work hours get uploaded.
- If you choose to start empty, legacy data remains unassigned and available in
  signed-out local mode until its actual owner claims it.
- An empty installation can use local mode without signing in. Local mode does
  not share data across devices.

## 5. Test with two accounts BEFORE inviting the team

1. Sign in as employee A on one device; add a disposable test shift.
2. Sign in as employee B on another device. Team Hours should show A's name,
   date, clock-in/out, straight-time, overtime and total hours. No pay values.
3. Edit then delete A's test entry on A's originating device. Check B's live view.
4. On a fresh device, sign into A. A's shared records must remain visible in Team
   Hours and must not be deleted by the new empty local installation.
5. Sign out and into B on the first device. B must not see A's private dashboard,
   saved cards, rates or active clock. Sign back into A to restore those local views.
6. Disconnect A, edit a test entry, reconnect, and use Retry Sync. Also test an
   app restart while offline and confirm changes retry after reconnection.
7. Check Firestore → Data → teams/company-team/hours: documents must contain
   ONLY the fields allowed in firestore.rules. Notes are shared; rate/pay fields are not.
8. Test denied access with an account outside the team or with active=false.

For isolated rule tests, install a current Firebase CLI and supported Java runtime,
then run `firebase emulators:exec --project demo-timepaytracker --only firestore
"node --test tests/firestore-rules.emulator.cjs"` as one command. These tests use
localhost and a demo project only. They have been supplied but were not executed
here because the required emulator tooling is unavailable.

## What's included and what's not

- Implemented: persistent email/password login, logout, reset-email action,
  account-separated local data, consent-based legacy copy, live Team Hours,
  pay-free publication after save/edit/delete/import/clock-out, and retry journal.
- Preserved: local calculator, exports, cards, rollover, clock persistence,
  AM/PM display, theme, EAS profiles and GitHub Pages base-path handling.
- Private dashboards and cards are NOT cloud backups and do not merge across
  devices. Manage entries on the originating device; view team hours anywhere.
- Hours remain employee-reported; this release does not implement supervisor
  approval or tamper-proof server-side payroll calculations.
- OCR still needs its own secure backend integration. Firebase setup alone does
  not turn image text extraction on.
- Firebase access rules and a real two-account/device test remain required.
- No APK was built or uploaded; Android/iOS JavaScript bundle exports are not
  substitutes for testing a signed native app on devices.

## Checks performed

TypeScript and the local test suite passed. Static web export with the repository
base path and Android/iOS bundle exports passed. The sign-in view was inspected
in the local browser with no console errors. Offline Expo dependency compatibility
check reported dependencies up to date; full online Expo Doctor was not rerun.
The install reported 11 moderate vulnerabilities; no force-upgrade was applied.
The two blocked postinstall scripts were inspected; the tested bundle exports
worked without granting blanket install-script permission.

References: https://docs.expo.dev/guides/using-firebase/
and https://firebase.google.com/docs/firestore/security/rules-conditions
