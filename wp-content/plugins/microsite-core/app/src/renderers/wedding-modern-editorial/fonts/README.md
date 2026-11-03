# Modern Editorial: local font assets

Prepared 2026-11-03 from the official [google/fonts repository](https://github.com/google/fonts), pinned commit and original source hashes in provenance.json. Each family was checked against its upstream OFL notice. All six source families use SIL Open Font License 1.1. Unmodified notices are kept next to the WOFF2 files; retain them when distributing the template.

| Source family | Official family directory | Local file / primary family |
| --- | --- | --- |
| Cormorant Garamond | https://github.com/google/fonts/tree/main/ofl/cormorantgaramond | serif-one.woff2 / Microsite ME Serif One |
| Manrope | https://github.com/google/fonts/tree/main/ofl/manrope | sans-one.woff2 / Microsite ME Sans One |
| Libre Baskerville | https://github.com/google/fonts/tree/main/ofl/librebaskerville | serif-two.woff2 / Microsite ME Serif Two |
| Source Sans 3 | https://github.com/google/fonts/tree/main/ofl/sourcesans3 | sans-two.woff2 / Microsite ME Sans Two |
| Playfair Display | https://github.com/google/fonts/tree/main/ofl/playfairdisplay | serif-three.woff2 / Microsite ME Serif Three |
| Inter | https://github.com/google/fonts/tree/main/ofl/inter | sans-three.woff2 / Microsite ME Sans Three |

Preparation used FontTools 4.60.1 with Brotli in a temporary environment (not an application dependency). Sources were subset to U+0000–024F, U+2000–206F, U+20AC/U+2122/U+2192/U+2212, retaining layout features and copyright/license names. Serif weights were instantiated at 400; sans weight ranges reduced to 400–600; remaining axes were frozen at source defaults. The modified fonts' primary family/full/PostScript names use Microsite ME aliases, avoiding the Reserved Font Names in upstream notices. No italic or other unused weight files are shipped. Source families above are attribution, not an endorsement of the modified subset.

Six files total 266,880 bytes. Existing identifiers map to the requested source pairs: editorial-serif = Cormorant/Manrope; modern-romantic = Libre Baskerville/Source Sans 3; timeless-classic = Playfair Display/Inter. fonts.css uses font-display:swap; only the selected pair is referenced by the style. There are no Google runtime requests or preload-all rules.

This records source acquisition/preparation, not browser or runtime verification. Future release packaging must retain these notices and provenance alongside the compiled template assets; no W3 production package or build was produced.
