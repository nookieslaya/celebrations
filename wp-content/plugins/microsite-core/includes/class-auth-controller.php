<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class AuthController {
    public function __construct(
        private AuthService $service,
        private AuthRateLimit $rate_limit,
        private Permissions $permissions
    ) {
    }

    public function register_routes(): void {
        register_rest_route(
            'microsites/v1',
            '/session',
            array(
                'methods'             => 'GET',
                'permission_callback' => array( $this->permissions, 'require_session' ),
                'callback'            => static function (): WP_REST_Response {
                    return new WP_REST_Response( array( 'data' => AuthService::session() ) );
                },
            )
        );

        foreach ( array( 'login', 'register' ) as $operation ) {
            register_rest_route(
                'microsites/v1',
                '/auth/' . $operation,
                array(
                    'methods'             => 'POST',
                    'permission_callback' => array( AuthCsrf::class, 'verify' ),
                    'callback'            => function ( WP_REST_Request $request ) use ( $operation ): WP_REST_Response|WP_Error {
                        return $this->authenticate( $request, $operation );
                    },
                )
            );
        }

        register_rest_route(
            'microsites/v1',
            '/auth/logout',
            array(
                'methods'             => 'POST',
                'permission_callback' => array( $this->permissions, 'require_session' ),
                'callback'            => function (): WP_REST_Response {
                    return new WP_REST_Response( array( 'data' => $this->service->logout() ) );
                },
            )
        );
    }

    private function authenticate( WP_REST_Request $request, string $operation ): WP_REST_Response|WP_Error {
        $allowed = $this->rate_limit->consume( $operation );

        if ( is_wp_error( $allowed ) ) {
            return $allowed;
        }

        $payload = json_decode( $request->get_body() );

        if ( ! is_object( $payload ) ) {
            return new WP_Error(
                'microsite_auth_validation',
                'The request body must be a JSON object.',
                array( 'status' => 400 )
            );
        }

        $data = json_decode( $request->get_body(), true );
        $result = 'login' === $operation
            ? $this->service->login( $data )
            : $this->service->register( $data );

        if ( is_wp_error( $result ) ) {
            return $result;
        }

        return new WP_REST_Response( array( 'data' => $result ), 'register' === $operation ? 201 : 200 );
    }

    public static function restrict_administration(): void {
        if ( wp_doing_ajax() || ! self::is_customer_only() ) {
            return;
        }

        wp_safe_redirect( home_url( '/app/sites' ) );
        exit;
    }

    public static function hide_customer_admin_bar( bool $visible ): bool {
        if ( self::is_customer_only() ) {
            return false;
        }

        return $visible;
    }

    public static function login_redirect( string $redirect, string $requested, $user ): string {
        if (
            $user instanceof \WP_User
            && in_array( 'microsite_customer', $user->roles, true )
            && ! user_can( $user, 'manage_options' )
        ) {
            return home_url( '/app/sites' );
        }

        return $redirect;
    }

    private static function is_customer_only(): bool {
        $user = wp_get_current_user();

        return in_array( 'microsite_customer', $user->roles, true )
            && ! current_user_can( 'manage_options' );
    }
}
