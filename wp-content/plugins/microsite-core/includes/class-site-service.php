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

        $draft = array_key_exists( 'draft', $payload )
            ? $payload['draft']
            : $selection['type']['defaults'];
        $valid = $this->validator->draft( $draft, $selection['type'], $selection['template'] );

        if ( is_wp_error( $valid ) ) {
            return $valid;
        }

        return $this->repository->create(
            get_current_user_id(),
            $payload['name'],
            $selection,
            $draft
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
        }

        return $this->repository->update( $post, $payload );
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

        if ( ! $post || ! $this->permissions->can_access( $post ) ) {
            return new WP_Error(
                'microsite_not_found',
                'Project not found.',
                array( 'status' => 404 )
            );
        }

        return $post;
    }
}
