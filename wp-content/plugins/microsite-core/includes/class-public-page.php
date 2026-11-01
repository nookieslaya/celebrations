<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class PublicPage {
    public function __construct( private Publication $publication ) {
    }

    public function render(): void {
        $path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH );
        $base = wp_parse_url( home_url( '/s/' ), PHP_URL_PATH );

        if ( ! is_string( $path ) || ! preg_match( '#^' . preg_quote( $base, '#' ) . '([^/]+)/?$#', $path, $matches ) ) {
            return;
        }

        nocache_headers();
        header( 'Cache-Control: no-store, max-age=0, must-revalidate' );
        header( 'X-Robots-Tag: noindex, nofollow, noarchive' );
        header( 'X-Content-Type-Options: nosniff' );
        $snapshot = preg_match( '/^[a-f0-9]{32}$/', $matches[1] ) ? $this->publication->public_snapshot( $matches[1] ) : null;

        if ( ! $snapshot ) {
            status_header( 404 );
            echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Page unavailable</title><h1>Page unavailable</h1></html>';
            exit;
        }

        // Public documents always use the production entry, independently of Vite.
        $manifest_path = dirname( __DIR__ ) . '/app/dist/.vite/manifest.json';
        $manifest = is_readable( $manifest_path ) ? json_decode( file_get_contents( $manifest_path ), true ) : array();
        $entry = $manifest['src/public.tsx'] ?? null;

        if ( ! $entry ) {
            status_header( 503 );
            header( 'Retry-After: 60' );
            echo 'The public page build is unavailable.';
            exit;
        }

        status_header( 200 );
        $url = $this->publication->url( $matches[1] );
        $content = $snapshot['content'];
        $title = $content['heading'];
        $description = $content['message'] ?? $content['description'] ?? '';
        $base_url = plugin_dir_url( dirname( __FILE__ ) ) . 'app/dist/';
        require dirname( __DIR__ ) . '/templates/public.php';
        exit;
    }
}
