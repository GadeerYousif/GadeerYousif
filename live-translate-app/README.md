# Live Translate

A React Native (Expo) app that translates a screenshot the instant it's
shared to it — most importantly, from an iOS Shortcut bound to the Action
Button or Back Tap, so translating a chat (e.g. a foreign-language WhatsApp
group) is a single physical action from inside the chat: screenshot → share
→ translated. Text recognition and translation both run **on-device** via
Google's ML Kit — no server round-trip, nothing uploaded.

Two ways in:

1. **Share it in** (the main path) — a Shortcut takes a screenshot and
   shares it to Live Translate, which recognizes and translates the text
   and shows it overlaid on the image immediately, with zero taps inside
   the app.
2. **Import screenshot** button — same pipeline, manually, for when you
   already have a screenshot saved (e.g. from Photos).

## Why a Shortcut instead of a floating overlay

The obvious "Mobizen-style" version of this — a floating icon that sits on
top of WhatsApp and shows a translation overlay right there — **is not
possible on iOS, for any app.** It's an OS sandbox restriction (no API lets
a third-party app draw over another app's window or read its content), not
an App Store policy one, so it holds even for a purely local/sideloaded
build. An iOS Shortcut bound to a hardware gesture is the closest iOS
allows: one action, from inside any app, straight to a translated result —
it just has to switch to Live Translate to show it, rather than overlaying
WhatsApp in place.

(Android *can* do a true floating overlay, via `SYSTEM_ALERT_WINDOW` + an
Accessibility Service reading WhatsApp's text directly — a fundamentally
different, much larger native-Kotlin build, not implemented here.)

## Action Button / Back Tap shortcut (iOS)

**One-time setup, on your iPhone, after installing the dev build:**

1. Open the **Shortcuts** app → **+** to create a new Shortcut.
2. Add the **Take Screenshot** action.
3. Add the **Share** action, feed it the screenshot from step 2, and pick
   **Live Translate** from the app list (it appears there once the dev
   build with the Share Extension is installed).
4. Name the Shortcut (e.g. "Translate Screen").
5. Bind it to a gesture:
   - **Action Button** (iPhone 15 Pro or later): Settings → Action Button →
     scroll to *Shortcut* → select "Translate Screen".
   - **Back Tap** (any iPhone): Settings → Accessibility → Touch → Back Tap
     → Double Tap (or Triple Tap) → select "Translate Screen".

**To use it**: open the foreign-language WhatsApp chat, press the Action
Button (or back-tap), and Live Translate opens with the chat already
translated — no manual screenshot, no "Import" tap.

## How it works

```
Shortcut takes a screenshot → shares it to Live Translate
   │                                    (or: manual "Import screenshot")
   ▼
useShareIntent() (expo-share-intent) receives the image
   │
Still-image OCR (ML Kit, via react-native-vision-camera-ocr-plus's recognizePhoto())
   │  bounding boxes + text per block, in image pixel coordinates
   ▼
On-device translation (ML Kit Translate, cached per unique string)
   ▼
<TranslationOverlay> — absolutely-positioned Views drawn on top of the
displayed image, one per detected block
```

### Key pieces

- `App.tsx` — wraps the tree in `ShareIntentProvider`; `useShareIntent()`
  watches for an incoming shared image and feeds it into
  `usePhotoTranslation`, the same pipeline the manual import button uses.
- `src/hooks/usePhotoTranslation.ts` — runs still-image OCR
  (`recognizer.recognizePhoto()`) and translates each block; re-scans
  automatically when the language pair changes.
- `src/hooks/useTranslator.ts` — thin wrapper around ML Kit Translate with
  an in-memory cache so identical text isn't re-translated twice, plus
  "model ready" / error state for the UI.
- `src/utils/geometry.ts` — `mapImageRectToScreen`: maps a block's bounding
  box from the image's own pixel coordinates to on-screen coordinates (a
  plain uniform scale, since the image is displayed at its own aspect
  ratio with no cropping).
- `src/components/PhotoTranslateView.tsx` — the screen: language pickers,
  import button, image + overlay.
- `src/components/TranslationOverlay.tsx` — draws one translated-text patch
  per detected block, positioned over the original text.

## Requirements & limitations

- **This needs a Development Build, not Expo Go.** OCR/translation runs
  through ML Kit via Nitro modules, and the share-intent path needs a real
  iOS Share Extension target — neither is available in Expo Go.
- **OCR-readable languages are limited by ML Kit's on-device text
  recognizer**, which only understands five scripts: Latin, Chinese,
  Japanese, Korean, and Devanagari. The "From" picker only lists languages
  using those scripts, while "To" lists everything ML Kit can translate
  into (e.g. you can translate *into* Arabic or Thai, but the OCR step
  can't currently read Arabic or Thai text on-device).
- **First use of a language pair downloads a small translation model** (ML
  Kit Translate), so the first translation after switching languages may
  take a moment and needs a network connection once; after that it works
  offline.
- **`react-native-vision-camera` and its worklets packages are still
  dependencies**, even though this app has no camera feature — they're
  required peer dependencies of `react-native-vision-camera-ocr-plus`
  (confirmed: removing them from `package.json` gets them silently
  reinstalled by npm's peer-dependency resolution anyway). They're dead
  weight in the bundle, not a functional camera capability — no camera
  permission is requested anywhere in this app.
- **Overlay positioning is a best-effort mapping** from image pixel
  coordinates to screen coordinates. It's implemented per the documented
  library behavior, but hasn't been calibrated against a real screenshot on
  physical hardware in this environment (see "Testing status").

## Running it

```bash
cd live-translate-app
npm install

# Build and run a development client (needed once per platform/device):
npx expo prebuild
npx expo run:ios       # requires macOS + Xcode
npx expo run:android   # requires Android Studio / SDK

# After that, for day-to-day development:
npx expo start --dev-client
```

## Testing status

This app was built and type-checked (`tsc --noEmit`) and bundle-verified
(`expo export`) in a sandboxed environment without a physical device,
simulator, or macOS/Xcode available. `npx expo prebuild` was also run after
every `app.json`/config-plugin change to confirm it generates without
error and produces the expected native project files — e.g. the
`ios/ShareExtension` target, and the right `Info.plist`/
`AndroidManifest.xml` permission entries (that check caught two real bugs:
an `expo-image-picker` config option silently stripping Android's
`CAMERA` permission app-wide while the camera feature still existed, and
later, after the camera feature was removed, a leftover default camera
permission string still being injected — both fixed; see `AndroidManifest.xml`/
`Info.plist` inspection commands in `CLAUDE.md` if you change permissions
again).

What's still unverified, because there's no way to check it without real
hardware: OCR accuracy, translation latency, overlay alignment against an
actual screenshot, the Share Extension actually compiling and appearing in
iOS's share sheet, and a Shortcut successfully launching it end-to-end.

## Project structure

```
App.tsx                          entry point, ShareIntentProvider + share-intent handling
src/
  components/
    PhotoTranslateView.tsx       the screen: language pickers, import button, image + overlay
    TranslationOverlay.tsx       renders translated-text patches
    LanguagePicker.tsx           bottom-sheet language selector
  hooks/
    usePhotoTranslation.ts       still-image OCR + translation state
    useTranslator.ts             cached ML Kit Translate wrapper
  constants/
    languages.ts                 supported languages + OCR script mapping
  utils/
    geometry.ts                  image-space → screen-space bounding box mapping
  types.ts
```
