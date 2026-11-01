<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class RsvpController {
    public function __construct( private RsvpService $service, private Permissions $permissions ) {
    }

    public function register_routes(): void {
        register_rest_route( 'microsites/v1', '/public/sites/(?P<publicId>[a-f0-9]{32})/rsvp', array(
            'methods' => 'GET',
            'permission_callback' => array( $this, 'guest_permission' ),
            'callback' => function ( WP_REST_Request $request ): WP_REST_Response {
                return $this->response( $this->service->status( $request['publicId'] ) );
            },
        ) );

        register_rest_route( 'microsites/v1', '/public/sites/(?P<publicId>[a-f0-9]{32})/responses', array(
            'methods' => 'POST',
            'permission_callback' => array( $this, 'guest_permission' ),
            'callback' => function ( WP_REST_Request $request ): WP_REST_Response|WP_Error {
                $payload = $this->payload( $request );
                $secret = $request->get_header( 'X-Microsite-RSVP' );
                $key = $request->get_header( 'Idempotency-Key' );

                if ( is_wp_error( $payload ) ) {
                    return $payload;
                }

                if ( ! preg_match( '/^[a-f0-9]{64}$/', $secret ) || ! preg_match( '/^[0-9]{10}\.[a-f0-9]{64}$/', $key ) ) {
                    return new WP_Error( 'microsite_rsvp_invalid', 'A secure submission key and management secret are required.', array( 'status' => 400 ) );
                }

                $result = $this->service->create( $request['publicId'], $payload, $secret, $key );
                return is_wp_error( $result ) ? $result : $this->response( $result, $result['replayed'] ? 200 : 201 );
            },
        ) );

        register_rest_route( 'microsites/v1', '/rsvp/responses/(?P<responseId>[1-9][0-9]*)', array(
            'methods' => array( 'GET', 'PATCH', 'DELETE' ),
            'permission_callback' => array( $this, 'guest_permission' ),
            'callback' => function ( WP_REST_Request $request ): WP_REST_Response|WP_Error {
                $id = (int) $request['responseId'];
                $secret = $request->get_header( 'X-Microsite-RSVP' );

                if ( 'GET' === $request->get_method() ) {
                    $result = $this->service->read( $id, $secret );
                } elseif ( 'DELETE' === $request->get_method() ) {
                    if ( '' !== trim( $request->get_body() ) ) {
                        return new WP_Error( 'microsite_rsvp_invalid', 'Deletion accepts no fields.', array( 'status' => 400 ) );
                    }
                    $result = $this->service->remove( $id, $secret );
                } else {
                    $payload = $this->payload( $request );
                    $result = is_wp_error( $payload ) ? $payload : $this->service->update( $id, $secret, $payload );
                }

                return is_wp_error( $result ) ? $result : $this->response( $result );
            },
        ) );

        register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/responses', array(
            'methods' => 'GET',
            'permission_callback' => array( $this->permissions, 'require_session' ),
            'args' => array(
                'page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100000, 'default' => 1 ),
                'per_page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 50, 'default' => 20 ),
                'attending' => array( 'type' => 'string', 'enum' => array( '', 'yes', 'no' ), 'default' => '' ),
            ),
            'callback' => function ( WP_REST_Request $request ): WP_REST_Response|WP_Error {
                $result = $this->service->organizer( (int) $request['id'], (int) $request['page'], (int) $request['per_page'], $request['attending'] );
                return is_wp_error( $result ) ? $result : $this->response( $result );
            },
        ) );

        register_rest_route( 'microsites/v1', '/sites/(?P<id>[1-9][0-9]*)/responses/(?P<responseId>[1-9][0-9]*)', array(
            'methods' => 'DELETE',
            'permission_callback' => array( $this->permissions, 'require_session' ),
            'callback' => function ( WP_REST_Request $request ): WP_REST_Response|WP_Error {
                $access = $this->service->organizer( (int) $request['id'], 1, 1, '' );

                if ( is_wp_error( $access ) ) {
                    return $access;
                }

                $result = $this->service->remove( (int) $request['responseId'], null, (int) $request['id'] );
                return is_wp_error( $result ) ? $result : $this->response( true );
            },
        ) );
    }

    public function guest_permission( WP_REST_Request $request ): true|WP_Error {
        if ( strlen( $request->get_body() ) > 2048 ) {
            return new WP_Error( 'microsite_rsvp_payload_large', 'The response payload is too large.', array( 'status' => 413 ) );
        }

        $origin = (string) $request->get_header( 'Origin' );
        $home = wp_parse_url( home_url() );
        $expected = $home['scheme'] . '://' . $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );

        if (
            ( '' !== $origin && $origin !== $expected )
            || ( 'GET' !== $request->get_method() && $origin !== $expected )
            || 'cross-site' === $request->get_header( 'Sec-Fetch-Site' )
        ) {
            return new WP_Error( 'microsite_rsvp_origin', 'Use the RSVP form on this site.', array( 'status' => 403 ) );
        }

        return true;
    }

    public function limit_request( $response, array $handler, WP_REST_Request $request ) {
        if ( null !== $response || ! preg_match( '#^/microsites/v1/(?:public/sites/|rsvp/responses/)#', $request->get_route() ) ) {
            return $response;
        }

        $valid = $this->guest_permission( $request );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        // Permission callbacks may be evaluated again when WordPress builds Allow headers.
        // Count once at the request boundary, never inside permission_callback.
        $limited = $this->rate_limit( $request );
        return is_wp_error( $limited ) ? $limited : $response;
    }

    public function restrict_cors( bool $served, $result, WP_REST_Request $request ): bool {
        if ( preg_match( '#^/microsites/v1/(?:public/sites/|rsvp/responses/)#', $request->get_route() ) ) {
            // These guest endpoints are same-origin only, including preflight responses.
            remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
            header_remove( 'Access-Control-Allow-Origin' );
            header_remove( 'Access-Control-Allow-Credentials' );
            header( 'Referrer-Policy: no-referrer' );
        }
        return $served;
    }

    private function rate_limit( WP_REST_Request $request ): true|WP_Error {
        global $wpdb;
        $create = 'POST' === $request->get_method();
        $window = 600;
        $now = time();
        $expires = ( (int) floor( $now / $window ) + 1 ) * $window;
        $operation = $create ? 'create' : ( 'GET' === $request->get_method() ? 'read' : 'change' );
        $limit = $create ? 40 : 180;
        // Peer IP is hashed with the site salt; never trust X-Forwarded-For or user 0.
        $key = 'microsite_rsvp_rate_' . wp_hash( $operation . '|' . ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) . '|' . $expires );
        $name = '_transient_' . $key;
        add_option( '_transient_timeout_' . $key, $expires, '', false );
        add_option( $name, 0, '', false );
        $updated = $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->options} SET option_value = CAST(option_value AS UNSIGNED) + 1 WHERE option_name = %s",
            $name
        ) );

        if ( false === $updated ) {
            return new WP_Error( 'microsite_rsvp_unavailable', 'RSVP is temporarily unavailable.', array( 'status' => 503 ) );
        }

        $count = (int) $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $name ) );

        if ( $count > $limit ) {
            return new WP_Error( 'microsite_rsvp_rate_limited', 'Too many RSVP attempts. Please try again later.', array( 'status' => 429, 'retryAfter' => max( 1, $expires - $now ) ) );
        }
        return true;
    }

    private function payload( WP_REST_Request $request ): array|WP_Error {
        $decoded = json_decode( $request->get_body() );

        if ( ! $request->is_json_content_type() || ! is_object( $decoded ) ) {
            return new WP_Error( 'microsite_rsvp_invalid', 'Send a JSON object.', array( 'status' => 400 ) );
        }
        return json_decode( $request->get_body(), true );
    }

    private function response( mixed $data, int $status = 200 ): WP_REST_Response {
        $response = new WP_REST_Response( array( 'data' => $data ), $status );
        $response->header( 'Cache-Control', 'no-store, private, max-age=0' );
        $response->header( 'Referrer-Policy', 'no-referrer' );
        return $response;
    }
}
