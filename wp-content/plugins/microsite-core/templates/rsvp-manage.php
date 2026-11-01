<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="referrer" content="no-referrer">
    <title>Manage your RSVP</title>
    <?php foreach ( $entry['css'] ?? array() as $css ) : ?>
        <link rel="stylesheet" href="<?php echo esc_url( $base_url . $css ); ?>">
    <?php endforeach; ?>
</head>
<body>
    <main id="rsvp-management-root"></main>
    <noscript>Enable JavaScript to manage your response.</noscript>
    <script id="rsvp-management-config" type="application/json"><?php echo wp_json_encode( $configuration, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
    <?php if ( $entry ) : ?>
        <script type="module" src="<?php echo esc_url( $base_url . $entry['file'] ); ?>"></script>
    <?php endif; ?>
</body>
</html>
