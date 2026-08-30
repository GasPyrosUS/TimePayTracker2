# Time & Pay Tracker

Version 2.3.1 — Expo SDK 57 with Firebase Authentication and Team Hours.

Timesheet scanning is disabled and marked Coming Soon for this public release.

Clock-in and clock-out fields now support typed times as well as dropdown choices.
Team Hours now shows entry notes, and users can create their own accounts.
See `V2.3-RELEASE-NOTES.md` for required rules and membership setup.

Start with `START-HERE-FIREBASE.md` for the remaining console setup and testing steps.

Install the included dependency lockfile with `npm ci`. Run `npm run typecheck`,
`npm test`, and `npm run web:export`. Dependencies and generated build output
are excluded from the ZIP. Legacy version notes describe older releases.

Team Hours shares work-hour projections and entry notes. Private rates, pay, cards and
active clock sessions remain device-local and account-separated. This is not
full personal payroll backup/synchronization. OCR still needs a separate backend.
