<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style><?php readfile( __DIR__ . "/invitation-loader.css" ); ?></style>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title><?php echo esc_html( $title ); ?></title>
    <meta name="description" content="<?php echo esc_attr( $description ); ?>">
    <link rel="canonical" href="<?php echo esc_url( $url ); ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?php echo esc_attr( $title ); ?>">
    <meta property="og:description" content="<?php echo esc_attr( $description ); ?>">
    <meta property="og:url" content="<?php echo esc_url( $url ); ?>">
    <?php foreach ( $entry['css'] ?? array() as $css ) : ?>
        <link rel="stylesheet" href="<?php echo esc_url( $base_url . $css ); ?>">
    <?php endforeach; ?>
</head>
<body>
    <div id="public-root">
        <div class="invitation-loader" data-template="<?php echo esc_attr( $snapshot['templateId'] ); ?>" data-palette="<?php echo esc_attr( $snapshot['appearance']['palette'] ?? '' ); ?>" role="status">
            <span class="invitation-loader-symbol" aria-hidden="true"></span>
            <span class="invitation-loader-copy"><?php echo 'birthday-party' === $snapshot['templateId'] ? 'A good night is on its way' : 'Preparing something special'; ?></span>
            <span class="invitation-loader-line" aria-hidden="true"></span>
        </div>
    </div>
    <noscript><style>.invitation-loader { display: none; }</style>This invitation needs JavaScript to display its interactive design.</noscript>
    <script id="microsite-public" type="application/json"><?php echo wp_json_encode( $snapshot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
    <?php if ( $rsvp_config ) : ?>
        <script id="microsite-rsvp" type="application/json"><?php echo wp_json_encode( $rsvp_config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
    <?php endif; ?>
    <script type="module" src="<?php echo esc_url( $base_url . $entry['file'] ); ?>"></script>
</body>
</html>
