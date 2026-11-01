<?php

/** This MU plugin is copied ONLY to the temporary integration installation. */
if (
    ! defined( 'MICROSITE_INTEGRATION_TEST' )
    || true !== MICROSITE_INTEGRATION_TEST
    || ! defined( 'DB_NAME' )
    || ! str_starts_with( DB_NAME, 'microsite_test_' )
) {
    exit;
}

add_action(
    'wp_ajax_microsite_test_nonce',
    static function (): void {
        // wp_ajax_ already requires a real, authenticated WordPress cookie.
        nocache_headers();
        wp_send_json_success( array( 'nonce' => wp_create_nonce( 'wp_rest' ) ) );
    }
);
