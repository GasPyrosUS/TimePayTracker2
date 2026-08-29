# Build the Android APK

This project is configured for an installable Android APK using Expo EAS Build.

## 1. Requirements

- Node.js 22.13 or newer
- An Expo account
- Internet access

## 2. Extract this ZIP

Open PowerShell inside the extracted `TimePayTracker57` folder.

## 3. Install the app dependencies

    npm install

## 4. Sign in to Expo

You can use EAS without installing it globally:

    npx eas-cli@latest login

Enter your Expo account email/username and password.

If you do not have an Expo account yet, create one at expo.dev.

## 5. Configure/link the EAS project

Run:

    npx eas-cli@latest build:configure

If Expo asks to create/link a project, choose Yes.

## 6. Build the APK

Run:

    npx eas-cli@latest build -p android --profile apk

EAS will upload the project and compile the Android APK in the cloud.

For Android credentials, the easiest option for this test build is to let
Expo generate/manage the Android keystore when prompted.

## 7. Download/install

When the build finishes, EAS prints a build page/download link.

Open that link and download the `.apk`, then send/open it on your Android
device and allow installation from that source if Android prompts you.

## Google Play later

The `production` profile is also included. It creates an Android App Bundle
(.aab), which is the format normally used for Google Play:

    npx eas-cli@latest build -p android --profile production

## Android application ID

    com.timepaytracker.mobile

If this app is later published publicly, the package ID should be treated as
permanent because changing it creates a different Android app identity.
