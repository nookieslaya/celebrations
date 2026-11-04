<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingController {
    public function __construct( private Catalog $catalog, private SiteValidator $validator ) {
    }

    public function permission( WP_REST_Request $request ): true|WP_Error {
        $allowed = ( new Permissions() )->require_capability( 'manage_options' );
        if ( is_wp_error( $allowed ) ) {
            return $allowed;
        }
        if ( ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
            return new WP_Error( 'microsite_nonce_required', 'A current REST nonce is required.', array( 'status' => 403 ) );
        }
        return true;
    }

    public function register_routes(): void {
        register_rest_route( 'microsites/v1', '/development/wedding', array(
            'methods' => 'GET',
            'permission_callback' => array( $this, 'permission' ),
            'callback' => array( $this, 'development' ),
        ) );
        register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/media/resolve', array(
            'methods' => 'POST',
            'permission_callback' => array( $this, 'permission' ),
            'callback' => array( $this, 'resolve' ),
        ) );
    }

    public function development(): WP_REST_Response|WP_Error {
        $type = $this->catalog->type( 'wedding' );
        $draft = $this->validator->draft( WeddingDemo::draft(), $type, $this->catalog->template( 'modern-editorial' ) );
        if ( is_wp_error( $draft ) ) {
            return $draft;
        }
        return new WP_REST_Response( array( 'data' => array(
            'options' => WeddingSections::editor_options( $type['schema'] ),
            'presets' => array_values( array_map( static function ( array $preset ): array {
                return array_intersect_key( $preset, array_flip( array( 'id', 'name', 'description' ) ) );
            }, $this->catalog->wedding_registry()['styles']['presets'] ) ),
            'demo' => array(
                'siteType' => 'wedding', 'templateId' => 'modern-editorial', 'templateVersion' => '1',
                'draft' => $draft, 'previewMedia' => WeddingDemo::media(),
            ),
        ) ) );
    }

    public function resolve( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $project = MediaService::project( (int) $request->get_url_params()['id'] );
        if ( is_wp_error( $project ) ) {
            return $project;
        }
        $payload = $request->get_json_params();
        if (
            ! $request->is_json_content_type()
            || strlen( $request->get_body() ) > 2000000
            || ! is_array( $payload )
            || array_diff( array_keys( $payload ), array( 'ids', 'draft' ) )
            || ! isset( $payload['ids'] )
            || ! is_array( $payload['ids'] )
            || ! array_is_list( $payload['ids'] )
            || count( $payload['ids'] ) > 42
        ) {
            return new WP_Error( 'microsite_media_invalid', 'Provide at most 42 photo IDs.', array( 'status' => 400 ) );
        }
        foreach ( $payload['ids'] as $id ) {
            if ( ! is_int( $id ) || $id < 1 ) {
                return new WP_Error( 'microsite_media_invalid', 'Photo IDs must be positive JSON integers.', array( 'status' => 400 ) );
            }
        }
        $normalised = null;
        if ( isset( $payload['draft'] ) ) {
            $value = $this->validator->draft( $payload['draft'], $this->catalog->type( 'wedding' ), $this->catalog->template( 'modern-editorial' ) );
            if ( ! is_wp_error( $value ) ) {
                $normalised = $value;
            }
        }
        return new WP_REST_Response( array( 'data' => array(
            'media' => MediaService::resolve_ids( $payload['ids'], (int) $project->post_author ),
            'draft' => $normalised,
        ) ) );
    }
}
