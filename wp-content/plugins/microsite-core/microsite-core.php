<?php
/**
 * Plugin Name: Microsite Core
 * Description: Theme-independent application shell for microsites.
 * Version: 0.2.0
 * Requires PHP: 8.2
 * Requires at least: 6.6
 * Text Domain: microsite-core
 */
namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once __DIR__ . '/includes/class-app.php';
App::boot();
register_activation_hook( __FILE__, array( App::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( App::class, 'deactivate' ) );

require_once __DIR__ . '/includes/class-catalog.php';
require_once __DIR__ . '/includes/class-site-type.php';
require_once __DIR__ . '/includes/class-permissions.php';
require_once __DIR__ . '/includes/class-site-validator.php';
require_once __DIR__ . '/includes/class-site-repository.php';
require_once __DIR__ . '/includes/class-site-service.php';
require_once __DIR__ . '/includes/class-sites-controller.php';

add_action( 'init', array( SiteType::class, 'register' ) );
add_action( 'init', array( Permissions::class, 'install' ), 5 );

function boot_backend(): void {
    $catalog = new Catalog();
    $permissions = new Permissions();
    $repository = new SiteRepository();
    $validator = new SiteValidator( $catalog );
    $service = new SiteService( $repository, $validator, $permissions );
    $controller = new SitesController( $catalog, $service, $permissions );

    add_action( 'rest_api_init', array( $controller, 'register_routes' ) );
    add_filter( 'rest_post_dispatch', array( $controller, 'private_headers' ), 10, 3 );
}

boot_backend();
