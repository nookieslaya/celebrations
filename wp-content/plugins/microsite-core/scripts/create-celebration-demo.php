<?php

/** Run with LocalWP Open site shell: wp eval-file <this-file> --user=<administrator>. */
if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
    exit;
}

if ( 'local' !== wp_get_environment_type() && ! defined( 'MICROSITE_INTEGRATION_TEST' ) ) {
    WP_CLI::error( 'This demo is restricted to the local or isolated test environment.' );
}

if ( ! current_user_can( 'manage_ms_sites' ) ) {
    WP_CLI::error( 'Select a microsite administrator with --user.' );
}

$existing = get_posts( array(
    'post_type' => 'ms_site',
    'post_status' => 'draft',
    'author' => get_current_user_id(),
    'meta_key' => '_microsite_demo',
    'meta_value' => 'birthday-celebration-v1',
    'posts_per_page' => 1,
) );

if ( $existing ) {
    WP_CLI::success( home_url( '/app/sites/' . $existing[0]->ID . '/preview' ) );
    return;
}

$catalog = new Microsite\Core\Catalog();
$repository = new Microsite\Core\SiteRepository();
$validator = new Microsite\Core\SiteValidator( $catalog );
$permissions = new Microsite\Core\Permissions();
$service = new Microsite\Core\SiteService( $repository, $validator, $permissions );
$draft = $catalog->type( 'birthday-invitation' )['defaults'];
$draft['appearance']['palette'] = 'midnight-gold';
$draft['content'] = array_merge( $draft['content'], array(
    'celebrantName' => 'Alex',
    'age' => 50,
    'heading' => 'A night worth celebrating.',
    'message' => 'Fifty years of little adventures, extraordinary people, and memories worth keeping. Now, the best part: bringing my favourite people together. Join me for a beautiful evening of dinner, dancing, and one more story we will tell for years.',
    'event' => array( 'localDateTime' => '2027-07-17T19:00', 'timeZone' => 'Europe/London', 'startsAt' => '' ),
    'venueName' => 'The Glasshouse',
    'address' => '21 Bloomsbury Square\nLondon, WC1A 2NS',
    'dressCode' => 'Evening elegance. A little sparkle is always welcome.',
    'additionalInfo' => 'Dinner at seven. Dancing until late. Your company is the only gift I need.',
    'rsvp' => array( 'enabled' => true, 'maxPartySize' => 5, 'deadlineLocal' => '2027-07-10T19:00', 'deadlineAt' => '' ),
) );
$draft['content']['address'] = "21 Bloomsbury Square\nLondon, WC1A 2NS";
$site = $service->create( array( 'name' => 'Alex’s 50th Birthday · Celebration demo', 'siteType' => 'birthday-invitation', 'templateId' => 'birthday-celebration', 'draft' => $draft ) );

if ( is_wp_error( $site ) ) {
    WP_CLI::error( $site->get_error_message() );
}

add_post_meta( $site['id'], '_microsite_demo', 'birthday-celebration-v1', true );
$publication = new Microsite\Core\Publication( $repository, $validator, $permissions );
$right = $publication->set_entitlement( $site['id'], true );

if ( is_wp_error( $right ) ) {
    WP_CLI::error( $right->get_error_message() );
}

$published = $publication->publish( $site['id'] );

if ( is_wp_error( $published ) ) {
    WP_CLI::error( $published->get_error_message() );
}

WP_CLI::success( home_url( '/app/sites/' . $site['id'] . '/preview' ) );
WP_CLI::success( $published['publication']['publicUrl'] );
