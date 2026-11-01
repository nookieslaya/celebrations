<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class AuthRateLimit {
    private const WINDOW = 900;

    public function consume( string $operation ): true|WP_Error {
        global $wpdb;

        // Trust the direct peer only, never a client-supplied X-Forwarded-For.
        $address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $window = (int) floor( time() / self::WINDOW );
        $key = 'microsite_attempt_' . wp_hash( $operation . '|' . $address . '|' . $window, 'auth' );
        $option_name = '_transient_' . $key;
        $expires = ( $window + 1 ) * self::WINDOW;
        $maximum = 'login' === $operation ? 10 : 5;

        // Atomic initialization and increment avoid lost counts in parallel requests.
        // WordPress's expired-transient cleanup removes the bounded-window rows.
        add_option( '_transient_timeout_' . $key, $expires, '', false );
        add_option( $option_name, 0, '', false );

        $updated = $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->options} SET option_value = CAST(option_value AS UNSIGNED) + 1 WHERE option_name = %s",
                $option_name
            )
        );

        if ( false === $updated ) {
            return new WP_Error(
                'microsite_auth_unavailable',
                'Account services are temporarily unavailable.',
                array( 'status' => 503 )
            );
        }

        $attempts = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s",
                $option_name
            )
        );

        if ( $attempts > $maximum ) {
            return new WP_Error(
                'microsite_rate_limited',
                'Too many attempts. Please try again later.',
                array( 'status' => 429, 'retryAfter' => max( 1, $expires - time() ) )
            );
        }

        return true;
    }
}
