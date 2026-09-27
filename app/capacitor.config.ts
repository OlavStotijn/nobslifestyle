import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nobslifestyle.app',
  appName: 'NoBSLifestyle',
  webDir: 'dist',
  plugins: {
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
