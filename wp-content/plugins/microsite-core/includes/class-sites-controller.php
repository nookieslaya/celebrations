<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SitesController {
    public function __construct(
        private Catalog $catalog,
        private SiteService $service,
        private Permissions $permissions
    ) {
    }

    public function register_routes(): void {
        register_rest_route(
            'microsites/v1',
            '/catalog',
            array(
                'methods'             => 'GET',
                'permission_callback' => '__return_true',
                'callback'            => function (): WP_REST_Response {
                    return $this->response( $this->catalog->public_metadata() );
                },
            )
        );

        register_rest_route(
            'microsites/v1',
            '/sites',
            array(
                array(
                    'methods'             => 'GET',
                    'permission_callback' => function (): true|WP_Error {
                        return $this->permissions->require_capability( 'edit_ms_sites' );
                    },
                    'callback'            => array( $this, 'list' ),
                    'args'                => array(
                        'page' => array(
                            'type'    => 'integer',
                            'minimum' => 1,
                            'maximum' => 100000,
                            'default' => 1,
                        ),
                        'per_page' => array(
                            'type'    => 'integer',
                            'minimum' => 1,
                            'maximum' => 50,
                            'default' => 20,
                        ),
                    ),
                ),
                array(
                    'methods'             => 'POST',
                    'permission_callback' => function (): true|WP_Error {
                        return $this->permissions->require_capability( 'create_ms_sites' );
                    },
                    'callback'            => array( $this, 'create' ),
                ),
            )
        );

        register_rest_route(
            'microsites/v1',
            '/sites/(?P<id>[1-9][0-9]*)',
            array(
                array(
                    'methods'             => 'GET',
                    'permission_callback' => array( $this->permissions, 'require_session' ),
                    'callback'            => array( $this, 'read' ),
                ),
                array(
                    'methods'             => 'PATCH',
                    'permission_callback' => array( $this->permissions, 'require_session' ),
                    'callback'            => array( $this, 'update' ),
                ),
            )
        );
    }

    public function list( WP_REST_Request $request ): WP_REST_Response {
        return $this->response(
            $this->service->list( (int) $request['page'], (int) $request['per_page'] )
        );
    }

    public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $payload = $this->json_payload( $request );

        if ( is_wp_error( $payload ) ) {
            return $payload;
        }

        $result = $this->service->create( $payload );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return $this->response( $result, 201 );
    }

    public function read( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $result = $this->service->read( (int) $request->get_url_params()['id'] );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return $this->response( $result );
    }

    public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
        $payload = $this->json_payload( $request );

        if ( is_wp_error( $payload ) ) {
            return $payload;
        }

        $result = $this->service->update( (int) $request->get_url_params()['id'], $payload );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return $this->response( $result );
    }

    private function json_payload( WP_REST_Request $request ): array|WP_Error {
        $body = $request->get_body();
        $decoded = json_decode( $body );

        if ( ! $request->is_json_content_type() || ! is_object( $decoded ) ) {
            return new WP_Error(
                'microsite_validation_error',
                'The request body must be a JSON object.',
                array( 'status' => 400 )
            );
        }

        return json_decode( $body, true );
    }

    public function private_headers( WP_REST_Response $response, $server, WP_REST_Request $request ): WP_REST_Response {
        if ( str_starts_with( $request->get_route(), '/microsites/v1/' ) ) {
            $response->header( 'Cache-Control', 'no-store, private, max-age=0' );
            $response->header( 'Vary', 'Cookie, X-WP-Nonce' );
        }

        return $response;
    }

    private function response( array $data, int $status = 200 ): WP_REST_Response {
        return new WP_REST_Response( array( 'data' => $data ), $status );
    }
}
