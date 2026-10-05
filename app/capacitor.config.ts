import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nobslifestyle.app',
  appName: 'NoBSLifestyle',
  webDir: 'dist',
  plugins: {
    // The app talks to the real API at https://nobslifestyle.com from a
    // native shell whose own origin is capacitor://localhost — a genuinely
    // cross-site relationship, which WebKit's ITP blocks third-party cookies
    // for regardless of CORS/SameSite config. Routing fetch()/XHR through
    // native URLSession instead of WKWebView's own networking sidesteps ITP
    // entirely (it's a WebKit/browser-engine restriction, not an OS one),
    // which is what actually lets the session cookie persist after login.
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    // Lets the native app pick up frontend fixes without an App Store
    // release — see app/src/liveUpdate.ts and app/scripts/build-update-bundle.mjs.
    // autoUpdate is off: the plugin's built-in auto-update/getLatest() flow
    // speaks Capgo's own cloud API protocol, which we're not using — a plain
    // manifest + download()/next() is simpler and fully self-hosted.
    // statsUrl is blanked so nothing gets reported to Capgo's cloud, which
    // this app has no account with.
    CapacitorUpdater: {
      autoUpdate: false,
      statsUrl: "",
    },
    // Twitter/Facebook/etc. aren't used — disabling them keeps them out of
    // the native builds entirely (smaller APK/IPA, fewer permissions).
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },
  },
};

export default config;
