# Peace Field - Project Context

## What This Is

Peace Field is a landing page for a back pain product. The core idea: a user sees a video of a person, and when it ends they're presented with an interactive back image. They click where it hurts, the back "twitches" like real skin reacting to touch, and then they're guided into an onboarding form.

The repo is at `github.com/curvlabs/peace-field`. The active development branch is `claude/goofy-montalcini`.

## Tech Stack

- **Vanilla HTML/CSS/JS** (no frameworks, no build step)
- **Three.js** (loaded via CDN import map) for the interactive back model
- **FormFlow** (myformflow.io) for the embedded onboarding form
- Served with any static server (e.g. `python3 -m http.server 8080`)

## The User Flow

1. **Intro video plays** (`assets/Curv_trimmed_video.mp4`) - autoplays muted on load
2. **Last frame captured** - when the video ends, the last frame is captured to an offscreen canvas, soft edge fades are baked in, and it becomes the texture for a Three.js plane
3. **"Where does your back hurt?" prompt appears** - text overlay fades in
4. **User clicks on the back** - triggers three things in sequence:
   - **Twitch** (immediate): Three.js vertex displacement at click point. Elliptical shape, gaussian falloff, convex push outward. Natural muscle twitch envelope with secondary pulse. 0.8s duration.
   - **Ripple** (400ms delay): CSS lilac bloom animation expanding outward. 2.5s duration.
   - **Label bubble** (1650ms delay): Pill-shaped bubble saying "Let's figure out your [region] pain." with a blue arrow button.
5. **User clicks the arrow** - bubble pops, FormFlow modal opens

## Key Architecture Decisions

### Three.js Back Model (app.js)
- Uses a **subdivided PlaneGeometry** (128 segments) with the video's last frame as a texture
- The back image is NOT a 3D model file - it's a 2D image mapped onto a flat plane that can deform
- **Vertex displacement** creates the twitch: vertices near the click point push outward with elliptical radius (wider horizontally to follow body shape)
- **Orthographic camera** fitted to match `object-fit: contain` behavior
- Click coordinates are converted: screen -> NDC -> world -> local mesh coords
- Original vertex positions are stored and reset each frame before applying active displacements

### Edge Fading
- **Two systems** handle edge fading:
  1. **CSS mask on `#introVideo`** - composite mask with horizontal + vertical gradients (for during video playback)
  2. **Overlay divs** (`.edge-fade-*`) - four absolutely positioned divs with gradients from page background color (`#f0ebe6`) to transparent, at z-index 3 above both video and canvas
  3. **Baked texture fade** - when capturing the last frame, `destination-out` compositing erases edges with gradients directly in the texture
- The edge fade is still being refined - the user wants it to look like the reference image (augen site) where the person's edges dissolve softly into the background on all sides

### State Machine
- `loading` - video playing, frames being captured
- `interactive` - video ended, back is clickable
- `bubble` - user has clicked, twitch/ripple/bubble animating (no more clicks)
- `form` - FormFlow modal is open

### Body Region Detection (getBodyRegion)
- Maps click position to named regions using percentage-based zones
- Vertical: neck (<12%), upper back (12-28%), mid back (28-48%), lower back (48-68%), tailbone (>68%)
- Horizontal: left (<35%), right (>65%), center
- Output: e.g. "left lower back", "upper back"

## Files

```
index.html          - Single page: video, canvas, edge-fade divs, hurt prompt, form modal
app.js              - Three.js setup, video capture, twitch physics, click handling, UI
styles.css          - All styling: layout, edge fades, ripple/bubble animations, form modal
assets/
  Curv_trimmed_video.mp4  - Intro video (trimmed so last frame shows the back clearly)
  back.png                - Original static back image (not currently used)
  FLORA Image.webp        - Brand asset
  strip.mp4               - Strip animation (not currently used in this branch)
  twitch.mp4 / 2 / 3      - Pre-recorded twitch videos (not used - replaced by Three.js)
```

## Twitch Parameters (tunable in app.js)

```js
TWITCH_RADIUS_X = 0.22   // Horizontal reach (wider to follow body)
TWITCH_RADIUS_Y = 0.15   // Vertical reach
TWITCH_STRENGTH = 0.025  // How far vertices push
TWITCH_DURATION = 0.8    // Seconds
```

The envelope function: `exp(-4t) * (1 + 0.3 * sin(t * PI * 2.5))` - fast exponential decay with one subtle secondary pulse.

## Color Palette

- Page background: warm cream gradient (`#f8f6f4` to `#d5cec5`)
- Ripple colors: lilac/blue palette (6 variations of purple, cornflower blue, lavender)
- Text: near-black (`#1a1a1a`)
- Bubble: frosted glass (`rgba(240,240,240,0.95)` + backdrop blur)
- Arrow: iOS blue (`#3478f6`)

## Git Branches

- `main` - stable base (static image version)
- `claude/goofy-montalcini` - **active branch** with Three.js interactive back + intro video
- `experiment-1` - earlier experiment with CSS-based twitch (committed, not active)
- `experiment-2`, `experiment-3`, `claude/sleepy-poitras` - other experiments

## Known Issues / In Progress

- **Edge fade on video** - the left/right gradient fades during video playback aren't as strong as wanted. The user wants edges that dissolve like the augen website reference (very soft, wide fade on all sides). Overlay divs are in place but may need further tuning.
- **Edge fade color** - currently hardcoded to `#f0ebe6` which is the mid-point of the page gradient. May not perfectly match at top/bottom of viewport.

## Design References

- The user showed an "augen" website screenshot as reference for how the person's image should dissolve into the background - very soft, wide gradients on all edges
- The label bubble design matches a pill-shaped notification bar with text + circular blue arrow button
