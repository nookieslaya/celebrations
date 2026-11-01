<?php
/**
 * Plugin Name: Microsite Core
 * Description: Theme-independent application shell for microsites.
 * Version: 0.1.0
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
