# Full-Screen TWA (No URL Bar)

The app uses **WebView fallback** so it displays full-screen without the browser URL bar when TWA verification fails.

## For True TWA (Chrome full-screen, no fallback)

To get the native TWA experience (Chrome rendering, no URL bar), you need:

1. **assetlinks.json at domain root** – Must be at `https://simsonpeter.github.io/.well-known/assetlinks.json`
   - Create repo `simsonpeter.github.io` with `.well-known/assetlinks.json` (copy from Church-App)
   - Enable GitHub Pages for that repo

2. **Release-signed APK** – The signing certificate must match the fingerprints in assetlinks.json
   - Add `KEYSTORE_PASSWORD` to repo secrets
   - Run "Build NJC APK" workflow to get signed APK

3. **Or use a custom domain** – Deploy to a domain you control (e.g. njc.be) so assetlinks can live at the root.
