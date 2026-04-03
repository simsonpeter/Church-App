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

## Building the Signed APK

```bash
cd twa

# Build signed release APK
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

## GitHub Actions (CI)

The workflow `.github/workflows/build-apk.yml` builds the APK on push to main or manual trigger.

**Downloading without a computer:** After a successful run on `main`, the same APK is attached to the rolling GitHub release tagged [`njc-apk-latest`](https://github.com/simsonpeter/Church-App/releases/tag/njc-apk-latest). Open that page on a phone, download `njc-release.apk`, and install (you may need to allow installs from unknown sources).

**For a signed APK**, add these repository secrets in GitHub:
- `KEYSTORE_PASSWORD` – keystore password
- `KEY_PASSWORD` – key password (optional if same as store)

Without these secrets, the build produces an unsigned APK (usable for testing).

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
