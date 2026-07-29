# AGENTS.md

Guidance for AI coding agents working in this repository. (Claude Code reads `CLAUDE.md`, which mirrors this file.)

## Commands

```bash
npm install                # install deps
npm run typecheck          # tsc --noEmit — run after any change, this is the only automated check in the repo
npx expo export --platform ios     # bundle-only sanity check (catches import/require errors tsc won't)
npx expo export --platform android # same, for Android

npm run prebuild           # expo prebuild — regenerates ios/ and android/ from app.json + config plugins
npm run ios                # expo run:ios — requires macOS + Xcode
npm run android             # expo run:android — requires Android Studio / SDK
npm start                  # expo start --dev-client
```

There is no test suite and no lint script configured — `typecheck` + `expo export` are the only verification available in this environment. `ios/` and `android/` are gitignored/generated (via `prebuild`); never hand-edit them, edit `app.json` and the config plugin options instead and re-run `prebuild`.

**This app cannot run in Expo Go.** It depends on native modules (`react-native-vision-camera` frame processors, ML Kit via Nitro, `expo-share-intent`'s Share Extension) that require a Development Build (`expo run:ios` / `expo run:android`, or EAS).

## Architecture

Two independent translation pipelines that share a common core, switched via a floating bottom tab bar in `App.tsx`:

1. **Live Camera** (`useLiveTranslation.ts` → `CameraTranslateView.tsx`) — a `react-native-vision-camera` frame processor samples camera frames (throttled via `FRAME_SKIP_THRESHOLD`), runs on-device OCR via `react-native-vision-camera-ocr-plus`'s `useTextRecognition`, and translates each detected block.
2. **Photo** (`usePhotoTranslation.ts` → `PhotoTranslateView.tsx`) — runs the same OCR/translation on a single still image instead of a frame stream, via the OCR-Plus recognizer's `recognizePhoto()` method (reached through the public `useTextRecognition` hook's `.recognizer` handle — the package's `createTextRecognitionPlugin`/`createTranslatorPlugin` factories exist internally but are **not** exported from its public `index.ts` in the installed version; always go through the hooks).

Both pipelines produce the same `DetectedBlock[]` shape (`src/types.ts`) — `{ key, originalText, translatedText, frame }` — and feed the same `TranslationOverlay` component, which draws a translated-text patch per block. The two modes differ only in *where blocks come from* and *how their bounding boxes map to screen pixels*: `mapFrameRectToScreen` (camera: scale + center-crop + axis-swap, because the preview uses `resizeMode: "cover"` and the sensor buffer is often landscape-oriented even in portrait) vs `mapImageRectToScreen` (photo: plain uniform scale, no cropping) in `src/utils/geometry.ts`. `TranslationOverlay` takes the mapping function as a `mapRect` prop so both modes reuse the same rendering code.

`useTranslator.ts` wraps ML Kit Translate (via OCR-Plus's `useTranslate`) with an in-memory cache keyed by `` `${from}|${to}|${text}` `` — both pipelines call through this so identical text seen repeatedly (consecutive camera frames, or re-scans on language change) isn't re-translated. It also tracks "model downloading" / error state for the UI (first use of a language pair downloads an ML Kit Translate model).

**Language state is lifted to `App.tsx`** (`direction: TranslationDirection`, `{ from, to }`) and shared by both modes — switching tabs keeps your language choice. `usePhotoTranslation` is also instantiated in `App.tsx` rather than inside `PhotoTranslateView`, because the Action Button/share-intent flow (below) needs to drive it from outside that component.

**OCR script constraint**: ML Kit's on-device text recognizer only reads five scripts (Latin, Chinese, Japanese, Korean, Devanagari) — see `ocrScriptForLanguage()` / `CAMERA_SOURCE_LANGUAGES` in `src/constants/languages.ts`. This applies to *both* pipelines and is why the "From" language picker is a restricted subset of the "To" picker (translation targets aren't limited the same way). `LanguageCode` is re-exported from the OCR-Plus package's own `Languages` type rather than hand-maintained, because that type does not match ISO 639-1 exactly (notably no `sv`/Swedish or `hr`/Croatian) — don't widen `LanguageCode` by hand, it'll break at the type level against the library.

**Share intent / Action Button flow**: `App.tsx` wraps the tree in `ShareIntentProvider` (`expo-share-intent`) and watches `useShareIntent()` for an incoming shared image (from the OS share sheet, or an iOS Shortcut bound to the Action Button/Back Tap that takes a screenshot and shares it in). On receipt it switches to Photo mode and feeds the image into the same `usePhotoTranslation.processImage()` the manual "Import screenshot" button uses — falling back to `Image.getSize()` when the shared file's width/height come back `null` (the type allows it; some sources omit them).

**A floating overlay that sits on top of other apps (Mobizen-style) is not possible on iOS** — this is an OS sandbox restriction (no API for a third-party app to draw over another app's window), not an App Store policy one, so it isn't unlocked by local/sideloaded distribution either. Don't attempt to build toward that on iOS; the Action Button/Shortcut flow above is the platform ceiling. It would be possible on Android only, via a `SYSTEM_ALERT_WINDOW` overlay + Accessibility Service — a large native-Kotlin undertaking, not yet built here.

### Config plugin gotchas (`app.json`)

- Setting `android.permissions` in `app.json` switches Android manifest generation into "exact allowlist" mode — permissions requested by native modules but *not* listed there get an explicit `tools:node="remove"` override, stripping them even if another library needs them. `react-native-vision-camera` does not auto-declare `android.permission.CAMERA`; it must be listed explicitly.
- `expo-image-picker`'s plugin options `cameraPermission`/`microphonePermission` are **app-wide** overrides, not scoped to the picker — setting them to `false` (to stop the picker itself from requesting camera/mic) previously stripped `CAMERA` for `react-native-vision-camera` too, breaking Live Camera on Android. Don't set those options unless you've re-verified (via `prebuild` + inspecting `android/app/src/main/AndroidManifest.xml`) that nothing else in the app still needs that permission.
- When adding/changing a config plugin, verify it with `rm -rf ios android && npx expo prebuild --no-install` and inspect the generated `AndroidManifest.xml` / `Info.plist` — `tsc`/`expo export` won't catch native manifest issues.

## Testing status

No physical device, camera, simulator, or macOS/Xcode is available in this environment. Everything has been verified only via `tsc --noEmit`, `expo export` (bundle-only), and `expo prebuild` (confirms config plugins generate the expected native project files, e.g. catching the permission-stripping bug above) — never by actually running the app. Live behavior (OCR accuracy, translation latency, overlay alignment, the Share Extension appearing in iOS's share sheet, a Shortcut actually launching it) is unverified. Say so explicitly rather than claiming a change works if you can't run it here either.
