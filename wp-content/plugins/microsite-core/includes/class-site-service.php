<?php

namespace Microsite\Core;

use WP_Error;
use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SiteService {
    public function __construct(
        private SiteRepository $repository,
        private SiteValidator $validator,
        private Permissions $permissions
    ) {
    }

    public function create( array $payload ): array|WP_Error {
        $valid = $this->validator->payload( $payload, true );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        $selection = $this->validator->selection( $payload['siteType'], $payload['templateId'] );

        if ( is_wp_error( $selection ) ) {
            return $selection;
        }

        if (
            'development' === ( $selection['type']['availability'] ?? 'available' )
            && ! current_user_can( 'manage_options' )
        ) {
            return new WP_Error( 'microsite_type_unavailable', 'This site type is in development.', array( 'status' => 403 ) );
        }

        if ( array_key_exists( 'presetId', $payload ) ) {
            if ( 'wedding' !== $selection['type']['id'] || ! is_string( $payload['presetId'] ) || isset( $payload['draft'] ) ) {
                return new WP_Error( 'microsite_preset_invalid', 'A wedding preset can initialize a new project without an additional draft.', array( 'status' => 400 ) );
            }
            $payload['draft'] = WeddingPresets::create( new Catalog(), $payload['presetId'] );
            if ( is_wp_error( $payload['draft'] ) ) {
                return $payload['draft'];
            }
        } elseif ( 'wedding' === $selection['type']['id'] && ! array_key_exists( 'draft', $payload ) ) {
            $payload['draft'] = WeddingPresets::create( new Catalog(), 'modern-editorial' );
        }

        $draft = array_key_exists( 'draft', $payload )
            ? $payload['draft']
            : $selection['type']['defaults'];
        if ( ! array_key_exists( 'draft', $payload ) && isset( $selection['template']['defaults']['appearance'] ) ) {
            $draft['appearance'] = array_replace( $draft['appearance'], $selection['template']['defaults']['appearance'] );
        }

        $valid = $this->validator->draft( $draft, $selection['type'], $selection['template'] );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        $assets = MediaService::validate_draft( $valid, $selection['type']['id'], get_current_user_id() );

        if ( is_wp_error( $assets ) ) {
            return $assets;
        }

        return $this->repository->create(
            get_current_user_id(),
            $payload['name'],
            $selection,
            $valid
        );
    }

    public function read( int $id ): array|WP_Error {
        $post = $this->accessible_post( $id );

        if ( is_wp_error( $post ) ) {
            return $post;
        }

        return $this->repository->to_record( $post );
    }

    public function update( int $id, array $payload ): array|WP_Error {
        $post = $this->accessible_post( $id );

        if ( is_wp_error( $post ) ) {
            return $post;
        }

        $valid = $this->validator->payload( $payload, false );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        $record = $this->repository->to_record( $post );
        $selection = $this->validator->selection( $record['siteType'], $record['templateId'] );

        if ( is_wp_error( $selection ) ) {
            return $selection;
        }

        $valid = $this->validator->stored_versions( $record, $selection );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        if ( array_key_exists( 'draft', $payload ) ) {
            $valid = $this->validator->draft( $payload['draft'], $selection['type'], $selection['template'] );

            if ( is_wp_error( $valid ) ) {
                return $valid;
            }

            $assets = MediaService::validate_draft( $valid, $record['siteType'], (int) $post->post_author );

            if ( is_wp_error( $assets ) ) {
                return $assets;
            }

            $payload['draft'] = $valid;
        }

        return $this->repository->update( $post, $payload );
    }

    public function preview( int $id ): array|WP_Error {
        $record = $this->read( $id );

        if ( is_wp_error( $record ) ) {
            return $record;
        }

        if ( 'wedding' === $record['siteType'] && ! current_user_can( 'manage_options' ) ) {
            return new WP_Error( 'microsite_type_unavailable', 'Wedding previews are currently available only to administrators.', array( 'status' => 403 ) );
        }

        $selection = $this->validator->selection( $record['siteType'], $record['templateId'] );

        if ( is_wp_error( $selection ) ) {
            return $selection;
        }

        $valid = $this->validator->stored_versions( $record, $selection );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        $draft = $this->validator->draft( $record['draft'], $selection['type'], $selection['template'] );

        if ( is_wp_error( $draft ) ) {
            return $draft;
        }

        $post = $this->repository->find( $id );

        if ( ! $post ) {
            return new WP_Error( 'microsite_not_found', 'Project not found.', array( 'status' => 404 ) );
        }

        if ( 'wedding' === $record['siteType'] ) {
            $record['previewMedia'] = MediaService::preview_assets( $draft, (int) $post->post_author );
        } else {
            $assets = MediaService::validate_draft( $draft, $record['siteType'], (int) $post->post_author );

            if ( is_wp_error( $assets ) ) {
                return $assets;
            }
        }

        $record['draft'] = $draft;

        return $record;
    }

    public function list( int $page, int $per_page ): array {
        $result = $this->repository->list_for_owner( get_current_user_id(), $page, $per_page );

        return array(
            'items'      => $result['items'],
            'pagination' => array(
                'page'       => $page,
                'perPage'    => $per_page,
                'total'      => $result['total'],
                'totalPages' => (int) ceil( $result['total'] / $per_page ),
            ),
        );
    }

    private function accessible_post( int $id ): WP_Post|WP_Error {
        $post = $this->repository->find( $id );

        $data = $post ? get_post_meta( $post->ID, '_microsite_data', true ) : array();
        $development_denied = 'wedding' === ( $data['siteType'] ?? '' ) && ! current_user_can( 'manage_options' );

        if ( ! $post || $development_denied || ! $this->permissions->can_access( $post ) ) {
            return new WP_Error(
                'microsite_not_found',
                'Project not found.',
                array( 'status' => 404 )
            );
        }

        return $post;
    }
}
