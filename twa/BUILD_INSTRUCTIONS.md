# NJC Android APK Build Instructions

## Build APK without a computer (phone only)

You can generate APK files directly from GitHub Actions using only a browser.

### 1) Optional: configure signing secrets

If you only need a test APK, skip this section.

For a signed release APK, add these repository secrets in GitHub (`Settings` -> `Secrets and variables` -> `Actions`):

- `KEYSTORE_BASE64` - base64 content of `jayathasoft.keystore`
- `KEYSTORE_PASSWORD` - keystore password
- `KEY_ALIAS` - key alias (optional, defaults to `jayathasoft-keystore`)
- `KEY_PASSWORD` - key password (optional, defaults to `KEYSTORE_PASSWORD`)

### 2) Run the workflow

1. Open the repository on GitHub.
2. Go to `Actions` -> `Build NJC APK`.
3. Tap `Run workflow`.

### 3) Download the APK artifact

When the run finishes:

- `njc-debug-apk` is always generated (for testing).
- `njc-release-apk` is generated only when signing secrets are configured.

Open the workflow run, then download artifacts from the `Artifacts` section.

## Prerequisites for local builds

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

The workflow `.github/workflows/build-apk.yml` supports:

- manual trigger (`workflow_dispatch`)
- pull requests touching `twa/**`
- pushes to `main` touching `twa/**`

It always uploads a debug APK artifact and uploads a release APK artifact when signing secrets are present.

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
