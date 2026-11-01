<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class PreviewAccess {
    public function __construct( private SiteService $service ) {
    }

    public function check(): void {
        $path = wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ?? '' ), PHP_URL_PATH );
        $base = wp_parse_url( home_url( '/app/' ), PHP_URL_PATH );
        $pattern = '#^' . preg_quote( $base, '#' ) . 'sites/([1-9][0-9]*)/preview/?$#';

        if ( ! is_string( $path ) || ! preg_match( $pattern, $path, $matches ) ) {
            return;
        }

        nocache_headers();
        header( 'X-Robots-Tag: noindex, nofollow', true );

        if ( ! is_user_logged_in() ) {
            wp_safe_redirect( add_query_arg( 'next', $path, home_url( '/app/login' ) ) );
            exit;
        }

        $record = $this->service->read( (int) $matches[1] );

        if ( is_wp_error( $record ) ) {
            add_filter( 'microsite_app_status', static function (): int {
                return 404;
            } );
        }
    }
}
