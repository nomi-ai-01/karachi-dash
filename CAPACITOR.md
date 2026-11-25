# Capacitor – Android / iOS wrapper

Karachi Dash is a Vite static PWA. Capacitor turns it into a native app.

## 1. Build the web app

```bash
npm install
npm run build
```

Output: `dist/`

## 2. Add Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Karachi Dash" com.karachidash.app --web-dir dist
npm install @capacitor/android @capacitor/ios
npx cap add android
# npx cap add ios   # macOS only
```

## 3. Useful plugins

```bash
npm install @capacitor/haptics @capacitor/share @capacitor/status-bar @capacitor/splash-screen
```

Then in code (optional later):

- Haptics instead of `navigator.vibrate`
- Share plugin instead of `navigator.share`
- StatusBar overlay for notch

## 4. Sync & run

```bash
npm run build
npx cap sync
npx cap open android
```

In Android Studio: Run on emulator or device.

## 5. Portrait lock

`android/app/src/main/AndroidManifest.xml` – activity:

```xml
android:screenOrientation="portrait"
```

## 6. Icons & splash

Replace:

- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- Splash via `@capacitor/splash-screen` + `capacitor.config`

Use the same art as `SPRITE_LIST.md` / favicon.

## 7. Play Store checklist

- [ ] Package ID final (`com.yourstudio.karachidash`)
- [ ] Privacy policy URL (ads / analytics if any)
- [ ] Target SDK current
- [ ] 512px & feature graphic store assets
- [ ] Test on low-end device (60fps goal)

## Notes

- No backend required for Version 1 (localStorage persists in WebView).
- For online leaderboards later, add a tiny API and `@capacitor/preferences` or server auth.
- Keep `npm run build` output in `dist/`; always `npx cap sync` after web changes.
