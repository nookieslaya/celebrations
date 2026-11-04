<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class RsvpService {
    public function __construct(
        private Publication $publication,
        private Catalog $catalog,
        private SiteRepository $sites,
        private Permissions $permissions
    ) {
    }

    /** Overridable only in server-side tests, never from HTTP input. */
    public static function now(): int {
        return (int) apply_filters( 'microsite_rsvp_now', time() );
    }

    public function status( string $public_id ): array {
        $snapshot = $this->publication->public_snapshot( $public_id );
        $context = RsvpContext::resolve( $snapshot );
        $configuration = $context['configuration'];
        $enabled = $context['enabled'];
        $event = $context['event'];
        $starts = $event ? strtotime( $event['startsAt'] ) : false;
        $deadline = ! empty( $configuration['deadlineAt'] ) ? strtotime( $configuration['deadlineAt'] ) : $starts;
        $open = $enabled && $starts && $deadline && self::now() < min( $starts, $deadline );

        $status = array(
            'enabled' => (bool) $enabled,
            'open' => (bool) $open,
            'reason' => $open ? null : ( $enabled ? 'RSVP is closed.' : 'RSVP is unavailable.' ),
            'maxPartySize' => $enabled ? $configuration['maxPartySize'] : null,
            'deadlineAt' => $enabled ? ( $configuration['deadlineAt'] ?: $event['startsAt'] ) : null,
            'timeZone' => $enabled ? $event['timeZone'] : null,
        );
        if ( null !== $context['eventName'] ) {
            $status['eventName'] = $context['eventName'];
        }
        return $status;
    }

    public function create( string $public_id, array $payload, string $secret, string $key ): array|WP_Error {
        $post = $this->project( $public_id );

        if ( ! $post ) {
            return $this->unavailable();
        }

        return ProjectLock::run( $post->ID, function () use ( $post, $public_id, $payload, $secret, $key ): array|WP_Error {
            global $wpdb;
            $table = $wpdb->prefix . 'microsite_rsvp';
            $key_hash = hash( 'sha256', $key );
            $secret_hash = hash( 'sha256', $secret );
            $existing = $wpdb->get_row( $wpdb->prepare(
                "SELECT * FROM $table WHERE project_id = %d AND creation_key = %s",
                $post->ID,
                $key_hash
            ), ARRAY_A );
            $valid = $this->validate_payload( $payload, null );

            if ( is_wp_error( $valid ) ) {
                return $existing ? $this->conflict() : $valid;
            }

            $fingerprint = hash( 'sha256', wp_json_encode( $valid ) );
            // Compare the immutable creation fingerprint, not a later edited answer.
            if ( $existing ) {
                if ( ! hash_equals( $existing['secret_hash'], $secret_hash ) || ! hash_equals( $existing['creation_fingerprint'], $fingerprint ) ) {
                    return $this->conflict();
                }
                return array( 'response' => $this->dto( $existing ), 'replayed' => true );
            }

            $deleted = $wpdb->get_var( $wpdb->prepare(
                "SELECT creation_key FROM {$wpdb->prefix}microsite_rsvp_deleted WHERE project_id = %d AND creation_key = %s",
                $post->ID,
                $key_hash
            ) );

            if ( $deleted ) {
                return new WP_Error( 'microsite_rsvp_consumed', 'This submission was deleted. Start a new response if RSVP is open.', array( 'status' => 409 ) );
            }

            $created = (int) explode( '.', $key )[0];

            if ( $created > self::now() + 60 || $created < self::now() - DAY_IN_SECONDS ) {
                return new WP_Error( 'microsite_rsvp_key_expired', 'This submission expired. Start a new response.', array( 'status' => 409 ) );
            }

            $status = $this->status( $public_id );

            if ( ! $status['open'] || get_post_meta( $post->ID, '_microsite_rsvp_deleting', true ) ) {
                return $this->unavailable();
            }

            $valid = $this->validate_payload( $payload, $status['maxPartySize'] );

            if ( is_wp_error( $valid ) ) {
                return $valid;
            }

            $date = gmdate( 'Y-m-d H:i:s', self::now() );
            $inserted = $wpdb->insert( $table, array(
                'project_id' => $post->ID,
                'guest_name' => $valid['name'],
                'attending' => $valid['attending'],
                'party_size' => $valid['partySize'],
                'secret_hash' => $secret_hash,
                'creation_key' => $key_hash,
                'creation_fingerprint' => $fingerprint,
                'created_at' => $date,
                'updated_at' => $date,
            ), array( '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s' ) );

            if ( false === $inserted ) {
                return $this->conflict();
            }

            $row = $this->row( (int) $wpdb->insert_id );
            return array( 'response' => $this->dto( $row ), 'replayed' => false );
        } );
    }

    public function read( int $id, string $secret ): array|WP_Error {
        $row = $this->authorized( $id, $secret );

        if ( is_wp_error( $row ) ) {
            return $row;
        }

        $post = $this->sites->find( (int) $row['project_id'] );
        return array(
            'response' => $this->dto( $row ),
            'status' => $post ? $this->status( $post->post_name ) : $this->status( '' ),
        );
    }

    public function update( int $id, string $secret, array $payload ): array|WP_Error {
        $row = $this->authorized( $id, $secret );

        if ( is_wp_error( $row ) ) {
            return $row;
        }

        return ProjectLock::run( (int) $row['project_id'], function () use ( $id, $secret, $payload ): array|WP_Error {
            global $wpdb;
            $row = $this->authorized( $id, $secret );

            if ( is_wp_error( $row ) ) {
                return $row;
            }

            $post = $this->sites->find( (int) $row['project_id'] );
            $status = $post ? $this->status( $post->post_name ) : $this->status( '' );

            if ( ! $status['open'] ) {
                return $this->unavailable();
            }

            $valid = $this->validate_payload( $payload, $status['maxPartySize'] );

            if ( is_wp_error( $valid ) ) {
                return $valid;
            }

            $updated = $wpdb->update( $wpdb->prefix . 'microsite_rsvp', array(
                'guest_name' => $valid['name'],
                'attending' => $valid['attending'],
                'party_size' => $valid['partySize'],
                'updated_at' => gmdate( 'Y-m-d H:i:s', self::now() ),
            ), array( 'id' => $id ), array( '%s', '%s', '%d', '%s' ), array( '%d' ) );

            if ( false === $updated ) {
                return $this->storage_error();
            }

            return $this->read( $id, $secret );
        } );
    }

    public function remove( int $id, ?string $secret = null, ?int $project_id = null ): true|WP_Error {
        $row = null === $secret ? $this->row( $id ) : $this->authorized( $id, $secret );

        if ( ! $row || is_wp_error( $row ) || ( null !== $project_id && (int) $row['project_id'] !== $project_id ) ) {
            return $this->no_access();
        }

        return ProjectLock::run( (int) $row['project_id'], function () use ( $id, $secret, $project_id ): true|WP_Error {
            global $wpdb;
            $row = null === $secret ? $this->row( $id ) : $this->authorized( $id, $secret );

            if ( ! $row || is_wp_error( $row ) || ( null !== $project_id && (int) $row['project_id'] !== $project_id ) ) {
                return $this->no_access();
            }

            $wpdb->query( 'START TRANSACTION' );
            $marked = $wpdb->replace( $wpdb->prefix . 'microsite_rsvp_deleted', array(
                'project_id' => $row['project_id'],
                'creation_key' => $row['creation_key'],
                'expires_at' => gmdate( 'Y-m-d H:i:s', self::now() + 2 * DAY_IN_SECONDS ),
            ), array( '%d', '%s', '%s' ) );
            $deleted = false !== $marked ? $wpdb->delete( $wpdb->prefix . 'microsite_rsvp', array( 'id' => $id ), array( '%d' ) ) : false;

            if ( false === $marked || 1 !== $deleted ) {
                $wpdb->query( 'ROLLBACK' );
                return $this->storage_error();
            }

            if ( false === $wpdb->query( 'COMMIT' ) ) {
                return $this->storage_error();
            }

            return true;
        } );
    }

    public function organizer( int $project_id, int $page, int $per_page, string $filter ): array|WP_Error {
        $post = $this->sites->find( $project_id );

        if ( ! $post || ! $this->permissions->can_access( $post ) ) {
            return new WP_Error( 'microsite_not_found', 'Project not found.', array( 'status' => 404 ) );
        }

        $record = $this->sites->to_record( $post );

        if ( ! in_array( 'rsvp', $this->catalog->type( $record['siteType'] )['features'], true ) ) {
            return new WP_Error( 'microsite_rsvp_unsupported', 'This site type does not support RSVP.', array( 'status' => 400 ) );
        }

        global $wpdb;
        $table = $wpdb->prefix . 'microsite_rsvp';
        $where = $wpdb->prepare( 'project_id = %d', $project_id );

        if ( '' !== $filter ) {
            $where .= $wpdb->prepare( ' AND attending = %s', $filter );
        }

        $total = $wpdb->get_var( "SELECT COUNT(*) FROM $table WHERE $where" );
        $summary = $wpdb->get_row( $wpdb->prepare(
            "SELECT SUM(attending = 'yes') AS yes_count, SUM(attending = 'no') AS no_count, SUM(CASE WHEN attending = 'yes' THEN party_size ELSE 0 END) AS participants FROM $table WHERE project_id = %d",
            $project_id
        ), ARRAY_A );
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM $table WHERE $where ORDER BY id DESC LIMIT %d OFFSET %d",
            $per_page,
            ( $page - 1 ) * $per_page
        ), ARRAY_A );

        if ( null === $total || null === $summary || null === $rows || $wpdb->last_error ) {
            return $this->storage_error();
        }

        return array(
            'items' => array_map( array( $this, 'dto' ), $rows ),
            'summary' => array( 'yes' => (int) $summary['yes_count'], 'no' => (int) $summary['no_count'], 'participants' => (int) $summary['participants'] ),
            'pagination' => array( 'page' => $page, 'perPage' => $per_page, 'total' => (int) $total, 'totalPages' => (int) ceil( (int) $total / $per_page ) ),
            'status' => $this->status( $post->post_name ),
        );
    }

    private function validate_payload( array $payload, ?int $limit ): array|WP_Error {
        $fields = array();

        if ( array_diff( array_keys( $payload ), array( 'name', 'attending', 'partySize', 'website' ) ) ) {
            return new WP_Error( 'microsite_rsvp_invalid', 'Unknown response fields.', array( 'status' => 400 ) );
        }

        if ( isset( $payload['website'] ) && '' !== $payload['website'] ) {
            return new WP_Error( 'microsite_rsvp_invalid', 'The response could not be accepted.', array( 'status' => 400 ) );
        }

        $name = $payload['name'] ?? null;
        $decoded = is_string( $name ) ? html_entity_decode( $name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) : '';

        if ( ! is_string( $name ) || mb_strlen( $name ) > 80 || preg_match( '/^[\s\p{Z}]*$/u', $name ) || preg_match( '/[<>\x00-\x1F\x7F]/u', $decoded ) ) {
            $fields['name'] = 'Enter a plain-text name, between 1 and 80 characters.';
        }

        $attending = $payload['attending'] ?? null;
        $party_size = $payload['partySize'] ?? null;

        if ( ! in_array( $attending, array( 'yes', 'no' ), true ) ) {
            $fields['attending'] = 'Choose yes or no.';
        }

        if ( ! is_int( $party_size ) || ( 'no' === $attending && 0 !== $party_size ) || ( 'yes' === $attending && ( $party_size < 1 || $party_size > ( $limit ?? 20 ) ) ) ) {
            $fields['partySize'] = 'For yes, use a whole number from 1 to the current limit. For no, use 0.';
        }

        if ( $fields ) {
            return new WP_Error( 'microsite_rsvp_invalid', 'Check the response fields.', array( 'status' => 422, 'fields' => $fields ) );
        }

        return array( 'name' => $name, 'attending' => $attending, 'partySize' => $party_size );
    }

    private function project( string $public_id ): ?\WP_Post {
        $posts = get_posts( array( 'post_type' => 'ms_site', 'post_status' => 'draft', 'name' => $public_id, 'posts_per_page' => 1 ) );
        return $posts[0] ?? null;
    }

    private function row( int $id ): ?array {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}microsite_rsvp WHERE id = %d", $id ), ARRAY_A );
    }

    private function authorized( int $id, string $secret ): array|WP_Error {
        $row = $this->row( $id );

        if ( ! $row || ! hash_equals( $row['secret_hash'], hash( 'sha256', $secret ) ) ) {
            return $this->no_access();
        }

        return $row;
    }

    public function dto( array $row ): array {
        return array(
            'id' => (int) $row['id'],
            'name' => $row['guest_name'],
            'attending' => $row['attending'],
            'partySize' => (int) $row['party_size'],
            'createdAt' => str_replace( ' ', 'T', $row['created_at'] ) . 'Z',
            'updatedAt' => str_replace( ' ', 'T', $row['updated_at'] ) . 'Z',
        );
    }

    private function unavailable(): WP_Error {
        return new WP_Error( 'microsite_rsvp_closed', 'RSVP is closed or unavailable.', array( 'status' => 409 ) );
    }

    private function conflict(): WP_Error {
        return new WP_Error( 'microsite_rsvp_conflict', 'This submission conflicts with an existing operation.', array( 'status' => 409 ) );
    }

    private function no_access(): WP_Error {
        return new WP_Error( 'microsite_rsvp_no_access', 'This response is unavailable or the private link is invalid.', array( 'status' => 404 ) );
    }

    private function storage_error(): WP_Error {
        return new WP_Error( 'microsite_rsvp_storage_error', 'Responses are temporarily unavailable. Please try again.', array( 'status' => 503 ) );
    }
}
