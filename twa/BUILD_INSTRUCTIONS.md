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

### Option C: GitHub Actions secrets (remote build)

Add these repository secrets if you want the cloud build to produce a signed release APK:

- `KEYSTORE_FILE_BASE64` - base64-encoded contents of `jayathasoft.keystore`
- `KEYSTORE_PASSWORD` - keystore password
- `KEY_ALIAS` - optional, defaults to `jayathasoft-keystore`
- `KEY_PASSWORD` - optional, defaults to `KEYSTORE_PASSWORD`

## Building the Signed APK

```bash
cd twa

# Build signed release APK
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

## GitHub Actions (CI)

The workflow `.github/workflows/build-apk.yml` can be triggered manually from GitHub, and also runs on pushes that touch the Android wrapper or workflow file.

### Output artifacts

- `njc-debug-apk` - always produced; installable for testing
- `njc-signed-release-apk` - only produced when signing secrets are configured

Without signing secrets, the workflow still produces the debug APK so you can download and install it for testing.

### Build an APK from a phone

If you do not have a computer, you can still get the APK from GitHub in a mobile browser:

1. Open the repository on GitHub.
2. Go to the **Actions** tab.
3. Open **Build NJC APK**.
4. Tap **Run workflow**.
5. Wait for the job to finish.
6. Open the finished run and download the artifact:
   - `njc-debug-apk` for a test build
   - `njc-signed-release-apk` if signing secrets were added

After downloading, extract the artifact zip and install the APK on your Android device.

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
