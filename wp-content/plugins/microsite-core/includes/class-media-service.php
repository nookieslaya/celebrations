<?php

namespace Microsite\Core;

use WP_Error;
use WP_Post;
use WP_Query;
use WP_REST_Request;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Application assets use WP attachments, with an explicit module and owner boundary. */
final class MediaService {
    private const OWNER_KEY = '_microsite_asset_owner';

    public static function limits(): array {
        return array(
            'maxBytes' => min( 10 * MB_IN_BYTES, wp_max_upload_size(), max( 1, (int) apply_filters( 'microsite_media_max_bytes', 10 * MB_IN_BYTES ) ) ),
            'maxPixels' => min( 25000000, max( 1, (int) apply_filters( 'microsite_media_max_pixels', 25000000 ) ) ),
            'maxFiles' => min( 50, max( 1, (int) apply_filters( 'microsite_media_max_files', 50 ) ) ),
        );
    }

    public static function exclude_from_core_rest( array $arguments ): array {
        $conditions = array(
            'relation' => 'AND',
            array( 'key' => self::OWNER_KEY, 'compare' => 'NOT EXISTS' ),
        );

        if ( ! empty( $arguments['meta_query'] ) ) {
            $conditions[] = $arguments['meta_query'];
        }

        $arguments['meta_query'] = $conditions;
        return $arguments;
    }

    public static function guard_core_rest( mixed $result, $server, WP_REST_Request $request ): mixed {
        if (
            preg_match( '#^/wp/v2/media/([1-9][0-9]*)(?:/|$)#', $request->get_route(), $matches )
            && metadata_exists( 'post', (int) $matches[1], self::OWNER_KEY )
        ) {
            // Module DTOs are available only through project-scoped routes, including to admins.
            return self::not_found();
        }

        return $result;
    }

    public static function project( int $id ): WP_Post|WP_Error {
        $permissions = new Permissions();
        $allowed = $permissions->require_capability( 'edit_ms_sites' );

        if ( is_wp_error( $allowed ) ) {
            return $allowed;
        }

        $post = ( new SiteRepository() )->find( $id );

        if ( ! $post || ! $permissions->can_access( $post ) ) {
            return self::not_found();
        }

        return $post;
    }

    public static function list( int $owner, int $page ): array {
        $query = new WP_Query( array(
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'author' => $owner,
            'meta_key' => self::OWNER_KEY,
            'meta_value' => (string) $owner,
            'posts_per_page' => 12,
            'paged' => $page,
            'orderby' => array( 'date' => 'DESC', 'ID' => 'DESC' ),
        ) );
        $items = array();

        foreach ( $query->posts as $post ) {
            $asset = self::resolve( $post->ID, $owner );

            if ( ! is_wp_error( $asset ) ) {
                $items[] = $asset;
            }
        }

        return array(
            'items' => $items,
            'pagination' => array( 'page' => $page, 'totalPages' => (int) $query->max_num_pages, 'total' => (int) $query->found_posts ),
            'limits' => self::limits(),
        );
    }

    public static function resolve( int $id, int $owner ): array|WP_Error {
        $attachment = get_post( $id );

        if (
            ! $attachment
            || 'attachment' !== $attachment->post_type
            || 'inherit' !== $attachment->post_status
            || $owner !== (int) $attachment->post_author
            || (string) $owner !== (string) get_post_meta( $id, self::OWNER_KEY, true )
            || ! in_array( $attachment->post_mime_type, array( 'image/jpeg', 'image/png', 'image/webp' ), true )
        ) {
            return self::not_found();
        }

        $sizes = array();

        foreach ( array( 'thumbnail', 'medium', 'large', 'full' ) as $size ) {
            $image = wp_get_attachment_image_src( $id, $size );

            if ( $image ) {
                $sizes[ $size ] = array( 'url' => $image[0], 'width' => $image[1], 'height' => $image[2] );
            }
        }

        if ( ! isset( $sizes['full'] ) ) {
            return self::not_found();
        }

        return array( 'id' => $id, 'name' => $attachment->post_title, 'sizes' => $sizes );
    }

    public static function validate_draft( array $draft, string $site_type, int $owner ): true|WP_Error {
        if ( 'wedding' !== $site_type ) {
            return true;
        }

        foreach ( $draft['sections'] as $section ) {
            $photos = array();

            if ( in_array( $section['type'], array( 'hero', 'story' ), true ) && isset( $section['content']['photo'] ) ) {
                $photos[] = $section['content']['photo'];
            } elseif ( 'gallery' === $section['type'] ) {
                $photos = $section['content']['photos'];
            }

            foreach ( $photos as $photo ) {
                $asset = self::resolve( $photo['attachmentId'], $owner );

                if ( is_wp_error( $asset ) ) {
                    return new WP_Error( 'microsite_media_unavailable', 'A selected photo is unavailable for this project. Choose a photo from the project owner library or remove its reference.', array( 'status' => 400 ) );
                }
            }
        }

        return true;
    }

    public static function upload( int $owner, array $file ): array|WP_Error {
        global $wpdb;
        $limits = self::limits();

        if ( UPLOAD_ERR_OK !== ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) || ! isset( $file['tmp_name'], $file['name'] ) || ! is_string( $file['name'] ) ) {
            return new WP_Error( 'microsite_upload_failed', 'Upload failed. Check the file and hosting upload limits.', array( 'status' => 400 ) );
        }

        $temporary = $file['tmp_name'];

        if ( ! is_string( $temporary ) || ! is_uploaded_file( $temporary ) ) {
            return new WP_Error( 'microsite_upload_invalid', 'A valid uploaded file is required.', array( 'status' => 400 ) );
        }

        $bytes = filesize( $temporary );

        if ( false === $bytes || 0 === $bytes || $bytes > $limits['maxBytes'] ) {
            return new WP_Error( 'microsite_upload_size', 'The photo exceeds the upload size limit.', array( 'status' => 413 ) );
        }

        // Read headers/dimensions before WordPress decodes or creates image variants.
        $image = wp_getimagesize( $temporary );
        $mime = wp_get_image_mime( $temporary );
        $mimes = array( 'jpg|jpeg|jpe' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp' );
        $checked = wp_check_filetype_and_ext( $temporary, $file['name'], $mimes );
        $extension = wp_check_filetype( $file['name'], $mimes );

        if (
            ! $image || ! in_array( $mime, array_values( $mimes ), true )
            || $mime !== $extension['type'] || $mime !== $checked['type']
            || ! empty( $checked['proper_filename'] ) || ! wp_image_editor_supports( array( 'mime_type' => $mime ) )
        ) {
            return new WP_Error( 'microsite_upload_format', 'Choose a valid JPEG, PNG or WebP image with a matching extension supported by this host.', array( 'status' => 400 ) );
        }

        if ( $image[0] < 1 || $image[1] < 1 || $image[0] > $limits['maxPixels'] / $image[1] ) {
            return new WP_Error( 'microsite_upload_pixels', 'The photo exceeds this library pixel limit.', array( 'status' => 400 ) );
        }

        // Use WordPress' decoder to reject corrupt images after the cheap dimension gate.
        $editor = wp_get_image_editor( $temporary );

        if ( is_wp_error( $editor ) ) {
            return new WP_Error( 'microsite_upload_corrupt', 'WordPress cannot decode this image.', array( 'status' => 400 ) );
        }

        unset( $editor );

        // Owner-scoped lock prevents parallel uploads from exceeding the library quota.
        $key = 'microsite-media:' . substr( hash( 'sha256', DB_NAME . ':' . $wpdb->prefix . ':' . $owner ), 0, 40 );
        $acquired = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 0)', $key ) );

        if ( '1' !== (string) $acquired ) {
            return new WP_Error( 'microsite_media_busy', 'Another upload is running for this library. Try again.', array( 'status' => 409 ) );
        }

        try {
            $count = new WP_Query( array(
                'post_type' => 'attachment', 'post_status' => array_keys( get_post_stati() ), 'author' => $owner,
                'meta_key' => self::OWNER_KEY, 'meta_value' => (string) $owner,
                'fields' => 'ids', 'posts_per_page' => 1,
            ) );

            if ( $count->found_posts >= $limits['maxFiles'] ) {
                return new WP_Error( 'microsite_media_limit', 'This owner library has reached its application photo limit.', array( 'status' => 409 ) );
            }

            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';

            $previous = $_FILES['microsite_photo'] ?? null;
            $_FILES['microsite_photo'] = $file;

            try {
                $id = media_handle_upload( 'microsite_photo', 0, array(
                    'post_author' => $owner,
                    'post_status' => 'inherit',
                    'meta_input' => array( self::OWNER_KEY => $owner ),
                ), array( 'test_form' => false, 'mimes' => $mimes ) );
            } finally {
                if ( null === $previous ) {
                    unset( $_FILES['microsite_photo'] );
                } else {
                    $_FILES['microsite_photo'] = $previous;
                }
            }

            if ( is_wp_error( $id ) ) {
                return new WP_Error( 'microsite_upload_failed', 'WordPress could not process this image. Check its format and hosting limits.', array( 'status' => 400 ) );
            }

            return self::resolve( $id, $owner );
        } finally {
            $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $key ) );
        }
    }

    private static function not_found(): WP_Error {
        return new WP_Error( 'microsite_media_not_found', 'Photo or project not found.', array( 'status' => 404 ) );
    }
}
