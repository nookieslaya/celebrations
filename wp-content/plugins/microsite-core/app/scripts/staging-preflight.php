<?php
/** Read-only checks. Run outside the web root: wp eval-file <path> --user=<admin>. */
if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
    exit;
}

$failures = array();
$check = static function ( bool $passed, string $label ) use ( &$failures ): void {
    if ( $passed ) {
        WP_CLI::log( 'OK: ' . $label );
    } else {
        $failures[] = $label;
        WP_CLI::warning( $label );
    }
};

$check( PHP_VERSION_ID >= 80200, 'PHP >= 8.2' );
$check( version_compare( get_bloginfo( 'version' ), '6.6', '>=' ), 'WordPress >= 6.6' );
foreach ( array( 'mysqli', 'mbstring', 'json', 'hash', 'ctype', 'openssl' ) as $extension ) {
    $check( extension_loaded( $extension ), 'PHP extension: ' . $extension );
}
$check( 'staging' === wp_get_environment_type(), 'WP_ENVIRONMENT_TYPE is staging' );
$check( 'https' === wp_parse_url( home_url(), PHP_URL_SCHEME ), 'WordPress home uses HTTPS' );
$check( 'https' === wp_parse_url( site_url(), PHP_URL_SCHEME ), 'WordPress site URL uses HTTPS' );
$check( 0 === (int) get_option( 'users_can_register' ), 'Public registration is disabled' );
$check( 0 === (int) get_option( 'blog_public' ), 'Search-engine indexing is disabled' );
$check( '' !== (string) get_option( 'permalink_structure' ), 'Pretty permalinks are enabled' );
$check( defined( 'FORCE_SSL_ADMIN' ) && FORCE_SSL_ADMIN, 'FORCE_SSL_ADMIN is enabled' );
$check( ! defined( 'WP_DEBUG_DISPLAY' ) || ! WP_DEBUG_DISPLAY, 'PHP diagnostics are not displayed publicly' );
$check( class_exists( '\Microsite\Core\Catalog' ), 'Microsite Core is active' );
$check( wp_get_theme( 'microsite-shell' )->exists(), 'Optional shell theme is installed' );

if ( class_exists( '\Microsite\Core\Catalog' ) ) {
    $reflection = new ReflectionClass( '\Microsite\Core\Catalog' );
    $plugin = dirname( dirname( $reflection->getFileName() ) );
    $manifest_path = $plugin . '/app/dist/.vite/manifest.json';
    $manifest = is_readable( $manifest_path ) ? json_decode( file_get_contents( $manifest_path ), true ) : array();
    foreach ( array( 'src/main.tsx', 'src/public.tsx', 'src/rsvp-manage.tsx', 'src/preview-frame.tsx' ) as $entry ) {
        $asset = \Microsite\Core\AssetManifest::entry( $manifest, $entry );
        $check( $asset && is_readable( $plugin . '/app/dist/' . $asset['file'] ), 'Production entry: ' . $entry );
    }
    $check( ! is_file( $plugin . '/app/.vite-dev.json' ), 'No development-server marker is deployed' );
    $check( ! is_dir( $plugin . '/tests' ) && ! is_dir( $plugin . '/app/test-results' ), 'No test fixtures or reports are deployed' );
    $check( ! is_dir( $plugin . '/app/node_modules' ), 'No Node dependencies are deployed' );
    $check( '1' === get_option( 'microsite_rsvp_database_version' ), 'RSVP schema migration version is 1' );
    $check( '2' === get_option( 'microsite_permissions_version' ), 'Permission migration version is 2' );
    global $wpdb;
    foreach ( array( 'microsite_rsvp', 'microsite_rsvp_deleted' ) as $suffix ) {
        $table = $wpdb->prefix . $suffix;
        $status = $wpdb->get_row( $wpdb->prepare( 'SHOW TABLE STATUS WHERE Name = %s', $table ), ARRAY_A );
        $check( 'InnoDB' === ( $status['Engine'] ?? null ), 'Transactional table: ' . $suffix );
    }
    $key = 'microsite-preflight:' . substr( hash( 'sha256', DB_NAME . $wpdb->prefix ), 0, 32 );
    $locked = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $key ) );
    $check( '1' === (string) $locked, 'Database supports advisory locks' );
    if ( '1' === (string) $locked ) {
        $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $key ) );
    }
}

WP_CLI::log( 'HTTP-only checks still required: TLS, proxy is_ssl(), Secure cookies, cache bypass, public URLs, RSVP and mobile devices.' );
if ( $failures ) {
    WP_CLI::error( 'Preflight found ' . count( $failures ) . ' configuration issue(s). No settings were changed.' );
}
WP_CLI::success( 'CLI configuration checks passed. This is not an HTTPS or hosting-access-control test.' );
