<?php

/** Run only through: wp --user=<existing-user> eval-file <this-file>. */
if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
    exit;
}

if ( ! current_user_can( 'create_ms_sites' ) ) {
    WP_CLI::error( 'Select an existing authorized user with --user.' );
}

$existing = get_posts(
    array(
        'post_type'      => 'ms_site',
        'post_status'    => 'draft',
        'author'         => get_current_user_id(),
        'meta_key'       => '_microsite_demo',
        'meta_value'     => 'birthday-party-v1',
        'posts_per_page' => 1,
    )
);

if ( $existing ) {
    WP_CLI::success( home_url( '/app/sites/' . $existing[0]->ID . '/preview' ) );
    return;
}

$catalog = new Microsite\Core\Catalog();
$type = $catalog->type( 'birthday-invitation' );
$draft = $type['defaults'];
$event_time = new DateTimeImmutable( '+4 weeks next Saturday 19:30', new DateTimeZone( 'Europe/London' ) );
$draft['content'] = array_merge(
    $draft['content'],
    array(
        'celebrantName'  => 'Alex Morgan',
        'age'            => 30,
        'heading'        => 'A little older. A lot to celebrate.',
        'message'        => 'Good music, big laughs and all my favourite people. Join me for a night worth remembering.',
        'event'          => array(
            'localDateTime' => $event_time->format( 'Y-m-d\TH:i' ),
            'timeZone'      => 'Europe/London',
            'startsAt'      => '',
        ),
        'venueName'      => 'The Loft',
        'address'        => 'London, United Kingdom',
        'dressCode'      => 'A little colour. A little sparkle.',
        'additionalInfo' => 'This is a sample invitation. The details are here to help you explore the design.',
    )
);

$service = new Microsite\Core\SiteService(
    new Microsite\Core\SiteRepository(),
    new Microsite\Core\SiteValidator( $catalog ),
    new Microsite\Core\Permissions()
);
$site = $service->create(
    array(
        'name'       => 'Demo · Birthday party',
        'siteType'   => 'birthday-invitation',
        'templateId' => 'birthday-party',
        'draft'      => $draft,
    )
);

if ( is_wp_error( $site ) ) {
    WP_CLI::error( $site->get_error_message() );
}

add_post_meta( $site['id'], '_microsite_demo', 'birthday-party-v1', true );
WP_CLI::success( home_url( '/app/sites/' . $site['id'] . '/preview' ) );
