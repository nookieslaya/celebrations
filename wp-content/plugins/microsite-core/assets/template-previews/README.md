# Renderer thumbnails

These local PNGs show the existing renderers with the Catalog's fictional demo data and reduced motion at 390×640. Each registered palette has its own image. No client content or newly generated mockup assets are used. Gallery cards load images rather than renderer instances.

Regenerate from LocalWP Open site shell in the plugin app directory:

```sh
npm run verify
UPDATE_TEMPLATE_THUMBNAILS=1 TEST_SCOPE=gallery npm run test:integration
```

The test runner uses the one established, isolated test database, never the LocalWP site's database. Inspect the resulting files before committing. Regular test runs leave these source assets alone and save review frames under ignored app/test-results/gallery instead.

Birthday Celebration includes the already licensed local disco-ball photograph and fonts; their notices and source information remain in docs/THIRD-PARTY-ASSETS.md. Other visuals come from the existing renderer code. Refer to docs/GALLERY-WIZARD.md for Catalog metadata and editor step definitions.
