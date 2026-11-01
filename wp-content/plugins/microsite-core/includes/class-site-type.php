<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SiteType {
    public static function register(): void {
        register_post_type(
            'ms_site',
            array(
                'label'               => 'Microsites',
                'public'              => false,
                'publicly_queryable'  => false,
                'exclude_from_search' => true,
                'show_ui'             => false,
                'show_in_rest'        => false,
                'show_in_nav_menus'   => false,
                'has_archive'         => false,
                'rewrite'             => false,
                'query_var'           => false,
                'can_export'          => false,
                'supports'            => array( 'title', 'author' ),
                'capability_type'     => array( 'ms_site', 'ms_sites' ),
                'map_meta_cap'        => true,
                'capabilities'        => array(
                    'create_posts' => 'create_ms_sites',
                ),
            )
        );
    }
}
