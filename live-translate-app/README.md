# Live Translate

A React Native (Expo) app that translates text **live, directly on screen**, by
reading it straight off the camera feed and drawing translated captions over
it in real time. It never takes a photo or a screenshot — every frame is
analyzed in memory by an on-device OCR + translation pipeline and then
discarded (`frame.dispose()`), so nothing is captured, stored, or uploaded.

## How it works

```
Camera sensor
   │  (frame processor, ~4x/sec)
   ▼
On-device text recognition (ML Kit, via react-native-vision-camera-ocr-plus)
   │  bounding boxes + text per block
   ▼
On-device translation (ML Kit Translate, cached per unique string)
   │  translated string per block
   ▼
<TranslationOverlay> — absolutely-positioned Views drawn on top of the
live <Camera> preview, repositioned every time new OCR results arrive
```

Everything — recognition and translation — runs **on-device** via Google's ML
Kit. There's no screenshot, no server round-trip for the vision pipeline, and
no network requirement once the translation model for a language pair has
been downloaded once.

### Key pieces

- `src/hooks/useLiveTranslation.ts` — runs the camera frame processor: scans
  each sampled frame for text blocks, updates overlay state, and kicks off
  (cached, de-duplicated) translation for any newly-seen text.
- `src/hooks/useTranslator.ts` — thin wrapper around ML Kit Translate with an
  in-memory cache so identical text seen across consecutive frames isn't
  re-translated every time, plus "model ready" / error state for the UI.
- `src/utils/geometry.ts` — maps a recognized block's bounding box from the
  camera frame's coordinate space into on-screen pixel coordinates (the
  preview renders with `resizeMode: "cover"`, so this does the scale +
  center-crop + orientation math).
- `src/components/CameraTranslateView.tsx` — the camera screen: live preview,
  overlay, and the From/To language pickers.
- `src/components/TranslationOverlay.tsx` — draws one translated-text patch
  per detected block, positioned over the original text.

## Requirements & limitations

- **This needs a Development Build, not Expo Go.** Live OCR runs through
  `react-native-vision-camera`'s frame processors and ML Kit, which are
  native modules Expo Go doesn't include. See "Running it" below.
- **Camera-readable languages are limited by ML Kit's on-device text
  recognizer**, which only understands five scripts: Latin, Chinese,
  Japanese, Korean, and Devanagari. That's why the "From" language picker
  only lists languages using those scripts, while "To" lists everything ML
  Kit can translate into (e.g. you can translate *into* Arabic or Thai, but
  can't currently point the camera *at* Arabic or Thai text and have it
  recognized on-device).
- **First use of a language pair downloads a small translation model** (ML
  Kit Translate), so the first translation after switching languages may
  take a moment and needs a network connection once; after that it works
  offline.
- **Overlay positioning is a best-effort mapping** from sensor frame
  coordinates to screen coordinates. It's implemented per the documented
  behavior of the camera/OCR libraries, but exact sensor orientation and
  crop behavior can vary slightly by device — this hasn't been calibrated
  against physical hardware in this environment (see "Testing status").

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

A physical device is strongly recommended — simulators/emulators generally
don't expose a real camera feed with live text to translate.

## Testing status

This app was built and type-checked (`tsc --noEmit`) and bundle-verified
(`expo export`) in a sandboxed environment without a physical device,
camera, or simulator available. The code follows the libraries' documented
APIs, but the live camera experience — OCR accuracy, translation latency,
and overlay alignment — has not been exercised on real hardware. Treat the
overlay geometry and frame-skip/performance constants
(`FRAME_SKIP_THRESHOLD` in `useLiveTranslation.ts`) as a starting point to
tune once you can run it on a device.

## Project structure

```
App.tsx                          entry point
src/
  components/
    CameraTranslateView.tsx      camera screen + language pickers
    TranslationOverlay.tsx       renders translated-text patches
    LanguagePicker.tsx           bottom-sheet language selector
    PermissionGate.tsx           camera permission request/denied UI
  hooks/
    useLiveTranslation.ts        frame processor + OCR/translation state
    useTranslator.ts             cached ML Kit Translate wrapper
  constants/
    languages.ts                 supported languages + OCR script mapping
  utils/
    geometry.ts                  frame-space → screen-space bounding boxes
  types.ts
```
