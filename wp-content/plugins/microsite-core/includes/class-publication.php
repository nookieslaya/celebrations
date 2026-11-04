<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** The shared entry point for publication and future payment entitlements. */
final class Publication {
    private const STATE_KEY = '_microsite_publication';
    private const RIGHT_KEY = '_microsite_publication_right';

    public function __construct(
        private SiteRepository $repository,
        private SiteValidator $validator,
        private Permissions $permissions
    ) {
    }

    public function set_entitlement( int $id, bool $granted ): true|WP_Error {
        if ( ! current_user_can( 'manage_ms_sites' ) ) {
            return new WP_Error( 'microsite_forbidden', 'Only a microsite administrator can change publication rights.', array( 'status' => 403 ) );
        }

        return $this->locked( $id, function () use ( $id, $granted ): true|WP_Error {
            if ( ! $this->repository->find( $id ) ) {
                return $this->not_found();
            }

            $value = $granted ? 'granted' : 'revoked';
            update_post_meta( $id, self::RIGHT_KEY, $value );

            if ( $value !== get_post_meta( $id, self::RIGHT_KEY, true ) ) {
                return $this->storage_error();
            }

            return true;
        } );
    }

    public function describe( array $record ): array {
        $state = $this->state( $record['id'] );
        $gate = $this->gate( $record['id'] );
        $readiness = $this->validator->publishable( $record );
        $block = is_wp_error( $gate ) ? $gate : ( is_wp_error( $readiness ) ? $readiness : null );

        return array(
            'published' => $state['published'] ?? false,
            'publicUrl' => $this->url( $record['publicId'] ),
            'lastPublishedAt' => $state['lastPublishedAt'] ?? null,
            'hasUnpublishedChanges' => isset( $state['snapshot'] ) && $this->hash( $this->snapshot( $record ) ) !== $this->hash( $state['snapshot'] ),
            'canPublish' => null === $block,
            'blockedReason' => $block ? $block->get_error_message() : null,
            'blockedCode' => $block ? $block->get_error_code() : null,
            'fieldErrors' => is_wp_error( $readiness ) ? ( $readiness->get_error_data()['fields'] ?? (object) array() ) : (object) array(),
        );
    }

    public function publish( int $id ): array|WP_Error {
        return $this->locked( $id, function () use ( $id ): array|WP_Error {
            $allowed = $this->gate( $id );

            if ( is_wp_error( $allowed ) ) {
                return $allowed;
            }

            $record = $this->repository->to_record( $this->repository->find( $id ) );
            $draft = $this->validator->publishable( $record );

            if ( is_wp_error( $draft ) ) {
                return $draft;
            }

            $post = $this->repository->find( $id );
            $assets = MediaService::validate_draft( $draft, $record['siteType'], (int) $post->post_author );

            if ( is_wp_error( $assets ) ) {
                return $assets;
            }

            $record['draft'] = $draft;
            $snapshot = $this->snapshot( $record );
            $previous = $this->state( $id );

            // Identical retries preserve the existing snapshot and publication time.
            if ( ! empty( $previous['published'] ) && $this->hash( $previous['snapshot'] ) === $this->hash( $snapshot ) ) {
                return $this->repository->to_record( $this->repository->find( $id ) );
            }

            $state = array(
                'published' => true,
                'snapshot' => $snapshot,
                'lastPublishedAt' => gmdate( 'Y-m-d\TH:i:s\Z' ),
            );
            $saved = $this->save_state( $id, $state );

            if ( is_wp_error( $saved ) ) {
                return $saved;
            }

            return $this->repository->to_record( $this->repository->find( $id ) );
        } );
    }

    public function unpublish( int $id ): array|WP_Error {
        return $this->locked( $id, function () use ( $id ): array|WP_Error {
            // Revocation deliberately does not prevent the owner taking a page down.
            $post = $this->repository->find( $id );

            if ( ! $post || ! $this->permissions->can_access( $post ) ) {
                return $this->not_found();
            }

            $state = $this->state( $id );
            $state['published'] = false;
            $saved = $this->save_state( $id, $state );

            if ( is_wp_error( $saved ) ) {
                return $saved;
            }

            return $this->repository->to_record( $post );
        } );
    }

    public function public_snapshot( string $public_id ): ?array {
        if ( ! preg_match( '/^[a-f0-9]{32}$/', $public_id ) ) {
            return null;
        }

        $posts = get_posts( array(
            'post_type' => 'ms_site',
            'post_status' => 'draft',
            'name' => $public_id,
            'posts_per_page' => 1,
        ) );

        if ( ! $posts ) {
            return null;
        }

        $state = $this->state( $posts[0]->ID );

        if ( empty( $state['published'] ) || empty( $state['snapshot'] ) ) {
            return null;
        }

        $snapshot = $state['snapshot'];
        // Validate stored data through the same contract, but keep its frozen UTC.
        $record = $snapshot;
        $properties = ( new Catalog() )->type( $snapshot['siteType'] )['schema']['properties'] ?? array();
        $record['draft'] = array_intersect_key( $snapshot, $properties );
        $valid = $this->validator->publishable( $record, false );

        if ( is_wp_error( $valid ) ) {
            return null;
        }

        if ( 'wedding' === $snapshot['siteType'] ) {
            // Public projection omits disabled/private unused content without altering storage.
            $snapshot['sections'] = array_values( array_filter( $snapshot['sections'], static function ( array $section ): bool {
                return $section['enabled'];
            } ) );
            $venue_ids = array();
            foreach ( $snapshot['sections'] as $section ) {
                if ( 'venues' === $section['type'] ) {
                    $venue_ids = array_merge( $venue_ids, $section['content']['venueIds'] );
                } elseif ( 'schedule' === $section['type'] ) {
                    $venue_ids = array_merge( $venue_ids, array_column( $section['content']['items'], 'venueId' ) );
                }
            }
            $snapshot['content']['venues'] = array_values( array_filter( $snapshot['content']['venues'], static function ( array $venue ) use ( $venue_ids ): bool {
                return in_array( $venue['id'], $venue_ids, true );
            } ) );
            $snapshot['media'] = MediaService::preview_assets( $record['draft'], (int) $posts[0]->post_author );
        }
        return $snapshot;
    }

    public function url( string $public_id ): string {
        return home_url( '/s/' . $public_id . '/' );
    }

    private function gate( int $id ): true|WP_Error {
        $post = $this->repository->find( $id );

        if ( ! $post || ! $this->permissions->can_access( $post ) ) {
            return $this->not_found();
        }

        $data = get_post_meta( $id, '_microsite_data', true );
        $type = ( new Catalog() )->type( $data['siteType'] );
        if ( ! empty( $type['administrativePublication'] ) && ! current_user_can( 'manage_options' ) ) {
            return new WP_Error( 'microsite_forbidden', 'Only an administrator can publish this development type.', array( 'status' => 403 ) );
        }

        if ( ! current_user_can( 'publish_ms_sites' ) ) {
            return new WP_Error( 'microsite_forbidden', 'Your account cannot publish projects.', array( 'status' => 403 ) );
        }

        if ( 'granted' !== get_post_meta( $id, self::RIGHT_KEY, true ) ) {
            return new WP_Error( 'microsite_publication_locked', 'Publication access has not been granted for this project. Contact the administrator.', array( 'status' => 403 ) );
        }

        return true;
    }

    private function state( int $id ): array {
        $state = get_post_meta( $id, self::STATE_KEY, true );
        return is_array( $state ) ? $state : array();
    }

    private function snapshot( array $record ): array {
        return array_merge( array(
            'siteType' => $record['siteType'],
            'templateId' => $record['templateId'],
            'templateVersion' => $record['templateVersion'],
            'schemaVersion' => $record['schemaVersion'],
        ), $record['draft'] );
    }

    private function hash( array $snapshot ): string {
        $sort = function ( array $value ) use ( &$sort ): array {
            ksort( $value );

            foreach ( $value as $key => $item ) {
                if ( is_array( $item ) ) {
                    $value[ $key ] = $sort( $item );
                }
            }

            return $value;
        };
        return hash( 'sha256', wp_json_encode( $sort( $snapshot ) ) );
    }

    private function save_state( int $id, array $state ): true|WP_Error {
        // A single metadata value contains state, complete snapshot and date.
        update_post_meta( $id, self::STATE_KEY, wp_slash( $state ) );

        if ( $state !== $this->state( $id ) ) {
            return $this->storage_error();
        }

        return true;
    }

    private function locked( int $id, callable $operation ): mixed {
        return ProjectLock::run( $id, $operation );
    }

    private function not_found(): WP_Error {
        return new WP_Error( 'microsite_not_found', 'Project not found.', array( 'status' => 404 ) );
    }

    private function storage_error(): WP_Error {
        return new WP_Error( 'microsite_storage_error', 'Publication could not be saved.', array( 'status' => 500 ) );
    }
}
