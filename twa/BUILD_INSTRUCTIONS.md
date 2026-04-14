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

---

## TWA: URL bar shows `simsonpeter.github.io` (verification and fingerprints)

If the app opens the site but the **top bar still looks like a browser** (URL / Chrome UI), **Digital Asset Links verification failed**. Chrome then uses **Custom Tabs** (fallback) instead of a **verified** Trusted Web Activity.

Fixing this is **not** only in Bubblewrap: the **website** must serve a matching file at a specific URL.

### 1. Where Android looks for the statement

The TWA `assetStatements` use the site origin **`https://simsonpeter.github.io`** (see `twa/app/src/main/res/values/strings.xml`).

Chrome loads:

**`https://simsonpeter.github.io/.well-known/assetlinks.json`**

(not under `/Church-App/…`).

For a **project** site (`…/Church-App/`), files in this repo deploy under that folder, so  
`https://simsonpeter.github.io/Church-App/.well-known/assetlinks.json` may exist while the **origin** URL above **does not** → verification **fails** → you still see the GitHub hostname.

**Fix (pick one):**

1. **User GitHub Pages repo (simplest)**  
   Create a repo named **`simsonpeter.github.io`** (username must match). At the **root** of that site, add:

   ```
   .well-known/assetlinks.json
   ```

   Use the same JSON as this repo’s `.well-known/assetlinks.json` (package `be.njc.app` + your SHA-256 fingerprints). Enable GitHub Pages.  
   Confirm in a browser:  
   `https://simsonpeter.github.io/.well-known/assetlinks.json`  
   returns **200** and valid JSON.

2. **Custom domain** on the Church-App Pages site, then host `.well-known/assetlinks.json` at the **root of that domain** (e.g. `https://yourdomain.com/.well-known/assetlinks.json`).

### 2. SHA-256 fingerprint (must match the APK you install)

The fingerprint in `assetlinks.json` must match the **signing certificate** of the APK on the device.

**Release APK** (your keystore):

```bash
keytool -list -v -keystore /path/to/your.keystore -alias YOUR_ALIAS
```

Copy the **SHA256** line (with colons). Add it to `sha256_cert_fingerprints` in `assetlinks.json`.

**Debug APK**:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**From an APK file:**

```bash
unzip -p app-release.apk META-INF/*.RSA | keytool -printcert | grep SHA256
```

You can list **multiple** fingerprints in one JSON file (release + debug) while testing.

### 3. Check verification

- [Digital Asset Links statement generator / tester](https://developers.google.com/digital-asset-links/tools/generator) — package `be.njc.app`, SHA-256, site.
- After fixing hosting: **uninstall** the app, **reinstall** the APK (verification is cached).

### 4. Keep `strings.xml` in sync

The `site` value in `assetStatements` must match Bubblewrap’s **start URL** (see `twa/app/build.gradle`: `hostName` + `launchUrl`). Currently it should stay `https://simsonpeter.github.io/Church-App`.
