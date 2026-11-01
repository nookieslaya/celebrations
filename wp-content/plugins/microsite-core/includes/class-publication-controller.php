<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class PublicationController {
    public function __construct( private Publication $publication, private Permissions $permissions ) {
    }

    public function register_routes(): void {
        foreach ( array( 'publish', 'unpublish' ) as $operation ) {
            register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/' . $operation, array(
                'methods' => 'POST',
                'permission_callback' => array( $this->permissions, 'require_session' ),
                'callback' => function ( WP_REST_Request $request ) use ( $operation ): WP_REST_Response|WP_Error {
                    // These commands accept no client-controlled state or entitlement.
                    if ( '' !== trim( $request->get_body() ) && '{}' !== trim( $request->get_body() ) ) {
                        return new WP_Error( 'microsite_validation_error', 'This operation accepts no fields.', array( 'status' => 400 ) );
                    }

                    $result = $this->publication->$operation( (int) $request->get_url_params()['id'] );

                    if ( is_wp_error( $result ) ) {
                        return $result;
                    }

                    return new WP_REST_Response( array( 'data' => $result ) );
                },
            ) );
        }
    }
}
