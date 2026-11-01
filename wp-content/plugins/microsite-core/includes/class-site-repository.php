<?php

namespace Microsite\Core;

use WP_Error;
use WP_Post;
use WP_Query;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SiteRepository {
    // One metadata envelope keeps draft configuration separate from system fields.
    private const META_KEY = '_microsite_data';

    public function find( int $id ): ?WP_Post {
        $post = get_post( $id );

        if ( ! $post || 'ms_site' !== $post->post_type || 'draft' !== $post->post_status ) {
            return null;
        }

        return $post;
    }

    public function list_for_owner( int $owner, int $page, int $per_page ): array {
        $query = new WP_Query(
            array(
                'post_type'      => 'ms_site',
                'post_status'    => 'draft',
                'author'         => $owner,
                'posts_per_page' => $per_page,
                'paged'          => $page,
                'orderby'        => array( 'date' => 'DESC', 'ID' => 'DESC' ),
            )
        );

        return array(
            'items' => array_map( array( $this, 'to_record' ), $query->posts ),
            'total' => (int) $query->found_posts,
        );
    }

    public function create( int $owner, string $name, array $selection, array $draft ): array|WP_Error {
        $public_id = $this->new_public_id();
        $data = array(
            'publicId'        => $public_id,
            'siteType'        => $selection['type']['id'],
            'templateId'      => $selection['template']['id'],
            'templateVersion' => $selection['template']['version'],
            'schemaVersion'   => $selection['type']['schemaVersion'],
            'draft'           => $draft,
        );

        $id = wp_insert_post(
            wp_slash(
                array(
                    'post_type'     => 'ms_site',
                    'post_status'   => 'draft',
                    'post_author'   => $owner,
                    'post_date_gmt' => current_time( 'mysql', true ),
                    'post_title'    => $name,
                    'post_name'     => $public_id,
                    'meta_input'    => array( self::META_KEY => $data ),
                )
            ),
            true
        );

        if ( is_wp_error( $id ) ) {
            return $this->storage_error();
        }

        return $this->to_record( get_post( $id ) );
    }

    public function update( WP_Post $post, array $changes ): array|WP_Error {
        $data = get_post_meta( $post->ID, self::META_KEY, true );

        if ( array_key_exists( 'draft', $changes ) ) {
            $data['draft'] = $changes['draft'];
        }

        $result = wp_update_post(
            wp_slash(
                array(
                    'ID'         => $post->ID,
                    'post_title' => $changes['name'] ?? $post->post_title,
                    'meta_input' => array( self::META_KEY => $data ),
                )
            ),
            true
        );

        if ( is_wp_error( $result ) ) {
            return $this->storage_error();
        }

        return $this->to_record( get_post( $post->ID ) );
    }

    public function to_record( WP_Post $post ): array {
        $data = get_post_meta( $post->ID, self::META_KEY, true );

        $record = array(
            'id'              => $post->ID,
            'publicId'        => $data['publicId'],
            'name'            => $post->post_title,
            'siteType'        => $data['siteType'],
            'templateId'      => $data['templateId'],
            'templateVersion' => $data['templateVersion'],
            'schemaVersion'   => $data['schemaVersion'],
            'draft'           => $data['draft'],
            'status'          => 'draft',
            'createdAt'       => mysql_to_rfc3339( $post->post_date_gmt ) . 'Z',
            'updatedAt'       => mysql_to_rfc3339( $post->post_modified_gmt ) . 'Z',
        );

        $publication = new Publication( $this, new SiteValidator( new Catalog() ), new Permissions() );
        $record['publication'] = $publication->describe( $record );

        return $record;
    }

    private function new_public_id(): string {
        do {
            $candidate = bin2hex( random_bytes( 16 ) );
            $existing = get_posts(
                array(
                    'post_type'      => 'ms_site',
                    'post_status'    => 'any',
                    'name'           => $candidate,
                    'posts_per_page' => 1,
                    'fields'         => 'ids',
                )
            );
        } while ( $existing );

        return $candidate;
    }

    private function storage_error(): WP_Error {
        return new WP_Error(
            'microsite_storage_error',
            'The draft could not be saved.',
            array( 'status' => 500 )
        );
    }
}
