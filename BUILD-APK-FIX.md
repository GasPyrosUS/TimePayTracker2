# V1.7.1 APK dependency hotfix

EAS failed during `npm ci` because npm selected incompatible optional peer versions:

- react-dom 19.2.8 with react 19.2.3
- react-native-worklets 0.12.1 with Expo SDK 57 expo-modules-core

V1.7.1 pins the SDK 57 compatible dependency set, including:

- react 19.2.3
- react-dom 19.2.3
- react-native 0.86.3
- react-native-web ~0.21.0
- react-native-reanimated 4.5.1
- react-native-worklets 0.10.1
- expo ~57.0.18

Before building, delete any old `node_modules` and `package-lock.json`, then regenerate the lockfile with `npm install`.

PowerShell:

    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
    npm install
    npm ls react react-dom react-native-worklets react-native-reanimated expo
    npx expo-doctor@latest
    $env:EAS_NO_VCS="1"
    npx eas-cli@latest build -p android --profile apk --clear-cache

Expected important versions:

    react@19.2.3
    react-dom@19.2.3
    react-native-worklets@0.10.1
    react-native-reanimated@4.5.1
    expo@57.0.18
