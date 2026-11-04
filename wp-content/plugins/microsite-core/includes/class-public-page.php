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

        if ( rtrim( (string) $path, '/' ) === rtrim( (string) wp_parse_url( home_url( '/rsvp/manage/' ), PHP_URL_PATH ), '/' ) ) {
            $this->management();
        }


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
        $entry = AssetManifest::entry( $manifest, 'src/public.tsx' );

        if ( ! $entry ) {
            status_header( 503 );
            header( 'Retry-After: 60' );
            echo 'The public page build is unavailable.';
            exit;
        }

        status_header( 200 );
        $url = $this->publication->url( $matches[1] );
        $metadata = SitePresentation::metadata( $snapshot );
        $title = $metadata['title'];
        $description = $metadata['description'];
        $rsvp_config = null;

        if ( RsvpContext::resolve( $snapshot )['enabled'] ) {
            $rsvp_config = array(
                'statusUrl' => rest_url( 'microsites/v1/public/sites/' . $matches[1] . '/rsvp' ),
                'createUrl' => rest_url( 'microsites/v1/public/sites/' . $matches[1] . '/responses' ),
                'managementUrl' => home_url( '/rsvp/manage/' ),
            );
        }

        header( 'Referrer-Policy: no-referrer' );
        $base_url = plugin_dir_url( dirname( __FILE__ ) ) . 'app/dist/';
        require dirname( __DIR__ ) . '/templates/public.php';
        exit;
    }

    private function management(): never {
        nocache_headers();
        header( 'Cache-Control: no-store, private, max-age=0' );
        header( 'Referrer-Policy: no-referrer' );
        header( 'X-Robots-Tag: noindex, nofollow, noarchive' );
        header( "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" );
        $manifest_path = dirname( __DIR__ ) . '/app/dist/.vite/manifest.json';
        $manifest = is_readable( $manifest_path ) ? json_decode( file_get_contents( $manifest_path ), true ) : array();
        $entry = AssetManifest::entry( $manifest, 'src/rsvp-manage.tsx' );
        status_header( $entry ? 200 : 503 );
        $base_url = plugin_dir_url( dirname( __FILE__ ) ) . 'app/dist/';
        $configuration = array( 'responsesUrl' => rest_url( 'microsites/v1/rsvp/responses/' ) );
        require dirname( __DIR__ ) . '/templates/rsvp-manage.php';
        exit;
    }
}
