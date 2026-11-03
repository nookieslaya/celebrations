# Third-party assets — Birthday Celebration

Reviewed 2026-11-01. All runtime files are served locally by the plugin. No runtime CDN, remote fonts, copied demo project or WebGL dependency. The refinement adds one locally stored photograph and canvas-confetti as the sole confetti engine.

| Resource | Version / source | License and usage | Runtime cost / cleanup |
| --- | --- | --- | --- |
| GSAP + ScrollTrigger | Existing pinned 3.15.0; [official docs](https://gsap.com/docs/v3/), [matchMedia/revert](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), [repository](https://github.com/greensock/GSAP) | [Standard No Charge GSAP License](https://gsap.com/community/standard-license/), not MIT. Permitted websites/app interfaces, including commercial use; restriction concerns competing visual animation builders. This renderer uses fixed authored timelines, not a visual animation builder. Preserve upstream notices. | Existing dependency, shared lazy chunk about 112.8 kB raw / 44.3 kB gzip including GSAP and ScrollTrigger. The new confetti dependency is listed below. React effects use scoped gsap.context/revert, opening timeline kill, once-only ScrollTriggers and reduced-motion bypass. |
| Cormorant Garamond regular + italic variable | 4.001; [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), [upstream](https://github.com/CatharsisFonts/Cormorant) | SIL Open Font License 1.1, commercial embedding permitted subject to OFL. Copyright 2015 the Cormorant Project Authors. License retained alongside WOFF2. | Local Latin/Latin Extended subset, 89,252 + 63,712 bytes. font-display: swap, lazy template CSS. Unicode outside subset falls back to installed serif fonts. |
| Manrope variable | 4.505; [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/manrope), [upstream](https://github.com/googlefonts/manrope) | SIL Open Font License 1.1; copyright 2018 The Manrope Project Authors. License retained alongside WOFF2. | Local Latin/Latin Extended subset, 29,656 bytes. font-display: swap; no JS/runtime font service. |
| Vector balloons, ribbons, envelope, seal, stars, grain and ambient Canvas effects | Authored for this repository in birthday-celebration/ | Original code assets; no external image/vector licensing dependency. The user's image is visual direction, not copied pixels or a runtime asset. | No extra library. Static SVG; CSS transform animation; Canvas <=20/40 ambient particles. Bursts now use the canvas-confetti profile documented below. DPR capped at 1.25/1.5, 30fps drawing ceiling. |

## Font provenance and transformations

Original Google Fonts git blob identifiers downloaded over verified HTTPS:

- CormorantGaramond[wght].ttf: `d992a83ce525c330fad3a19087746bcb2dc038ee`.
- CormorantGaramond-Italic[wght].ttf: `0d914e7663b7a1429d06ec60a5c5bb026031a2ef`.
- Manrope[wght].ttf: `75274da58537d6123b14f2cd0c355ad4681fc2b3`.
- Cormorant OFL blob: `507d70f4565352dbfcf2dfc9b42eb092b57c0be8`.
- Manrope OFL blob: `e271172a9ed0cddc895aabb6509f1c7d880b492d`.

The downloaded TTFs were subset/compressed with FontTools/Brotli in a temporary tooling environment, not added to runtime dependencies. Coverage: U+0000–024F, U+2000–206F and selected punctuation/arrows/euro; variable weights and OpenType layout preserved. Only resulting WOFF2 and original OFL notices are stored in the plugin's template fonts directory. Two custom families total; italic is the same Cormorant family. Original TTFs are not shipped.

## Motion and compatibility

GSAP is already bundled by Vite and used by the existing React application. The new component imports no account, router or API module. Context/timeline disposal handles navigation and hot refresh; Canvas removes RAF, observers and visibility listeners. `prefers-reduced-motion` disables Canvas, confetti, opening/scroll timelines and floating decorations. Pause stops ambient Canvas and CSS floating; hidden document suspends the background; hero decorations pause outside its viewport intersection. Native scrolling and forms remain usable.

The Canvas implementation is intentionally separate from the renderer and catches context failures; GSAP fallback removes transient hiding styles. No continuous full-screen fireworks or repeating confetti. Test results and concrete browser limits are in STATUS.md and BIRTHDAY-CELEBRATION.md.

## Envelope / confetti / disco refinement — 2026-11-01

| Resource | Source / license | Local use |
| --- | --- | --- |
| canvas-confetti 1.9.4 | [catdad repository](https://github.com/catdad/canvas-confetti), ISC, copyright 2020 Kiril Vatev. Original notice copied to assets/birthday-celebration/licenses/canvas-confetti-ISC.txt. Commercial use allowed under the retained ISC notice. | Pinned runtime dependency, local Vite bundle, no worker/CDN. @types/canvas-confetti 1.9.0 is development typing only. This replaces the custom rectangular burst code; the existing ambient-only Canvas remains for sparse background lights. |
| Realistic Look example | [Official demo](https://www.kirilv.com/canvas-confetti/#realistic), [source index.html](https://github.com/catdad/canvas-confetti/blob/master/index.html) under the repository's ISC license. | Five emission proportions (.25/.20/.35/.10/.10) with varied spread, velocity, decay and scalar, adapted to two lower side origins, 110ms offset, fewer mobile particles and palette-specific colors. flat:false, square shapes only, no emoji/circles/stars. Colors and wobble suggest paper/foil; no metallic rendering claim. |
| Silver disco ball photograph | Regina Valetova (@reginbegin), [Unsplash photo VawUHVxUvJ4](https://unsplash.com/photos/silver-disco-ball-VawUHVxUvJ4), published 2017-08-20. [Unsplash License](https://unsplash.com/license), downloaded 2026-11-01. | Public download, commercial use allowed; attribution appreciated but not required. Credit retained here and the asset README. Focal crop around the sphere, original colored reflections retained, 640×640 WebP, quality 82, 148,840 bytes. No runtime remote URL. |
| Layered envelope | Original React/CSS + existing GSAP authored in this repository. | Separate shadow/back/card/pocket/flap/seal, no third-party envelope component, UI framework or raster envelope. Existing GSAP license above applies to choreography. |

Photograph download endpoint: https://images.unsplash.com/photo-1503218751919-1ea90572e609?fit=crop&crop=focalpoint&fp-x=0.557&fp-y=0.455&fp-z=1.65&w=640&h=640&fm=webp&q=82 . The original 1600px photograph and the optimized 640px file were both viewed. It is an opaque photograph, not an alpha PNG and not a checkerboard transparency thumbnail. Soft CSS mask/blending hides the rectangular source boundary. SHA-256: 05dfd0811e2a9d64a7266d53b510a24ede102bb53809c236617f38716a9e45a9.

The supplied [Rawpixel alternative](https://www.rawpixel.com/image/6329584/png-sticker-public-domain) and its [Openclipart source by Merlin2525](https://openclipart.org/detail/173769/disco-ball-remix) were reviewed but not integrated. No login restriction was bypassed and no transparency claim is made for an undownloaded alternative.

The earlier original SVG disco sphere and bespoke burst implementation are replaced in Birthday Celebration. Font licenses and the original balloons/ribbons/stars remain unchanged. There is one confetti renderer; ambient Canvas does not emit confetti. Pause/hidden/reset/unmount clear delayed emissions and reset the in-flight library burst. The library does not promise pause/resume of the same particles; Resume restarts continuous decorations only. All new asset/code loading remains template-lazy.

Color revision downloaded 2026-11-02: the latest file retains the original photograph’s colored reflections. Palette-colored CSS glints and scroll glitter are presentation effects; it is no longer the earlier grayscale asset.

## Wedding Modern Editorial — 2026-11-03

Six font families downloaded from the official Google Fonts repository, with original licenses checked: [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), [Libre Baskerville](https://github.com/google/fonts/tree/main/ofl/librebaskerville), [Source Sans 3](https://github.com/google/fonts/tree/main/ofl/sourcesans3), [Playfair Display](https://github.com/google/fonts/tree/main/ofl/playfairdisplay), [Inter](https://github.com/google/fonts/tree/main/ofl/inter). Each is SIL OFL 1.1; original copyright/notices are stored in wedding-modern-editorial/fonts/*-OFL.txt. In particular, the Reserved Font Names for Libre Baskerville, Source and Playfair Display are preserved in the notices; modified font primary names use Microsite ME aliases.

Only local WOFF2 subsets are included: serif 400, sans variable 400–600, Latin/Latin Extended including Polish, with other variable axes frozen. There are six files, 266,880 bytes total. No runtime Google Fonts requests, no preload of all families. Pair IDs are unchanged from W1. Details, pinned source commit/blob/version/SHA and processing: app/src/renderers/wedding-modern-editorial/fonts/provenance.json and README.md. Retain the notices in future release archives. No new photo assets, stock wedding imagery, icons library, animation library or external gallery code were added; photos come from the authorized user library. The simple arrow and FAQ marker are authored SVG/CSS.

This is source/license documentation, not visual or runtime verification. The wedding assets and existing birthday assets are scoped to their own template families; no existing font file was replaced.
