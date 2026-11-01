<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class RsvpDatabase {
    public const VERSION = '1';

    public static function install(): void {
        if ( self::VERSION === get_option( 'microsite_rsvp_database_version' ) ) {
            return;
        }

        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset = $wpdb->get_charset_collate();
        $responses = $wpdb->prefix . 'microsite_rsvp';
        $operations = $wpdb->prefix . 'microsite_rsvp_deleted';

        dbDelta( "CREATE TABLE $responses (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            project_id bigint(20) unsigned NOT NULL,
            guest_name varchar(80) NOT NULL,
            attending varchar(3) NOT NULL,
            party_size smallint(5) unsigned NOT NULL,
            secret_hash char(64) NOT NULL,
            creation_key char(64) NOT NULL,
            creation_fingerprint char(64) NOT NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY secret_hash (secret_hash),
            UNIQUE KEY project_creation (project_id,creation_key),
            KEY project_attending (project_id,attending,id)
        ) ENGINE=InnoDB $charset;" );

        dbDelta( "CREATE TABLE $operations (
            project_id bigint(20) unsigned NOT NULL,
            creation_key char(64) NOT NULL,
            expires_at datetime NOT NULL,
            PRIMARY KEY  (project_id,creation_key),
            KEY expires_at (expires_at)
        ) ENGINE=InnoDB $charset;" );

        // Verify the constraints that protect concurrent submissions before marking success.
        $indexes = $wpdb->get_results( "SHOW INDEX FROM $responses", ARRAY_A );
        $unique = array();

        foreach ( $indexes ?? array() as $index ) {
            if ( '0' === (string) $index['Non_unique'] ) {
                $unique[ $index['Key_name'] ] = true;
            }
        }

        $response_status = $wpdb->get_row( $wpdb->prepare( 'SHOW TABLE STATUS WHERE Name = %s', $responses ), ARRAY_A );
        $operation_status = $wpdb->get_row( $wpdb->prepare( 'SHOW TABLE STATUS WHERE Name = %s', $operations ), ARRAY_A );

        if (
            isset( $unique['secret_hash'], $unique['project_creation'] )
            && 'InnoDB' === ( $response_status['Engine'] ?? null )
            && 'InnoDB' === ( $operation_status['Engine'] ?? null )
        ) {
            update_option( 'microsite_rsvp_database_version', self::VERSION, false );
        }
    }

    public static function cleanup(): void {
        global $wpdb;
        $wpdb->query( $wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}microsite_rsvp_deleted WHERE expires_at <= %s",
            gmdate( 'Y-m-d H:i:s' )
        ) );
    }

    public static function delete_project( int $id ): void {
        if ( 'ms_site' !== get_post_type( $id ) ) {
            return;
        }

        $result = ProjectLock::run( $id, static function () use ( $id ): bool {
            global $wpdb;
            update_post_meta( $id, '_microsite_rsvp_deleting', '1' );
            $wpdb->query( 'START TRANSACTION' );
            $responses = $wpdb->delete( $wpdb->prefix . 'microsite_rsvp', array( 'project_id' => $id ), array( '%d' ) );
            $operations = $wpdb->delete( $wpdb->prefix . 'microsite_rsvp_deleted', array( 'project_id' => $id ), array( '%d' ) );

            if ( false === $responses || false === $operations ) {
                $wpdb->query( 'ROLLBACK' );
                return false;
            }

            return false !== $wpdb->query( 'COMMIT' );
        } );

        if ( is_wp_error( $result ) || ! $result ) {
            // Stop deletion rather than leave active secrets orphaned.
            wp_die( 'The project could not be deleted because its responses could not be removed.', '', array( 'response' => 503 ) );
        }
    }
}
