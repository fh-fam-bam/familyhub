package com.fhfambam.familyhub;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Family Hub wrapper.
 * - Loads the live page (same address as in the browser, so Firebase sync, the AI helper
 *   and every upload to GitHub keep working exactly as before).
 * - If the page cannot be loaded (no internet and nothing cached), shows the copy of
 *   Family-Hub.html that was packed inside this app, under the SAME web address so the
 *   saved data on the tablet is the same data.
 * - Keeps the screen on and hides the system bars.
 */
public class MainActivity extends Activity {

    static final String LIVE_URL = "https://fh-fam-bam.github.io/familyhub/Family-Hub.html";
    static final String HOST = "fh-fam-bam.github.io";
    static final int REQ_FILE = 4242;
    static final int REQ_MIC = 4243;

    private WebView web;
    private boolean showingFallback = false;
    private ValueCallback<Uri[]> filePathCallback;
    private ConnectivityManager cm;
    private ConnectivityManager.NetworkCallback netCallback;
    private SpeechRecognizer recognizer;
    private String pendingLang = "en-US";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);

        web.addJavascriptInterface(new SpeechBridge(), "FHNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception e) { /* no app can open it */ }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) showFallback();
            }

            @Override
            public void onReceivedHttpError(WebView v, WebResourceRequest req, WebResourceResponse r) {
                if (req.isForMainFrame() && r.getStatusCode() >= 400) showFallback();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // Lets the page's "choose a photo" buttons work (flyers, photo frame).
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("image/*");
                if (p != null && p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(Intent.createChooser(i, "Choose photo"), REQ_FILE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(LIVE_URL);
        }
        watchNetwork();
    }


    // ---------------------------------------------------------------------
    // Voice bridge: lets the page's "Talk to Add" use Android's own speech
    // recognizer (needs a speech service on the tablet, e.g. Google's).
    // The page only shows the microphone when isAvailable() is true.
    // ---------------------------------------------------------------------
    private class SpeechBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            try {
                return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void start(final String lang) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    beginListening(lang);
                }
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (recognizer != null) {
                        try { recognizer.stopListening(); } catch (Exception e) { /* ignore */ }
                    }
                }
            });
        }

        @JavascriptInterface
        public void cancel() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (recognizer != null) {
                        try { recognizer.cancel(); } catch (Exception e) { /* ignore */ }
                    }
                    emit("end", "");
                }
            });
        }
    }

    private void emit(String kind, String text) {
        final String js = "window.__fhSpeech&&window.__fhSpeech(" + JSONObject.quote(kind) + "," + JSONObject.quote(text == null ? "" : text) + ")";
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(js, null);
            }
        });
    }

    private void beginListening(String lang) {
        pendingLang = (lang == null || lang.length() == 0) ? "en-US" : lang;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            return;
        }
        try {
            if (recognizer == null) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(this);
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle b) { }
                    @Override public void onBeginningOfSpeech() { }
                    @Override public void onRmsChanged(float v) { }
                    @Override public void onBufferReceived(byte[] b) { }
                    @Override public void onEndOfSpeech() { }
                    @Override public void onEvent(int i, Bundle b) { }

                    @Override
                    public void onPartialResults(Bundle b) {
                        String t = firstResult(b);
                        if (t != null) emit("partial", t);
                    }

                    @Override
                    public void onResults(Bundle b) {
                        String t = firstResult(b);
                        if (t != null) emit("final", t);
                        emit("end", "");
                    }

                    @Override
                    public void onError(int code) {
                        String name;
                        if (code == SpeechRecognizer.ERROR_NO_MATCH || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) name = "no-speech";
                        else if (code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) name = "not-allowed";
                        else if (code == SpeechRecognizer.ERROR_NETWORK || code == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) name = "network";
                        else if (code == SpeechRecognizer.ERROR_AUDIO) name = "audio-capture";
                        else name = "other";
                        emit("error", name);
                        emit("end", "");
                    }
                });
            }
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, pendingLang);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            recognizer.startListening(i);
        } catch (Exception e) {
            emit("error", "service-not-allowed");
            emit("end", "");
        }
    }

    private String firstResult(Bundle b) {
        if (b == null) return null;
        java.util.ArrayList<String> l = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return (l == null || l.size() == 0) ? null : l.get(0);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code != REQ_MIC) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            beginListening(pendingLang);
        } else {
            emit("error", "not-allowed");
            emit("end", "");
        }
    }

    private boolean isOnline() {
        try {
            if (cm == null) cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) {
            return true;
        }
    }

    private String readAsset(String name) {
        try {
            AssetManager am = getAssets();
            InputStream in = am.open(name);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        }
    }

    private void showFallback() {
        if (showingFallback) return;
        String html = readAsset("Family-Hub.html");
        if (html == null) return;
        showingFallback = true;
        // Same web address as the live page => same saved data on this tablet.
        web.loadDataWithBaseURL(LIVE_URL, html, "text/html", "UTF-8", null);
    }

    private void watchNetwork() {
        try {
            cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            netCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(Network network) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            web.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
                            if (showingFallback) {
                                showingFallback = false;
                                web.loadUrl(LIVE_URL);
                            }
                        }
                    });
                }

                @Override
                public void onLost(Network network) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            web.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                        }
                    });
                }
            };
            cm.registerDefaultNetworkCallback(netCallback);
        } catch (Exception e) { /* optional nicety */ }
    }

    private void hideBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        hideBars();
    }

    @Override
    protected void onPause() {
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception e) { /* ignore */ }
        }
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == REQ_FILE && filePathCallback != null) {
            Uri[] r = null;
            if (result == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    r = new Uri[n];
                    for (int i = 0; i < n; i++) r[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    r = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(r);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(code, result, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        // Otherwise do nothing: on a wall display Back should not close the app.
    }

    @Override
    protected void onDestroy() {
        try {
            if (cm != null && netCallback != null) cm.unregisterNetworkCallback(netCallback);
        } catch (Exception e) { /* ignore */ }
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception e) { /* ignore */ }
            recognizer = null;
        }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
