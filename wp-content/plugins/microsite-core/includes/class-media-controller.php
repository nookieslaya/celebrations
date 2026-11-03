<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class MediaController {
    public function register_routes(): void {
        register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/media', array(
            array(
                'methods' => 'GET',
                'permission_callback' => array( $this, 'permission' ),
                'callback' => array( $this, 'list' ),
                'args' => array( 'page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100000, 'default' => 1 ) ),
            ),
            array(
                'methods' => 'POST',
                'permission_callback' => array( $this, 'permission' ),
                'callback' => array( $this, 'upload' ),
            ),
        ) );
        register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/media/(?P<asset>[1-9][0-9]*)', array(
            'methods' => 'GET',
            'permission_callback' => array( $this, 'permission' ),
            'callback' => array( $this, 'resolve' ),
        ) );
    }

    public function permission( WP_REST_Request $request ): true|WP_Error {
        // Explicit nonce is required for every operation, including application passwords.
        if ( ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
            return new WP_Error( 'microsite_media_nonce', 'A current REST nonce is required.', array( 'status' => 403 ) );
        }

        $project = MediaService::project( (int) $request->get_url_params()['id'] );

        if ( is_wp_error( $project ) ) {
            return $project;
        }

        return true;
    }

    public function list( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $project = MediaService::project( (int) $request->get_url_params()['id'] );

        if ( is_wp_error( $project ) ) {
            return $project;
        }

        return new WP_REST_Response( array( 'data' => MediaService::list( (int) $project->post_author, (int) $request['page'] ) ) );
    }

    public function upload( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $project = MediaService::project( (int) $request->get_url_params()['id'] );

        if ( is_wp_error( $project ) ) {
            return $project;
        }

        $files = $request->get_file_params();
        $result = MediaService::upload( (int) $project->post_author, $files['file'] ?? array() );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return new WP_REST_Response( array( 'data' => $result ), 201 );
    }

    public function resolve( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $project = MediaService::project( (int) $request->get_url_params()['id'] );

        if ( is_wp_error( $project ) ) {
            return $project;
        }

        $result = MediaService::resolve( (int) $request->get_url_params()['asset'], (int) $project->post_author );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return new WP_REST_Response( array( 'data' => $result ) );
    }
}
