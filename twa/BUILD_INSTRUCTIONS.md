# NJC Android APK Build Instructions

## Prerequisites

1. **Java Development Kit (JDK) 11 or higher**
2. **Android SDK** (via Android Studio or command-line tools)
3. **Set ANDROID_HOME** and **JAVA_HOME** environment variables

## Signing

The release signing key (`jayathasoft.keystore`) is from [Tcradios_new](https://github.com/simsonpeter/Tcradios_new) — used only for signing, not branding. All icons and app name are NJC/Church App.

### Option A: keystore.properties (local build)

Create `twa/keystore.properties`:

```properties
storeFile=jayathasoft.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=jayathasoft-keystore
keyPassword=YOUR_KEY_PASSWORD
```

### Option B: Environment variables (CI/local)

```bash
export KEYSTORE_PASSWORD=your_password
export KEY_ALIAS=jayathasoft-keystore  # optional
export KEY_PASSWORD=your_key_password # optional, defaults to KEYSTORE_PASSWORD
```

## Building the APK locally

```bash
cd twa

# Build signed release APK when signing is configured
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/*.apk
```

## GitHub Actions (CI)

The workflow `.github/workflows/build-apk.yml` builds an installable APK on push to `main` or manual trigger.

**For a signed release APK**, add these repository secrets in GitHub:
- `KEYSTORE_PASSWORD` – keystore password
- `KEY_PASSWORD` – key password (optional if same as store)

Behavior:

- If signing is available, CI builds a **signed release APK**.
- If signing is not available, CI falls back to a **debug APK** so Android users can still install the app for testing.
- Every `main` build also updates the public download URL:
  `https://github.com/simsonpeter/Church-App/releases/download/latest-apk/njc-latest.apk`

The workflow also uploads the APK as a GitHub Actions artifact for each run.

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
