# Time & Pay Tracker

Version 2.5.0 — Expo SDK 57 with optional 8-hour weekday straight-time mode.

Timesheet scanning is disabled and marked Coming Soon for this public release.

Clock-in and clock-out fields now support typed times as well as dropdown choices.
The Dashboard navigation now sits below the header, all active buttons have press
feedback, date choices show weekdays, and pay-period progress follows the actual day.
Team Hours supports reviewed, duplicate-aware imports without sharing pay data.
See `V2.3-RELEASE-NOTES.md` for required rules and membership setup.
See `V2.4-RELEASE-NOTES.md` for this release's UI and import changes.
See `V2.4.1-RELEASE-NOTES.md` for the imported-payroll totals update.
See `V2.5-RELEASE-NOTES.md` for the weekday base-hours slider behavior.

Start with `START-HERE-FIREBASE.md` for the remaining console setup and testing steps.

Install the included dependency lockfile with `npm ci`. Run `npm run typecheck`,
`npm test`, and `npm run web:export`. Dependencies and generated build output
are excluded from the ZIP. Legacy version notes describe older releases.

Team Hours shares work-hour projections and entry notes. Private rates, pay, cards and
active clock sessions remain device-local and account-separated. This is not
full personal payroll backup/synchronization. OCR still needs a separate backend.
