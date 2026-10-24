# The House Outlives Its Creator — project site

A single static page (HTML/CSS/JS, no build step, no dependencies besides Google Fonts) that introduces the game as a scroll story in eight sections:

01 theme · constraint · daemon → 02 the being beneath the house → 03 buried beneath the house → 04 left behind → 05 how the game works → 06 when the daemon dreams → 07 controls → 08 enter the house

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```
npx serve .
```

## Files

- `index.html`, `styles.css`, `main.js`: the page, its look and its interactions.
- `plan.js`: draws the game's floor plan as SVG and moves it the ways the game does (another organisation of the rooms, sliding grid lines, loose walls while he dreams).
- `plan-data.js`: generated from the game's `src/house/world/plan.js` and `layouts.js`. After changing the plan in the game, regenerate it:

  ```
  node scripts/build-plan-data.mjs ../Dishadesign1503/ai-in-design-main/ai-in-design-main
  ```

- `assets/img/*.jpg`: cropped from the reference slides in `D:\powerpoint\SLIDE 1–4`. To regenerate them (Windows PowerShell):

  ```
  powershell -ExecutionPolicy Bypass -File scripts\crop-slides.ps1 -Out assets\img
  ```

Nothing on the page records the visitor. No microphone is used; tilt is read only after the visitor presses "Try it with this phone", and only to move the illustration.
