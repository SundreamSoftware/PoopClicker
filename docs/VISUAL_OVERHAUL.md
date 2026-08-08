# Visual overhaul audit and roadmap

Date: 2026-08-08

## Current diagnosis

The previous presentation was mechanically complete but visually read as a prototype:

1. **Flat world cards** — worlds changed palette, but lacked architectural depth and recognizable
   environmental composition.
2. **Weak gameplay hierarchy** — currency, CPS, combo, and permanent currencies competed in small
   text rather than forming a readable game HUD.
3. **Mechanical tap response** — squash and floating numbers existed, but were too brief/subtle to
   communicate impact.
4. **Generic navigation** — text-only dock and minimal active state resembled a web dashboard.
5. **Flat collection previews** — color circles did not demonstrate skin identity.
6. **Uniform panels** — lists, buttons, goals, and tabs lacked differentiated elevation/tactility.
7. **Toilet/material flatness** — ceramic and body layers lacked enough highlight, edge, and shadow.
8. **System-navigation collision** — Android navigation controls could overlay the dock.

## Art direction

### Visual language

- **Tone:** absurd premium bathroom toy, not gross-out clip art.
- **Shapes:** rounded organic hero/toilet; structured ceramic/metal environments.
- **Materials:** glossy ceramic, soft body shading, brass/gold rewards, neon late-game VFX.
- **Depth:** wall, framed prop, floor perspective, hero, particles/HUD.
- **Color:** dark teal shell around bright world-specific stages; orange physical CTA; gold rewards.

### Motion language

- Tap: compression → overshoot → settle, plus radial burst and readable reward floater.
- Idle: low-amplitude breathing and environmental motion.
- Fast/Frenzy: progressively stronger secondary motion, never just faster looping.
- Navigation: short elevation/color response; content remains stable to avoid motion sickness.
- Reduced motion: removes burst and recurring motion while retaining state/contrast.

## Implemented first pass

- Compact layered HUD with readable PP, PPS/CPS/combo, GTP/FP/multiplier.
- Tactile icon navigation with safe-area padding.
- Android transient immersive navigation bar; swipe reveals system controls.
- Layered world architecture: wall grid, lighting, framed details, perspective floor, props.
- Per-world environment treatments for office, space, quantum/neon, volcanic, cloud, and throne.
- Stronger toilet ceramic material and hero/body depth.
- 220 ms tap-impact animation, radial particle burst, longer reward floater.
- Tactile buttons, segmented tabs, elevated panels/goals.
- Skin thumbnails with face/highlight and special Corny/Diamond/Cyber/Glitch/404/Black Hole treatments.

## Next visual phases

### Phase 2 — authored vector kit (P1)

- Create reusable SVG prop kit: tile sets, mirrors, pipes, shelves, signage, paper, graffiti.
- Give every world one unique silhouette-defining prop, not just palette changes.
- Create 6 benchmark hero skins (Classic, Corny, Diamond, Cyber, 404, Black Hole) as art-quality
  references before expanding all skins.
- Add event-specific animation direction: anticipation, active loop, success, failure.

### Phase 3 — production asset pipeline (P2)

- Move selected procedural vectors into versioned SVG assets with viewBox/anchor conventions.
- Add atlas/audio budgets and asset validation.
- Replace remote font dependency with bundled licensed font files.
- Produce Play Store screenshots from physical devices.

### Phase 4 — measured polish (P2/P3)

- Profile frame time and layer count on a mid-tier Android device.
- Tune animation duration/particle count from retention and accessibility feedback.
- Add device-quality tiers only if profiling shows a need.

## Acceptance gates

- A skin is recognizable at thumbnail size without its label.
- A world is recognizable in grayscale by its props/silhouette.
- Tap feedback begins in the same rendered frame and does not create unbounded DOM nodes.
- Dock remains reachable with gesture and three-button Android navigation.
- Reduced Motion preserves gameplay state without repeating movement.
- Play screen keeps the hero as the dominant visual element.
