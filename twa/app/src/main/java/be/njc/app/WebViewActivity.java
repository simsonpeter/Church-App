package be.njc.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.Activity;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Full-screen WebView launcher with splash, Google TTS fetch compatibility, and native verse-image
 * share for WebView limitations.
 */
public class WebViewActivity extends Activity {

    private static final String DEFAULT_URL = "https://simsonpeter.github.io/Church-App/index.html";
    private static final int REQ_WEB_MEDIA = 1001;
    private static final int SPLASH_TIMEOUT_MS = 10000;

    private WebView webView;
    private ImageView splashOverlay;
    private final AtomicBoolean splashDismissed = new AtomicBoolean(false);
    private String webUserAgent;
    private PermissionRequest pendingPermissionRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);

        webView = findViewById(R.id.njc_webview);
        splashOverlay = findViewById(R.id.njc_splash);

        String url = DEFAULT_URL;
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if (data != null) {
                url = data.toString();
            }
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        applyChromeLikeUserAgent(settings);
        webUserAgent = settings.getUserAgentString();

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        webView.addJavascriptInterface(new NjcBridge(this), "NjcBridge");

        webView.setWebViewClient(new MainWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }
        });

        webView.postDelayed(this::dismissSplashIfNeeded, SPLASH_TIMEOUT_MS);

        webView.loadUrl(url);
    }

    private void dismissSplashIfNeeded() {
        if (splashDismissed.getAndSet(true)) {
            return;
        }
        if (splashOverlay == null) {
            return;
        }
        splashOverlay.animate()
                .alpha(0f)
                .setDuration(220)
                .withEndAction(() -> {
                    splashOverlay.setVisibility(View.GONE);
                    splashOverlay = null;
                });
    }

    /**
     * Bible audio uses {@code translate.google.com/translate_tts}; that endpoint often rejects
     * the default WebView user agent ({@code ; wv}). Strip it so playback matches Chrome.
     */
    private static void applyChromeLikeUserAgent(WebSettings settings) {
        String ua = settings.getUserAgentString();
        if (ua == null || ua.isEmpty()) {
            return;
        }
        ua = ua.replace("; wv", "").replace(" Version/4.0", "");
        settings.setUserAgentString(ua);
    }

    @Nullable
    private WebResourceResponse fetchTranslateTts(@NonNull String urlString) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(45000);
            conn.setRequestProperty("Referer", "https://translate.google.com/");
            if (webUserAgent != null && !webUserAgent.isEmpty()) {
                conn.setRequestProperty("User-Agent", webUserAgent);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                String cookies = CookieManager.getInstance().getCookie("https://translate.google.com");
                if (cookies != null && !cookies.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookies);
                }
            }
            conn.connect();
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                return null;
            }
            String mime = conn.getContentType();
            if (mime == null || mime.isEmpty()) {
                mime = "audio/mpeg";
            }
            String encoding = conn.getContentEncoding();
            InputStream stream = conn.getInputStream();
            return new WebResourceResponse(mime, encoding, stream);
        } catch (Exception e) {
            if (conn != null) {
                conn.disconnect();
            }
            return null;
        }
    }

    private void handleWebPermissionRequest(@NonNull PermissionRequest request) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            request.grant(request.getResources());
            return;
        }

        boolean needsAudio = false;
        boolean needsCamera = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                needsAudio = true;
            }
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                needsCamera = true;
            }
        }

        if (!needsAudio && !needsCamera) {
            request.grant(request.getResources());
            return;
        }

        List<String> toRequest = new ArrayList<>();
        if (needsAudio
                && ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
            toRequest.add(Manifest.permission.RECORD_AUDIO);
        }
        if (needsCamera
                && ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
            toRequest.add(Manifest.permission.CAMERA);
        }

        if (toRequest.isEmpty()) {
            request.grant(request.getResources());
            return;
        }

        pendingPermissionRequest = request;
        ActivityCompat.requestPermissions(
                this, toRequest.toArray(new String[0]), REQ_WEB_MEDIA);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_WEB_MEDIA || pendingPermissionRequest == null) {
            return;
        }
        PermissionRequest pr = pendingPermissionRequest;
        pendingPermissionRequest = null;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                pr.deny();
                return;
            }
        }
        pr.grant(pr.getResources());
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        splashOverlay = null;
        super.onDestroy();
    }

    void sharePngFromBase64(@NonNull String base64, @NonNull String fileName) {
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File dir = new File(getCacheDir(), "share");
            if (!dir.exists() && !dir.mkdirs()) {
                return;
            }
            String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (!safeName.toLowerCase().endsWith(".png")) {
                safeName = safeName + ".png";
            }
            File out = new File(dir, safeName);
            FileOutputStream fos = new FileOutputStream(out);
            fos.write(bytes);
            fos.close();

            Uri uri = FileProvider.getUriForFile(
                    this, getString(R.string.providerAuthority), out);
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("image/png");
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(share, getString(R.string.njc_share_verse_title)));
        } catch (Exception ignored) {
        }
    }

    private final class MainWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return false;
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            dismissSplashIfNeeded();
        }

        @Nullable
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
                return null;
            }
            Uri uri = request.getUrl();
            if (uri == null || !"translate.google.com".equals(uri.getHost())) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || !path.contains("translate_tts")) {
                return null;
            }
            return fetchTranslateTts(uri.toString());
        }
    }

    /** Exposed to JavaScript as {@code window.NjcBridge}. */
    public static final class NjcBridge {
        private final WeakReference<WebViewActivity> activityRef;

        NjcBridge(WebViewActivity activity) {
            this.activityRef = new WeakReference<>(activity);
        }

        @JavascriptInterface
        public boolean isApp() {
            return true;
        }

        @JavascriptInterface
        public void sharePngBase64(String base64, String fileName) {
            WebViewActivity a = activityRef.get();
            if (a == null) {
                return;
            }
            if (base64 == null || fileName == null) {
                return;
            }
            a.runOnUiThread(() -> a.sharePngFromBase64(base64, fileName));
        }
    }
}
