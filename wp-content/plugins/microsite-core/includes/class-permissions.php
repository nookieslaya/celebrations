<?php

namespace Microsite\Core;

use WP_Error;
use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Permissions {
    private const VERSION = '1';

    public static function install(): void {
        $customer = get_role( 'microsite_customer' );
        $administrator = get_role( 'administrator' );

        if (
            self::VERSION === get_option( 'microsite_permissions_version' )
            && $customer
            && $administrator
            && $customer->has_cap( 'create_ms_sites' )
            && $administrator->has_cap( 'manage_ms_sites' )
        ) {
            return;
        }

        if ( ! $customer ) {
            add_role( 'microsite_customer', 'Microsite customer', array( 'read' => true ) );
            $customer = get_role( 'microsite_customer' );
        }

        $customer_capabilities = array(
            'read',
            'create_ms_sites',
            'edit_ms_sites',
        );

        $administrator_capabilities = array_merge(
            $customer_capabilities,
            array(
                'manage_ms_sites',
                'edit_others_ms_sites',
                'read_private_ms_sites',
            )
        );

        foreach ( $customer_capabilities as $capability ) {
            $customer->add_cap( $capability );
        }

        if ( $administrator ) {
            foreach ( $administrator_capabilities as $capability ) {
                $administrator->add_cap( $capability );
            }
        }

        update_option( 'microsite_permissions_version', self::VERSION, false );
    }

    public function require_session(): true|WP_Error {
        if ( ! is_user_logged_in() ) {
            return new WP_Error(
                'microsite_authentication_required',
                'A WordPress session and REST nonce are required.',
                array( 'status' => 401 )
            );
        }

        return true;
    }

    public function require_capability( string $capability ): true|WP_Error {
        $session = $this->require_session();

        if ( is_wp_error( $session ) ) {
            return $session;
        }

        if ( ! current_user_can( $capability ) ) {
            return new WP_Error(
                'microsite_forbidden',
                'You do not have permission to perform this operation.',
                array( 'status' => 403 )
            );
        }

        return true;
    }

    public function can_access( WP_Post $post ): bool {
        if ( ! current_user_can( 'edit_ms_sites' ) ) {
            return false;
        }

        if ( (int) $post->post_author === get_current_user_id() ) {
            return true;
        }

        return current_user_can( 'manage_ms_sites' )
            && current_user_can( 'edit_others_ms_sites' );
    }
}
