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

**For a signed APK**, add these repository secrets in GitHub:
- `KEYSTORE_PASSWORD` – keystore password
- `KEY_PASSWORD` – key password (optional if same as store)

Without these secrets, the build produces an unsigned APK (usable for testing).

### Get APK without a computer (phone-only)

1. Open GitHub in your phone browser and go to:
   - `https://github.com/simsonpeter/Church-App/actions/workflows/build-apk.yml`
2. Tap **Run workflow** and run it on the branch you want.
3. After it finishes, open:
   - `https://github.com/simsonpeter/Church-App/releases/tag/latest-apk`
4. Download `njc-latest.apk` from the release assets.
5. On Android, allow install from browser/files app if prompted, then install.

The release tag `latest-apk` is updated every successful build, so the link stays the same.

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
