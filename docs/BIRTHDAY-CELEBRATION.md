# Birthday Celebration — visual template

Template `birthday-celebration`, templateVersion `"1"`, existing birthday-invitation/schemaVersion 1; plugin 0.6.2. Payments remain deferred. `birthday-party` and existing projects are not replaced or migrated.

## Design and palettes

A dark editorial invitation with an envelope and metallic seal, oversized serif name, foil-inspired age, edge balloons/photographic disco orb/ribbons, fine grain, generous spacing, a personal story, clearly separated event details, the real RSVP form and a quiet sparkler closing. This is an original vector/CSS interpretation of the supplied direction, not a raster copy of the reference image.

- Midnight Gold: midnight navy, warm gold, ivory.
- Disco Rose: plum, rose metal, pale blush.
- Stardust Silver: night blue, cool silver, ice white.

The existing palette enum is extended compatibly by three values. Catalog keeps each template's allowedAppearance separate: birthday-party still accepts only its original three values; Celebration accepts only its own three. Registry-based template defaults set Midnight Gold at creation without changing type defaults for old templates. The shared editor receives template identity to show only supported palettes. Neither API payloads nor stored snapshot shape changes.

Two local font families: Cormorant Garamond 4.001 (regular/italic) and Manrope 4.505, under OFL 1.1. Local subset WOFF2 total 182,620 bytes; notices and source hashes are in [THIRD-PARTY-ASSETS.md](THIRD-PARTY-ASSETS.md). No remote runtime assets.

## Structure and integration

`app/src/renderers/birthday-celebration/`:

- BirthdayCelebration.tsx: accessible cover/hero/story/details/reply/closing, open/skip/focus and controls.
- celebration.css: scoped typography, metallic surfaces, responsive layout and optional-field styling.
- palettes.ts: palette identities and effect colors.
- Decorations.tsx: scoped SVG gradients/IDs, balloons, ribbons and stars. All decorative/aria-hidden and pointer-transparent.
- Effects.tsx: ambient-only Canvas 2D; useConfetti.ts: the single canvas-confetti burst adapter.
- Envelope.tsx / envelope.css: paper planes, card, pocket, hinge and seal.
- useInvitationIntro.ts: one opening timeline and explicit closed/opening/opened state.
- DiscoBall.tsx: local Unsplash photograph with a soft mask and gentle suspension sway.
- useChoreography.ts: scoped GSAP opening/scroll choreography, motion preference and cleanup.
- fonts/: local WOFF2 and original OFL notices.

Trusted renderers/registry.ts lazy-loads only the selected template. Celebration opts into an optional renderer RSVP slot. The public shell passes the existing GuestForm and receives its real open/closed state through an optional presentation callback; the renderer imports no API/account/router module. Its CTA links to live RSVP only when open, otherwise to details. Legacy templates continue using the original external RSVP placement. No RSVP logic is duplicated; validation, secrets, idempotency and management are unchanged. Private preview shows a clear RSVP notice, with no submit action. Disabled RSVP displays an honest state.

## Choreography and motion

Click Open invitation: seal lifts over 0–0.24s; the hinged flap opens from 0.18–0.85s and switches behind the card after crossing its plane; the card rises from 0.7–1.44s; the envelope/card crossfades into the real hero over 1.48–2.48s. Confetti starts at the hero reveal (1.85s), not at the initial click. Name and optional age on the card come from configuration. There is one GSAP timeline for this sequence, with a synchronous state guard against double starts.

Skip intro remains available during opening, kills/reverts the timeline, resets bursts and shows the complete invitation with focus at details. Normal completion focuses the hero without forced scrolling. The inline intro is not a modal and does not lock page scroll; covered hero content is inert until opened. Public skip memory is sessionStorage `celebration-intro:envelope-v2:{projectKey}`, storing only "skipped". It affects only that project/version. Private preview ignores this memory and exposes Replay intro. Reduced motion opens immediately without a moving flap or burst.
The background draws <=20 ambient points on mobile, <=40 on desktop at a 30fps drawing ceiling, DPR <=1.25/1.5. Realistic Look-inspired confetti uses five profiles at each lower side, 110ms apart: 80 particles total on mobile and 168 on desktop, flat:false, varied spread/velocity/decay/scalar, 165 ticks, never looped. Floating balloons use low-amplitude transform animation. The closing sparkler lines unfold once on entry, with no repeated flashes. Celebrate again triggers only a brief optional burst.

Pause animations stops continuous Canvas, floating decorations and the photo sway, blocks delayed/new emissions and resets existing confetti rather than promising to resume the same particles. Content and forms remain usable. document.hidden suspends Canvas and floating decorations. Hero decorations pause outside intersection. Canvas removes RAF, visibility listener and observers on cleanup; GSAP contexts revert, ScrollTriggers are once-only and opening timeline is killed on unmount. Static page styles do not start with the whole document hidden. Caught Canvas/GSAP failures keep content accessible, clearing transient animation styles if needed.

Reduced motion: no cover wait, no Canvas, confetti, floating or scroll entrance animation; full invitation immediately visible, static decorations retained. The control reflects the system preference and Celebrate again is omitted. Native anchors and forms work normally.

## Demo and use

Local private preview: http://celebrations.local/app/sites/10/preview

Local publication: http://celebrations.local/s/98ddf7ec4fd399c19e934891195f0617/

New project “Alex’s 50th Birthday · Celebration demo”, created under existing administrator ID 1. It is separate from user projects and the earlier demo ID 8. Local public page includes real enabled RSVP. No test guest response is sent to LocalWP.

Creation helper, from LocalWP **Open site shell** in the WordPress root:

```sh
wp eval-file wp-content/plugins/microsite-core/scripts/create-celebration-demo.php --user=1
```

The helper is local/test-only and idempotent: rerunning returns the existing preview without modifying it. New user project: Create a site → Birthday invitation → birthday-celebration. Choose one of the three palettes in the shared editor; normal save/publication entitlement rules apply.

## Verification and artifacts

`TEST_SCOPE=celebration npm run test:integration` runs the new six HTTP/E2E groups on the existing fixed test database. Full runner includes previous stages. Checks cover catalog/default/version/palette isolation, shared editor persistence, owner-private preview, publication/snapshot, anonymous rendering, actual RSVP create and organizer removal, closed state, opening/skip/focus/pause/remount, console errors, lazy assets and production without Vite.

The matrix creates screenshots of all three palettes at 375×812, 390×844, 768×1024 and 1440×900 with reduced motion, plus normal cover/open hero/details/RSVP, 320px with 200% root text, max name/heading/message, omitted age/optional fields, and maximum venue/address/optional text with a three-digit age. Tests compare visibility/usable actions and check horizontal bounds rather than only DOM existence.

`node scripts/review-celebration-dev.mjs` uses the already-running Vite and a temporary, self-contained StrictMode harness (no API, auth or database). It edits/restores one source text to verify actual HMR, checks one ambient Canvas and one confetti Canvas, ScrollTrigger disposal and bounded outstanding RAF after unmount, remounts, injects Canvas/GSAP failures and verifies readable content. Visibility-handler suspension is tested by dispatching visibilitychange with a controlled hidden property; this is not a physical OS tab-switch benchmark. Temporary files and source edits are restored in finally.

Artifacts: `app/test-results/celebration/`. A WebM is recorded through the actual opening/controls flow; no final rendered video is substituted for testing. Screenshots and video are local ignored artifacts, not committed assets. Final actual results and visual review are in STATUS.md.

## Limits

Chromium/local verification is not a hardware performance benchmark or complete Safari/Firefox/accessibility audit. Native Canvas and SVG rendering can differ slightly by browser/GPU. Font subsets retain Latin/Latin Extended; other scripts use local fallback fonts. No photographic foil balloon asset is shipped: age and decorations are code-native, with an intentionally controlled visual density. LocalWP is not public hosting. Existing account-launch, rate limiting and QR limitations remain documented in RSVP.md/PUBLICATION.md. No payments, new APIs, custom SVG integration or production hosting are introduced.

## Refinement verification and assets

The original synthetic SVG disco pattern has been removed. app/src/assets/birthday-celebration/disco-ball.webp is the requested Regina Valetova photograph, locally cropped with the original colored reflections retained, not a runtime hotlink. The image is opaque; soft mask/blending replaces a hard rectangle. Full license, date, source and SHA-256 are in its README and THIRD-PARTY-ASSETS.md. No external envelope component or additional UI framework is used.

The integration suite includes a sixth group with WebKit 27.2: all palettes at 390×844 and 1440×900, closed/card/hero frames, double-click protection, Skip during opening, remembered reentry, pause/reset, dynamic card data, private-preview Replay and real enabled RSVP controls. Long name without age is also checked inside the card. This is Safari's engine via Playwright, not a claim of a native Safari GUI pass. Native safaridriver refused a session because Allow remote automation is disabled; no system/browser permission setting was changed.

Artifacts for this refinement are separate: app/test-results/celebration-refinement/. Before/after frames, WebKit palette matrix and a complete recorded opening are described in STATUS.md. Product API, snapshots, editable fields, post-opening layout and previous templates remain unchanged.

## Latest visual steering — 2026-11-02

The whole story/details/RSVP/closing region is now hidden until opening or Skip. Distinct palette-aware loaders for Birthday Celebration and Birthday Party use shared first-paint HTML/CSS and an asset readiness gate, with no minimum artificial delay and a 1.8s maximum fallback. The photograph retains its original colors; gentle glints and bounded scroll glitter provide additional sparkle. New effects respect pause/reduced motion and clean up listeners. At the owner’s request, final verification was limited to verify/build, PHP syntax and a short real-browser check; earlier full regression/WebKit results are historical, not claimed as rerun after these additions.


## Editable wording and stable intro — 2026-11-02

Template wording in the editor exposes 42 default-filled presentation fields through optional content.celebrationCopy. Existing drafts/snapshots resolve missing keys from contract defaults; no migration or database rewrite is needed. Empty strings intentionally remain empty. Supported plain-text placeholders are {name}, {age}, and {palette}. Event details, invitation heading and message remain in their existing fields. Account/API notices and the shared RSVP form remain system UI.

The new CSS ambient light and stationery details are original code inspired by [Codrops Ambient Canvas Backgrounds](https://tympanus.net/Development/AmbientCanvasBackgrounds/) and [Greenvelope envelope reveals](https://www.greenvelope.com/resources/animated-envelope-invitations). No third-party animation code or assets were added. Ambient motion follows the existing visibility/pause state and reduced-motion preference.

The cover and hero retain the same grid cell before, during and after opening; the cover is retained but hidden and inert after opening. This removes the previous absolute/relative switch. Stable scrollbar gutter prevents the width changing when the lower sections appear. Verification was limited to contracts, lint, TypeScript and production build at the user's request; no new browser run is claimed.
