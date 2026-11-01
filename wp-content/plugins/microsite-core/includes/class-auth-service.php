<?php

namespace Microsite\Core;

use WP_Error;
use WP_User;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class AuthService {
    public static function session(): array {
        $user = wp_get_current_user();
        $identity = null;
        $nonce = null;

        if ( $user->exists() ) {
            $identity = array(
                'id'             => $user->ID,
                'email'          => $user->user_email,
                'displayName'    => $user->display_name,
                'canCreateSites' => user_can( $user, 'create_ms_sites' ),
                'canEditSites'   => user_can( $user, 'edit_ms_sites' ),
            );
            $nonce = wp_create_nonce( 'wp_rest' );
        }

        return array(
            'user'                => $identity,
            'nonce'               => $nonce,
            'registrationEnabled' => (bool) get_option( 'users_can_register' ),
        );
    }

    public function login( array $payload ): array|WP_Error {
        $valid = $this->validate( $payload, false );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        return $this->sign_in( $payload['email'], $payload['password'] );
    }

    public function register( array $payload ): array|WP_Error {
        if ( ! get_option( 'users_can_register' ) ) {
            return new WP_Error(
                'microsite_registration_disabled',
                'Registration is currently closed. Please contact the site administrator.',
                array( 'status' => 403 )
            );
        }

        $valid = $this->validate( $payload, true );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        $id = wp_insert_user(
            array(
                'user_login'   => 'ms_' . bin2hex( random_bytes( 12 ) ),
                'user_email'   => $payload['email'],
                'user_pass'    => $payload['password'],
                'display_name' => strstr( $payload['email'], '@', true ),
                'role'         => 'microsite_customer',
            )
        );

        if ( is_wp_error( $id ) ) {
            return new WP_Error(
                'microsite_registration_failed',
                'An account could not be created with these details.',
                array( 'status' => 400 )
            );
        }

        return $this->sign_in( $payload['email'], $payload['password'] );
    }

    public function logout(): array {
        wp_logout();
        unset( $_COOKIE[ LOGGED_IN_COOKIE ] );

        return self::session();
    }

    private function sign_in( string $email, string $password ): array|WP_Error {
        // wp_signon sets response cookies, not the current request's cookie array.
        // Capture the native cookie so the returned nonce binds to the NEW session token.
        $capture_cookie = static function ( string $cookie ): void {
            $_COOKIE[ LOGGED_IN_COOKIE ] = $cookie;
        };

        add_action( 'set_logged_in_cookie', $capture_cookie );

        try {
            $user = wp_signon(
                array(
                    'user_login'    => $email,
                    'user_password' => $password,
                    'remember'      => false,
                ),
                is_ssl()
            );
        } finally {
            remove_action( 'set_logged_in_cookie', $capture_cookie );
        }

        if ( ! $user instanceof WP_User ) {
            return new WP_Error(
                'microsite_invalid_credentials',
                'The email or password is incorrect.',
                array( 'status' => 401 )
            );
        }

        wp_set_current_user( $user->ID );

        return self::session();
    }

    private function validate( array $payload, bool $registering ): true|WP_Error {
        $allowed = $registering
            ? array( 'email', 'password', 'passwordConfirmation' )
            : array( 'email', 'password' );

        foreach ( array_keys( $payload ) as $key ) {
            if ( ! in_array( $key, $allowed, true ) ) {
                return $this->validation_error();
            }
        }

        foreach ( $allowed as $key ) {
            if ( ! isset( $payload[ $key ] ) || ! is_string( $payload[ $key ] ) ) {
                return $this->validation_error();
            }
        }

        if (
            strlen( $payload['email'] ) > 254
            || ! is_email( $payload['email'] )
            || strlen( $payload['password'] ) < 1
            || strlen( $payload['password'] ) > 128
        ) {
            return $this->validation_error();
        }

        if (
            $registering
            && (
                strlen( $payload['password'] ) < 12
                || ! hash_equals( $payload['password'], $payload['passwordConfirmation'] )
            )
        ) {
            return $this->validation_error();
        }

        return true;
    }

    private function validation_error(): WP_Error {
        return new WP_Error(
            'microsite_auth_validation',
            'Check your email and password. Use a long new password and enter the same confirmation.',
            array( 'status' => 400 )
        );
    }
}
