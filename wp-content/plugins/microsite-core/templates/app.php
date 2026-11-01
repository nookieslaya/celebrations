<?php
/** Application document, deliberately independent of the theme. */
defined( 'ABSPATH' ) || exit;
?>
<!doctype html>
<html lang="<?php echo esc_attr( get_bloginfo( 'language' ) ); ?>">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Microsites · Workspace</title>
<?php if ( ! $dev && $entry ) : ?>
 <?php foreach ( $entry['css'] ?? array() as $css ) : ?>
 <link rel="stylesheet" href="<?php echo esc_url( $base . 'dist/' . $css ); ?>">
 <?php endforeach; ?>
<?php endif; ?>
</head>
<body>
<div id="root"><?php if ( ! $dev && ! $entry ) : ?><p>Application assets are missing. Run npm ci and npm run build in the plugin app directory.</p><?php endif; ?></div>
<noscript>This workspace requires JavaScript.</noscript>
<script id="microsite-config" type="application/json"><?php echo wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
<?php if ( $dev ) : ?>
<script type="module">
import RefreshRuntime from <?php echo wp_json_encode( $dev . '/@react-refresh' ); ?>;
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>
<script type="module" src="<?php echo esc_url( $dev . '/@vite/client' ); ?>"></script>
<script type="module" src="<?php echo esc_url( $dev . '/src/main.tsx' ); ?>"></script>
<?php elseif ( $entry ) : ?>
<script type="module" src="<?php echo esc_url( $base . 'dist/' . $entry['file'] ); ?>"></script>
<?php endif; ?>
</body>
</html>
