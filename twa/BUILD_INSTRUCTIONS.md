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

The workflow `.github/workflows/build-apk.yml` runs on **workflow_dispatch** (Actions tab → “Build NJC APK” → Run workflow) and when `main` changes under `twa/` or the workflow file.

### From your phone (no PC)

1. Open the repo on GitHub in a mobile browser.  
2. **Actions** → **Build NJC APK** → **Run workflow** → choose branch **main** → **Run workflow**.  
3. When it finishes, open the run → **Artifacts** → download **njc-release-apk** or **njc-debug-apk**.

### Signed release APK (Play Store / same key as before)

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `KEYSTORE_BASE64` | Base64 of your `jayathasoft.keystore` file (see below) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key password (optional if same as keystore) |

**Encode the keystore as Base64** (on any machine where the file exists, or use an online base64 encoder locally on phone with the file in cloud storage — keep the secret private):

```bash
base64 -i jayathasoft.keystore | pbcopy   # macOS
base64 -w 0 jayathasoft.keystore          # Linux (paste output into the secret)
```

If `KEYSTORE_BASE64` and `KEYSTORE_PASSWORD` are set, CI builds **assembleRelease** and uploads **njc-release-apk**.

### Debug APK only (testing)

If you do **not** add `KEYSTORE_BASE64` (or no password secret), CI builds **assembleDebug** and uploads **njc-debug-apk**. You can install it on your device for testing; it is not signed with your release key.

## App Details

- **App name**: NJC
- **Package**: be.njc.app
- **Web URL**: https://simsonpeter.github.io/Church-App/
