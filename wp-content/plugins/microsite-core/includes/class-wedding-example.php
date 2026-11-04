<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingExample {
    private const MARKER = 'modern-editorial-olivia-james-v1';

    public function __construct( private SiteService $service ) {
    }

    /**
     * Prepare the explicitly requested fictional example, without touching other projects.
     *
     * ## OPTIONS
     *
     * [--force]
     * : Explicitly replace the marked example's draft, including later manual edits.
     */
    public function run( array $arguments, array $options ): void {
        if ( ! current_user_can( 'manage_options' ) || ! current_user_can( 'create_ms_sites' ) || ! in_array( 'administrator', wp_get_current_user()->roles, true ) ) {
            \WP_CLI::error( 'Run with --user=<existing-administrator>.' );
        }
        global $wpdb;
        $key = 'microsite-wedding-example:' . substr( hash( 'sha256', DB_NAME . ':' . $wpdb->prefix ), 0, 32 );
        if ( '1' !== (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $key ) ) ) {
            \WP_CLI::error( 'Example preparation is already running.' );
        }
        try {
            $result = $this->prepare( isset( $options['force'] ) );
        } finally {
            $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $key ) );
        }
        if ( is_wp_error( $result ) ) {
            \WP_CLI::error( $result->get_error_message() );
        }
        \WP_CLI::success( $result['existing'] ? 'Example already exists; no content was overwritten.' : 'Wedding example prepared as a private development draft.' );
        \WP_CLI::line( 'Project ID: ' . $result['id'] );
        \WP_CLI::line( 'Editor: ' . home_url( '/app/sites/' . $result['id'] ) );
        \WP_CLI::line( 'Private preview: ' . home_url( '/app/sites/' . $result['id'] . '/preview' ) );
        if ( ! get_post_meta( $result['id'], '_microsite_example_complete', true ) ) {
            \WP_CLI::warning( 'This marked example is incomplete. Use --force only if you intend to replace its draft.' );
        }
    }

    private function prepare( bool $force ): array|WP_Error {
        $existing = get_posts( array(
            'post_type' => 'ms_site', 'post_status' => array_keys( get_post_stati() ),
            'meta_key' => '_microsite_example_key', 'meta_value' => self::MARKER,
            'fields' => 'ids', 'posts_per_page' => 2,
        ) );
        if ( count( $existing ) > 1 ) {
            return new WP_Error( 'microsite_example_duplicate', 'Multiple marked examples exist; resolve them manually before continuing.' );
        }
        if ( $existing ) {
            $id = (int) $existing[0];
            $post = ( new SiteRepository() )->find( $id );
            if ( ! $post ) {
                return new WP_Error( 'microsite_example_unavailable', 'The marked example is not an active draft. Restore it instead of creating another copy.' );
            }
            if ( ! $force ) {
                return array( 'id' => $id, 'existing' => true );
            }
            if ( (int) $post->post_author !== get_current_user_id() ) {
                return new WP_Error( 'microsite_example_owner', 'Run --force as the original example owner; ownership is never changed automatically.' );
            }
        } else {
            $project = $this->service->create( array(
                'name' => 'Modern Editorial — Olivia & James',
                'siteType' => 'wedding', 'templateId' => 'modern-editorial', 'presetId' => 'modern-editorial',
            ) );
            if ( is_wp_error( $project ) ) {
                return $project;
            }
            $id = $project['id'];
            update_post_meta( $id, '_microsite_example_key', self::MARKER );
            if ( self::MARKER !== get_post_meta( $id, '_microsite_example_key', true ) ) {
                return new WP_Error( 'microsite_example_marker', 'Project ' . $id . ' was created but its marker could not be saved. Do not rerun before repairing that marker.' );
            }
        }
        $identifiers = array();
        foreach ( array_keys( WeddingDemo::ASSETS ) as $key ) {
            $asset = MediaService::import_sample( $key, get_current_user_id() );
            if ( is_wp_error( $asset ) ) {
                return $asset;
            }
            $identifiers[ $key ] = $asset['id'];
        }
        $project = $this->service->update( $id, array(
            'name' => 'Modern Editorial — Olivia & James',
            'draft' => WeddingDemo::draft( $identifiers, true ),
        ) );
        if ( is_wp_error( $project ) ) {
            return $project;
        }
        update_post_meta( $id, '_microsite_example_complete', '1' );
        return array( 'id' => $id, 'existing' => false );
    }
}
