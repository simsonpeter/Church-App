package be.njc.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.Activity;

/**
 * WebView-only launcher - loads the app URL in full-screen without any browser UI.
 * Bypasses TWA/Custom Tabs to guarantee no URL bar.
 */
public class WebViewActivity extends Activity {

    private static final String DEFAULT_URL = "https://simsonpeter.github.io/Church-App/index.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String url = DEFAULT_URL;
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if (data != null) {
                url = data.toString();
            }
        }

        WebView webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.loadUrl(url);
        setContentView(webView);
    }
}
