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

**This app cannot run in Expo Go.** It depends on native modules (ML Kit via Nitro, `expo-share-intent`'s Share Extension) that require a Development Build (`expo run:ios` / `expo run:android`, or EAS).

## Architecture

Single pipeline: a screenshot comes in (via share intent or manual import) → on-device OCR → on-device translation → an overlay drawn on top of the displayed image.

- **Entry point** `App.tsx` wraps the tree in `ShareIntentProvider` (`expo-share-intent`) and watches `useShareIntent()` for an incoming shared image (from the OS share sheet, or — the main use case — an iOS Shortcut bound to the Action Button/Back Tap that takes a screenshot and shares it in). On receipt it feeds the image into `usePhotoTranslation.processImage()`, the same function the manual "Import screenshot" button in `PhotoTranslateView.tsx` calls. Falls back to `Image.getSize()` when the shared file's width/height come back `null` (the type allows it; some sources omit them).
- **`usePhotoTranslation.ts`** runs OCR via the OCR-Plus recognizer's `recognizePhoto()` method — reached through the public `useTextRecognition` hook's `.recognizer` handle. (The package's `createTextRecognitionPlugin`/`createTranslatorPlugin` factories exist internally but are **not** exported from its public `index.ts` in the installed version; always go through the hooks.) Re-scans automatically when the language pair changes (`direction.from`/`direction.to`).
- **`useTranslator.ts`** wraps ML Kit Translate (via OCR-Plus's `useTranslate`) with an in-memory cache keyed by `` `${from}|${to}|${text}` ``, and tracks "model downloading" / error state for the UI (first use of a language pair downloads an ML Kit Translate model).
- **`TranslationOverlay.tsx`** draws one translated-text patch per `DetectedBlock` (`src/types.ts`), positioned via `mapImageRectToScreen` (`src/utils/geometry.ts`) — a plain uniform scale from the image's own pixel coordinates to its on-screen displayed size (no cropping, since the image is shown at its own aspect ratio).

**OCR script constraint**: ML Kit's on-device text recognizer only reads five scripts (Latin, Chinese, Japanese, Korean, Devanagari) — see `ocrScriptForLanguage()` / `OCR_SOURCE_LANGUAGES` in `src/constants/languages.ts`. This is why the "From" language picker is a restricted subset of the "To" picker (translation targets aren't limited the same way). `LanguageCode` is re-exported from the OCR-Plus package's own `Languages` type rather than hand-maintained, because that type does not match ISO 639-1 exactly (notably no `sv`/Swedish or `hr`/Croatian) — don't widen `LanguageCode` by hand, it'll break at the type level against the library.

**There is no camera feature.** An earlier version had a live-camera OCR mode (`react-native-vision-camera` frame processors); it was removed because the user only wanted the share/Shortcut flow. Don't reintroduce camera UI, permissions, or a `<Camera>`/`useCameraDevice`/`useCameraPermission` import unless explicitly asked.

**`react-native-vision-camera` and its worklets packages (`react-native-vision-camera-worklets`, `react-native-worklets`) stay in `package.json` despite no camera feature** — they're required peer dependencies of `react-native-vision-camera-ocr-plus` (confirmed empirically: removing them from `dependencies` gets them silently reinstalled by npm's peer-dependency resolution regardless, since the OCR package's `peerDependencies` require `react-native-vision-camera >=5.0.0` etc. with no `peerDependenciesMeta` opt-out). Don't try to remove them again without a different OCR library.

**A floating overlay that sits on top of other apps (Mobizen-style) is not possible on iOS** — this is an OS sandbox restriction (no API for a third-party app to draw over another app's window), not an App Store policy one, so it isn't unlocked by local/sideloaded distribution either. The Action Button/Shortcut share-intent flow is the platform ceiling; don't attempt to build toward a true overlay on iOS. It would be possible on Android only, via a `SYSTEM_ALERT_WINDOW` overlay + Accessibility Service — a large native-Kotlin undertaking, not built here.

### Config plugin gotchas (`app.json`)

- Setting `android.permissions` in `app.json` switches Android manifest generation into "exact allowlist" mode — permissions requested by native modules but *not* listed there get an explicit `tools:node="remove"` override, stripping them even if another library needs them. There's currently no `android.permissions` entry at all (nothing in this app needs a runtime Android permission).
- `expo-image-picker`'s plugin options `cameraPermission`/`microphonePermission` are set to `false` — this is intentional and safe now that there's no camera feature (it previously caused a real bug when the camera feature still existed and needed that permission; see git history / README "Testing status"). If you ever add something that needs camera/mic again, these will need revisiting.
- When adding/changing a config plugin, verify it with `rm -rf ios android && npx expo prebuild --no-install` and inspect the generated `AndroidManifest.xml` / `Info.plist` — `tsc`/`expo export` won't catch native manifest issues:
  ```bash
  grep -n "uses-permission" android/app/src/main/AndroidManifest.xml
  grep -n "NSCameraUsageDescription\|NSMicrophoneUsageDescription\|NSPhotoLibraryUsageDescription" -A1 ios/*/Info.plist
  ```

## Testing status

No physical device, camera, simulator, or macOS/Xcode is available in this environment. Everything has been verified only via `tsc --noEmit`, `expo export` (bundle-only), and `expo prebuild` (confirms config plugins generate the expected native project files, e.g. catching the permission bugs mentioned above) — never by actually running the app. Live behavior (OCR accuracy, translation latency, overlay alignment, the Share Extension appearing in iOS's share sheet, a Shortcut actually launching it) is unverified. Say so explicitly rather than claiming a change works if you can't run it here either.
