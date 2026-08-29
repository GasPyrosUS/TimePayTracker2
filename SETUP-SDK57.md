# Time & Pay Tracker — Fresh Expo SDK 57

This project was rebuilt from the Time & Pay Tracker V1 source code with a fresh
Expo SDK 57 dependency configuration. It contains NO node_modules folder and NO
lockfile from the previous installs.

## Important requirement

Expo SDK 57 requires Node.js 22.13.x or newer.

Check:

    node --version

If the version is below 22.13.0, update Node before installing this project.

## Clean Windows install

1. Extract this ZIP to a completely new folder.
2. Do NOT copy node_modules, package-lock.json, package.json, or any dependency
   files from the older project.
3. Open PowerShell in the extracted TimePayTracker57 folder.
4. Run:

    node --version
    npm install

5. Verify the installed Expo version:

    npm ls expo

   It should report Expo 57.x.x.

6. Run:

    npx expo-doctor@latest

7. If Expo Doctor passes, start the app:

    npx expo start --clear

## Important

Do not run:

    npm audit fix --force

That command can replace Expo dependencies with incompatible major versions.

## Included app functionality

- Dashboard and current pay-period summary
- Clock in / clock out
- Manual time entry
- Weekday straight-time / overtime classification
- Weekend overtime
- Pay-period history / summary
- Hourly rate and overtime settings
- Local AsyncStorage persistence

## Current overtime logic

Monday–Friday:
- Before 7:00 AM = overtime
- 7:00 AM–3:00 PM = straight time
- After 3:00 PM = overtime

Saturday/Sunday:
- All worked time = overtime

Overtime multiplier defaults to 1.5x.
