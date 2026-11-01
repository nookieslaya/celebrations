<?php

// Used only by PHP's development server in the isolated integration installation.
if (
    'cli-server' !== PHP_SAPI
    || ! is_file( __DIR__ . '/.microsite-test-owner' )
) {
    http_response_code( 404 );
    exit;
}
$request_path = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
$local_file = __DIR__ . $request_path;

if ( '/' !== $request_path && ( is_file( $local_file ) || is_dir( $local_file ) ) ) {
    return false;
}

require __DIR__ . '/index.php';
