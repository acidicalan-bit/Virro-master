# Performance and Accessibility Budget

## User-experience targets

Measured on a realistic mid-tier mobile device and throttled mobile connection, at the 75th percentile where field data is available:

| Metric | Budget |
| --- | --- |
| LCP | < 2.5 s |
| CLS | < 0.10 |
| INP | < 200 ms |
| TTFB | < 800 ms target for public HTML |
| Initial route JS | ≤ 85 kB compressed, excluding framework baseline; each new island justified |
| Motion layer | ≤ 6 kB compressed initial feature layer if Motion is used |
| Hero media | No video; ≤ 180 kB total critical imagery; prefer CSS/SVG/HTML |
| Fonts | System fonts initially; if added, ≤ 2 WOFF2 files and ≤ 120 kB total |
| Below-fold initialization | No hydration/observation until near viewport when possible |

Budgets are release gates, not aspirations. WEB-001 must record actual build output and a mobile lab run before production cutover.

## Above-the-fold budget

Maximum in the first viewport:

- one H1 and supporting paragraph;
- two CTAs;
- one WorkState Field initial frame;
- one short authored transition controller;
- no autoplay video, canvas, WebGL, Rive, 3D model, or remote third-party script;
- no client-side data fetch required for first meaningful content.

## Performance risk report

| Risk | Likely failure | Mitigation / gate |
| --- | --- | --- |
| Whole homepage as client component | High hydration and delayed interactivity | Server-first shell; isolate 3–4 bounded client islands |
| Motion imported through full `motion` component | ~34 kB feature layer before app logic | Prefer CSS/WAAPI; otherwise LazyMotion/m or `useAnimate` mini |
| Complex SVG graphs | Large DOM, slow style/paint, mobile overlap | Fixed node/edge counts; HTML nodes; bounded SVG; mobile rail variant |
| React Flow | Editor machinery for a fixed story | Defer unless exploratory graph interaction is a real requirement |
| Rive / WebGL | WASM/assets/render loop; weak crawlable semantics | Reject in WEB-001 |
| Scroll listeners | Layout thrashing and INP regressions | IntersectionObserver; transform/opacity only; no synchronous read/write loop |
| Decorative continuous animation | Battery/CPU cost and distraction | No animation at rest; stop observers/loops off-screen |
| Large screenshots/video | LCP and bandwidth regressions | Product mechanism in HTML/CSS/SVG; responsive image sizes if evidence images are added |
| Web fonts | Render delay and layout shift | System stack; explicit metrics/preload only for a later justified font |
| Third-party analytics/forms | Blocking scripts, privacy coupling | Defer; load after consent/interaction only if approved |
| Shared product/marketing build | Product dependency and secret leakage | Separate repository/project boundary |

## Accessibility baseline

Target WCAG 2.2 AA for the public surface.

- One H1 per page; semantic section headings and landmarks.
- Skip link and visible focus indicator on every interactive element.
- Keyboard order follows reading order; no focus trap outside true modal/dialog behavior.
- Every hover behavior has focus/click/touch equivalent.
- Minimum target size 44×44 CSS px for primary controls; dense inspector controls may use an equivalent spaced target.
- Text contrast ≥ 4.5:1; large text/UI boundaries meet applicable AA thresholds.
- State is communicated by label + form/icon/line style, never color alone.
- Dynamic state updates use a restrained live region; no repeated announcement during animation frames.
- Decorative connector SVGs are hidden from assistive technology; a structured list/tree describes the same relationship.
- Page remains complete at 200% zoom and at 320 CSS px width without horizontal page scrolling.

## Reduced-motion contract

Every major animation has a semantic fallback:

| Motion | Normal | Reduced motion |
| --- | --- | --- |
| New signal | short pulse/trace | static “new signal” label |
| Propagation | edge trace | affected lines change immediately |
| State commit | snap/alignment | version and chip replace immediately |
| Stale dependency | dim/break transition | dashed/broken edge + STALE label |
| Provenance inspection | short expansion | region appears with no transform |
| Module entrance | subtle opacity/translate | content is present immediately |

Respect changes to `prefers-reduced-motion` while the page is open. No meaning, timing requirement, or control is hidden inside an animation.

## Mobile gates

- WorkState diagrams switch to vertical rails rather than shrink below legible size.
- All labels remain at least 14px equivalent; body copy remains 16px.
- Interactions do not require hover or fine pointer precision.
- Tabs may become stacked disclosure sections where horizontal tab density is unsafe.
- Touch operation and virtual-keyboard focus do not cause unintended zoom/layout shifts.

## Validation plan

1. Build-size report and route JS review.
2. Lighthouse/mobile lab run for `/`, `/how-it-works`, and `/trust`.
3. Keyboard-only walkthrough of all controls.
4. Screen-reader smoke test for headings, state announcements, and graph alternatives.
5. 320px, 768px, and 1440px layout checks.
6. Reduced-motion comparison that proves identical meaning.
7. Automated contrast/semantic scan plus manual review.
