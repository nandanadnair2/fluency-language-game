# AR Features — Real AI Object Detection

## What it does
The AR Discovery tab uses **real** in-browser object detection powered by:
- **TensorFlow.js** (`@tensorflow/tfjs`)
- **COCO-SSD** (`@tensorflow-models/coco-ssd`) — a Single Shot Detector
  trained on the **COCO dataset** (80 everyday object classes, 200k images)

It runs entirely locally in the browser (WebGL backend). When the camera
shows a real object, a bounding box + Japanese word appears on it. A blank
piece of paper correctly shows **"No objects detected"**.

## How detection works
1. On mount, `cocoSsd.load({ base: "lite_mobilenet_v2" })` downloads the
   model (~5 MB, one time only, cached).
2. A loop calls `model.detect(video, 15, 0.55)` every 1.2s over the live
   camera frame.
3. Each prediction (class + confidence + bbox) is mapped through `JP_MAP`
   to its Japanese kanji/kana, romaji, and color.
4. Detected words render as floating labels over the video. Tap "save" to
   add to vocabulary (+25 XP).

## Notes
- Model runs on the user's GPU via WebGL — no server, no API keys.
- COCO-SSD recognizes ~80 common classes (person, car, cup, dog, laptop,
  chair, potted plant, etc.). Objects outside the COCO set won't be detected.
- Front camera (`facingMode: "user"`) used by default for laptops.

## Files
- `src/components/ARTab.tsx` — detection UI + TFJS/COCO-SSD logic
- `package.json` — `@tensorflow/tfjs`, `@tensorflow-models/coco-ssd`
