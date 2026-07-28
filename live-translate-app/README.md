# Live Translate

A React Native (Expo) app with two ways to translate text, both running
entirely **on-device** via Google's ML Kit — no server round-trip for the
vision pipeline, no images uploaded anywhere:

1. **Live Camera** — point the phone at real-world text (a sign, a menu, a
   page) and see translated captions overlaid on the live preview in real
   time. Nothing is ever saved: each camera frame is analyzed in memory and
   discarded (`frame.dispose()`).
2. **Photo** — import a screenshot (e.g. of a WhatsApp chat) from your photo
   library, or **share one in from anywhere (including a Shortcut bound to
   your Action Button or Back Tap)**, and get translated captions overlaid
   directly on top of it — automatically, no in-app taps needed for the
   share path.

These solve different problems, worth being explicit about: **Live Camera
reads the physical world through the lens; it cannot read text that's
already on your phone's own screen (e.g. inside another app).** Reading
another app's on-screen content (like a live, automatic WhatsApp overlay
translator) is not something any third-party app can do on iOS — Apple's
sandbox doesn't allow an app to read another app's screen content or draw a
persistent overlay over it. Android *can* do this via an Accessibility
Service (a fundamentally different, Android-only app — not built here).
**Photo mode is the cross-platform, App-Store-legal way to translate chat
text**: you take the screenshot yourself (one system gesture), import it,
and get an instant on-device translation overlaid on the image — no
manual copy/paste, no per-message selection.

## How it works

### Live Camera

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

### Photo

```
User imports an image (expo-image-picker)
   │
Still-image OCR (ML Kit, via the same OCR-Plus recognizer, recognizePhoto())
   │  bounding boxes + text per block, in image pixel coordinates
   ▼
On-device translation (same cached ML Kit Translate as Live Camera)
   ▼
<TranslationOverlay> — same component as Live Camera, mapped onto the
static image instead of a camera frame
```

Both modes share the same translation cache/model wrapper and the same
overlay component — Live Camera and Photo differ only in *where the text
comes from* (a camera frame vs. a still image) and how its bounding boxes
get mapped to screen coordinates (cover+crop+rotate for the camera vs. a
plain uniform scale for a displayed image).

### Key pieces

- `src/hooks/useLiveTranslation.ts` — camera frame processor: scans each
  sampled frame for text blocks, updates overlay state, and kicks off
  (cached, de-duplicated) translation for any newly-seen text.
- `src/hooks/usePhotoTranslation.ts` — runs still-image OCR
  (`recognizer.recognizePhoto()`) on an imported image and translates each
  block the same way; re-scans automatically when the language pair changes.
- `src/hooks/useTranslator.ts` — thin wrapper around ML Kit Translate with an
  in-memory cache so identical text isn't re-translated every time, plus
  "model ready" / error state for the UI. Shared by both modes.
- `src/utils/geometry.ts` — `mapFrameRectToScreen` (camera: scale + crop +
  rotate for `resizeMode: "cover"`) and `mapImageRectToScreen` (photo: plain
  uniform scale, since the image is displayed at its own aspect ratio with
  no cropping).
- `src/components/CameraTranslateView.tsx` / `PhotoTranslateView.tsx` — the
  two screens.
- `src/components/TranslationOverlay.tsx` — shared: draws one
  translated-text patch per detected block, positioned over the original
  text; takes a `mapRect` function so both modes can reuse it.
- `App.tsx` — floating bottom tab bar switching between the two modes; the
  From/To language selection is shared across both.

## Action Button / Back Tap shortcut (iOS)

Live Translate registers as a share target (via `expo-share-intent`), so it
can receive an image from iOS's share sheet — including from the Shortcuts
app — and translates it the instant it arrives, with zero taps inside the
app itself. Combined with an iOS Shortcut bound to a hardware gesture, this
is the closest thing to "one press, from inside any app, translated" that
iOS allows (see "Requirements & limitations" for why a true floating
overlay isn't possible there).

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
Button (or back-tap), and Live Translate opens directly on the Photo tab
with the chat already translated — no manual screenshot, no "Import" tap.
It does switch away from WhatsApp to show the result (iOS doesn't allow a
floating result over another app's window), but it's a single action from
inside the chat to a translated screen.

This is implemented in `App.tsx`: `useShareIntent()` (from
`expo-share-intent`) watches for an incoming shared image, switches to
Photo mode, and calls the same `usePhotoTranslation` pipeline Photo mode's
manual "Import screenshot" button uses.

## Requirements & limitations

- **This needs a Development Build, not Expo Go.** Both OCR paths run
  through native modules (`react-native-vision-camera` frame processors and
  ML Kit via Nitro) that Expo Go doesn't include. See "Running it" below.
- **Camera-readable / OCR-readable languages are limited by ML Kit's
  on-device text recognizer**, which only understands five scripts: Latin,
  Chinese, Japanese, Korean, and Devanagari. This applies to *both* modes
  (Live Camera and Photo import) — the "From" picker only lists languages
  using those scripts, while "To" lists everything ML Kit can translate
  into (e.g. you can translate *into* Arabic or Thai, but the OCR step
  can't currently read Arabic or Thai text on-device).
- **First use of a language pair downloads a small translation model** (ML
  Kit Translate), so the first translation after switching languages may
  take a moment and needs a network connection once; after that it works
  offline.
- **A floating icon that sits on top of other apps (like Mobizen) is not
  possible on iOS**, for any app — it's an OS sandbox restriction, not an
  App Store policy one, so it holds regardless of how the app is
  distributed. The Action Button / Back Tap Shortcut (below) is the closest
  iOS equivalent: one physical action from inside any app, no floating UI.
- **Overlay positioning is a best-effort mapping** from source coordinates
  to screen coordinates. It's implemented per the documented behavior of
  the camera/OCR libraries, but exact sensor orientation and crop behavior
  can vary slightly by device — this hasn't been calibrated against
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

A physical device is strongly recommended for Live Camera mode —
simulators/emulators generally don't expose a real camera feed with live
text to translate. Photo mode works fine in a simulator using a sample
screenshot from its photo library.

## Testing status

This app was built and type-checked (`tsc --noEmit`) and bundle-verified
(`expo export`) in a sandboxed environment without a physical device,
camera, or simulator available. The code follows the libraries' documented
public APIs, but neither mode's live behavior — OCR accuracy, translation
latency, overlay alignment in Live Camera, or image OCR in Photo mode — has
been exercised on real hardware. Treat the overlay geometry and
frame-skip/performance constants (`FRAME_SKIP_THRESHOLD` in
`useLiveTranslation.ts`) as a starting point to tune once you can run it on
a device.

The `expo-share-intent` integration was checked one level deeper: `npx expo
prebuild` was run to confirm it generates without error and actually
produces an `ios/ShareExtension` target and the right `Info.plist`/
`AndroidManifest.xml` entries (that step also caught a real bug — an
`expo-image-picker` config option was silently stripping the Android
`CAMERA` permission app-wide, since Android permissions aren't scoped
per-library; fixed). What's still unverified: the Share Extension actually
compiling and appearing in the iOS share sheet, a Shortcut successfully
launching it, and `useShareIntent()` firing with real data — all of that
needs a Mac + Xcode + a physical iPhone, none of which are available here.

## Project structure

```
App.tsx                          entry point + mode switcher (Live Camera / Photo)
src/
  components/
    CameraTranslateView.tsx      live camera screen + language pickers
    PhotoTranslateView.tsx       photo-import screen + language pickers
    TranslationOverlay.tsx       shared: renders translated-text patches
    LanguagePicker.tsx           bottom-sheet language selector
    PermissionGate.tsx           camera permission request/denied UI
  hooks/
    useLiveTranslation.ts        camera frame processor + OCR/translation state
    usePhotoTranslation.ts       still-image OCR + translation state
    useTranslator.ts             cached ML Kit Translate wrapper (shared)
  constants/
    languages.ts                 supported languages + OCR script mapping
  utils/
    geometry.ts                  frame-space / image-space → screen-space mapping
  types.ts
```
