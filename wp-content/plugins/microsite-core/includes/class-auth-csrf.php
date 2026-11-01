<?php

namespace Microsite\Core;

use WP_Error;
use WP_REST_Request;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class AuthCsrf {
    private const LIFETIME = 1800;

    public static function bootstrap_token(): string {
        $cookie = self::context_cookie();

        if ( ! self::valid_context( $cookie ) ) {
            $context = time() . '.' . bin2hex( random_bytes( 32 ) );
            $cookie = $context . '.' . wp_hash( 'auth-context:' . $context, 'auth' );

            setcookie(
                self::cookie_name(),
                $cookie,
                array(
                    'expires'  => time() + self::LIFETIME,
                    'path'     => '/',
                    'secure'   => is_ssl(),
                    'httponly' => true,
                    'samesite' => 'Strict',
                )
            );

            $_COOKIE[ self::cookie_name() ] = $cookie;
        }

        return wp_hash( 'auth-csrf:' . $cookie, 'nonce' );
    }

    public static function verify( WP_REST_Request $request ): true|WP_Error {
        $origin = (string) $request->get_header( 'origin' );
        $site = wp_parse_url( home_url() );
        $expected_origin = strtolower( $site['scheme'] . '://' . $site['host'] );

        if ( isset( $site['port'] ) ) {
            $default_port = 'https' === $site['scheme'] ? 443 : 80;

            if ( $default_port !== $site['port'] ) {
                $expected_origin .= ':' . $site['port'];
            }
        }

        if (
            strtolower( $origin ) !== $expected_origin
            || 'cross-site' === $request->get_header( 'sec-fetch-site' )
            || ! $request->is_json_content_type()
        ) {
            return self::error();
        }

        $cookie = self::context_cookie();
        $token = (string) $request->get_header( 'x-microsite-csrf' );

        if (
            ! self::valid_context( $cookie )
            || ! hash_equals( wp_hash( 'auth-csrf:' . $cookie, 'nonce' ), $token )
        ) {
            return self::error();
        }

        return true;
    }

    private static function cookie_name(): string {
        return 'microsite_auth_' . substr( wp_hash( home_url(), 'auth' ), 0, 12 );
    }

    private static function context_cookie(): string {
        $value = $_COOKIE[ self::cookie_name() ] ?? '';

        return is_string( $value ) ? wp_unslash( $value ) : '';
    }

    private static function valid_context( string $cookie ): bool {
        if ( ! preg_match( '/^([0-9]{10})\.([a-f0-9]{64})\.([a-f0-9]{32})$/', $cookie, $parts ) ) {
            return false;
        }

        $created_at = (int) $parts[1];
        $context = $parts[1] . '.' . $parts[2];

        return $created_at <= time()
            && time() - $created_at < self::LIFETIME
            && hash_equals( wp_hash( 'auth-context:' . $context, 'auth' ), $parts[3] );
    }

    private static function error(): WP_Error {
        return new WP_Error(
            'microsite_csrf_rejected',
            'This request could not be verified. Refresh the page and try again.',
            array( 'status' => 403 )
        );
    }
}
