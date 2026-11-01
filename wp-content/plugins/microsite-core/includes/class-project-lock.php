<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class ProjectLock {
    public static function run( int $id, callable $operation ): mixed {
        global $wpdb;
        // Database-scoped advisory locks serialize publish, withdraw and entitlement changes.
        $key = 'microsite:' . substr( hash( 'sha256', DB_NAME . ':' . $wpdb->prefix . ':' . $id ), 0, 48 );
        $acquired = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $key ) );

        if ( '1' !== (string) $acquired ) {
            return new WP_Error( 'microsite_publication_busy', 'Another publication operation is running. Try again.', array( 'status' => 409 ) );
        }

        try {
            wp_cache_delete( $id, 'post_meta' );
            return $operation();
        } finally {
            $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $key ) );
        }
    }

}
