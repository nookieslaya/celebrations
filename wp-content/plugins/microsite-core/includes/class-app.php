<?php
namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class App {
    public static function boot(): void {
        add_action( 'init', array( self::class, 'rewrites' ) );
        add_filter( 'query_vars', static function ( array $vars ): array {
            $vars[] = 'microsite_app';
            return $vars;
        } );
        add_action( 'template_redirect', array( self::class, 'render' ), 0 );
    }
    public static function rewrites(): void {
        add_rewrite_rule( '^app(?:/.*)?/?$', 'index.php?microsite_app=1', 'top' );
    }
    public static function activate(): void {
        self::rewrites();
        flush_rewrite_rules( false );
    }
    public static function deactivate(): void {
        global $wp_rewrite;
        unset( $wp_rewrite->extra_rules_top['^app(?:/.*)?/?$'] );
        flush_rewrite_rules( false );
    }
    public static function render(): void {
        if ( ! get_query_var( 'microsite_app' ) ) {
            return;
        }
        status_header( (int) apply_filters( 'microsite_app_status', 200 ) );
        nocache_headers();
        header( 'X-Robots-Tag: noindex, nofollow', true );
        $is_preview_frame = rtrim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' )
            === rtrim( (string) wp_parse_url( home_url( '/app/preview-frame/' ), PHP_URL_PATH ), '/' );

        if ( $is_preview_frame && ( ! is_user_logged_in() || ! current_user_can( 'edit_ms_sites' ) ) ) {
            status_header( 403 );
            header( 'Cache-Control: no-store, private, max-age=0' );
            echo '<!doctype html><html lang="en"><meta charset="utf-8"><title>Preview unavailable</title><p>Sign in to view this preview.</p></html>';
            exit;
        }

        $base = plugin_dir_url( dirname( __FILE__ ) ) . 'app/';
        $dev = null;
        $marker = dirname( __DIR__ ) . '/app/.vite-dev.json';
        if ( 'local' === wp_get_environment_type() && is_readable( $marker ) ) {
            $candidate = json_decode( file_get_contents( $marker ), true );
            if ( isset( $candidate['origin'] ) && preg_match( '#^https?://(localhost|127\.0\.0\.1):[0-9]+$#', $candidate['origin'] ) ) {
                $dev = $candidate['origin'];
            }
        }
        $manifest_path = dirname( __DIR__ ) . '/app/dist/.vite/manifest.json';
        $manifest = is_readable( $manifest_path ) ? json_decode( file_get_contents( $manifest_path ), true ) : array();
        $entry = AssetManifest::entry( $manifest, $is_preview_frame ? 'src/preview-frame.tsx' : 'src/main.tsx' );
        if ( ! $dev && ! $entry ) {
            status_header( 503 );
        }
        header( 'Cache-Control: no-store, private, max-age=0' );
        header( 'Vary: Cookie' );
        header( 'X-Frame-Options: SAMEORIGIN' );

        if ( $is_preview_frame ) {
            $development_sources = $dev ? ' ' . $dev : '';
            $connections = $dev ? $dev . ' ' . preg_replace( '#^http#', 'ws', $dev ) : "'none'";
            $scripts = $dev ? "'self' 'unsafe-inline' " . $dev : "'self'";
            header( "Content-Security-Policy: default-src 'self'; script-src " . $scripts
                . "; style-src 'self' 'unsafe-inline'" . $development_sources
                . "; img-src 'self' data:" . $development_sources
                . "; font-src 'self'" . $development_sources
                . '; connect-src ' . $connections
                . "; frame-ancestors 'self'; form-action 'none'; base-uri 'none'; object-src 'none'" );
            header( 'Referrer-Policy: no-referrer' );
            require dirname( __DIR__ ) . '/templates/preview-frame.php';
            exit;
        }

        $config = array(
            'appUrl'  => home_url( '/app/' ),
            'restUrl' => rest_url(),
            'mode'    => $dev ? 'development' : 'production',
            'session' => AuthService::session(),
            'authCsrfToken' => AuthCsrf::bootstrap_token(),
        );
        require dirname( __DIR__ ) . '/templates/app.php';
        exit;
    }
}
