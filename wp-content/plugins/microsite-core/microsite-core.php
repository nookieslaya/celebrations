<?php
/**
 * Plugin Name: Microsite Core
 * Description: Theme-independent application shell for microsites.
 * Version: 0.7.1
 * Requires PHP: 8.2
 * Requires at least: 6.6
 * Text Domain: microsite-core
 */
namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once __DIR__ . '/includes/class-asset-manifest.php';
require_once __DIR__ . '/includes/class-app.php';
App::boot();
register_activation_hook( __FILE__, array( App::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( App::class, 'deactivate' ) );

require_once __DIR__ . '/includes/class-event-date.php';
require_once __DIR__ . '/includes/class-rsvp-config.php';
require_once __DIR__ . '/includes/class-rsvp-context.php';
require_once __DIR__ . '/includes/class-wedding-readiness.php';
require_once __DIR__ . '/includes/class-site-presentation.php';
require_once __DIR__ . '/includes/class-project-lock.php';
require_once __DIR__ . '/includes/class-rsvp-database.php';
require_once __DIR__ . '/includes/class-rsvp-service.php';
require_once __DIR__ . '/includes/class-rsvp-controller.php';
require_once __DIR__ . '/includes/class-preview-access.php';
require_once __DIR__ . '/includes/class-wedding-config.php';
require_once __DIR__ . '/includes/class-wedding-sections.php';
require_once __DIR__ . '/includes/class-catalog.php';
require_once __DIR__ . '/includes/class-wedding-presets.php';
require_once __DIR__ . '/includes/class-wedding-demo.php';
require_once __DIR__ . '/includes/class-wedding-controller.php';
require_once __DIR__ . '/includes/class-wedding-example.php';
require_once __DIR__ . '/includes/class-site-type.php';
require_once __DIR__ . '/includes/class-permissions.php';
require_once __DIR__ . '/includes/class-site-validator.php';
require_once __DIR__ . '/includes/class-site-repository.php';
require_once __DIR__ . '/includes/class-media-service.php';
require_once __DIR__ . '/includes/class-media-controller.php';
require_once __DIR__ . '/includes/class-site-service.php';
require_once __DIR__ . '/includes/class-publication.php';
require_once __DIR__ . '/includes/class-publication-controller.php';
require_once __DIR__ . '/includes/class-public-page.php';
require_once __DIR__ . '/includes/class-sites-controller.php';

require_once __DIR__ . '/includes/class-auth-csrf.php';
require_once __DIR__ . '/includes/class-auth-rate-limit.php';
require_once __DIR__ . '/includes/class-auth-service.php';
require_once __DIR__ . '/includes/class-auth-controller.php';

add_action( 'admin_init', array( AuthController::class, 'restrict_administration' ) );
add_filter( 'show_admin_bar', array( AuthController::class, 'hide_customer_admin_bar' ) );
add_filter( 'login_redirect', array( AuthController::class, 'login_redirect' ), 10, 3 );

add_action( 'init', array( SiteType::class, 'register' ) );
add_action( 'init', array( RsvpDatabase::class, 'install' ), 6 );
add_action( 'microsite_rsvp_cleanup', array( RsvpDatabase::class, 'cleanup' ) );
add_action( 'init', static function (): void {
    if ( ! wp_next_scheduled( 'microsite_rsvp_cleanup' ) ) {
        wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'microsite_rsvp_cleanup' );
    }
} );
add_action( 'before_delete_post', array( RsvpDatabase::class, 'delete_project' ) );
add_action( 'init', array( Permissions::class, 'install' ), 5 );

function boot_backend(): void {
    $catalog = new Catalog();
    $permissions = new Permissions();
    $repository = new SiteRepository();
    $validator = new SiteValidator( $catalog );
    $service = new SiteService( $repository, $validator, $permissions );
    add_action( 'rest_api_init', array( new WeddingController( $catalog, $validator ), 'register_routes' ) );
    $controller = new SitesController( $catalog, $service, $permissions );
    add_action( 'rest_api_init', array( new MediaController(), 'register_routes' ) );
    add_filter( 'rest_attachment_query', array( MediaService::class, 'exclude_from_core_rest' ) );
    add_filter( 'rest_pre_dispatch', array( MediaService::class, 'guard_core_rest' ), 10, 3 );
    $publication = new Publication( $repository, $validator, $permissions );
    $rsvp = new RsvpService( $publication, $catalog, $repository, $permissions );
    $rsvp_controller = new RsvpController( $rsvp, $permissions );
    add_action( 'rest_api_init', array( $rsvp_controller, 'register_routes' ) );
    add_filter( 'rest_pre_serve_request', array( $rsvp_controller, 'restrict_cors' ), 5, 3 );
    add_filter( 'rest_request_before_callbacks', array( $rsvp_controller, 'limit_request' ), 10, 3 );
    $publication_controller = new PublicationController( $publication, $permissions );
    add_action( 'rest_api_init', array( $publication_controller, 'register_routes' ) );
    add_action( 'template_redirect', array( new PublicPage( $publication ), 'render' ), -2 );

    if ( defined( 'WP_CLI' ) && WP_CLI ) {
        \WP_CLI::add_command( 'microsite wedding-example', array( new WeddingExample( $service ), 'run' ) );
        \WP_CLI::add_command( 'microsite publication-right', function ( array $args ) use ( $publication ): void {
            if ( count( $args ) !== 2 || ! ctype_digit( $args[0] ) || ! in_array( $args[1], array( 'grant', 'revoke' ), true ) ) {
                \WP_CLI::error( 'Usage: wp microsite publication-right <project-id> grant|revoke --user=<administrator>' );
            }

            $result = $publication->set_entitlement( (int) $args[0], 'grant' === $args[1] );

            if ( is_wp_error( $result ) ) {
                \WP_CLI::error( $result->get_error_message() );
            }

            \WP_CLI::success( 'Project publication right updated.' );
        } );
    }

    add_action( 'template_redirect', array( new PreviewAccess( $service ), 'check' ), -1 );

    $auth_controller = new AuthController( new AuthService(), new AuthRateLimit(), $permissions );

    add_action( 'rest_api_init', array( $auth_controller, 'register_routes' ) );
    add_action( 'rest_api_init', array( $controller, 'register_routes' ) );
    add_filter( 'rest_post_dispatch', array( $controller, 'private_headers' ), 10, 3 );
}

boot_backend();
