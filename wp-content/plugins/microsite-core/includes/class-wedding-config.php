<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingConfig {
    public static function normalise( array $draft ): array|WP_Error {
        $venue_ids = array();

        foreach ( $draft['content']['venues'] as $index => $venue ) {
            if ( in_array( $venue['id'], $venue_ids, true ) ) {
                return self::error( 'Venue IDs must be unique.' );
            }

            $venue_ids[] = $venue['id'];

            if ( isset( $venue['event'] ) ) {
                $event = self::event( $venue['event'] );

                if ( is_wp_error( $event ) ) {
                    return $event;
                }

                $draft['content']['venues'][ $index ]['event'] = $event;
            }
        }

        $event = self::event( $draft['content']['event'] );

        if ( is_wp_error( $event ) ) {
            return $event;
        }

        $draft['content']['event'] = $event;
        $types = array();
        $ids = array();
        $last = count( $draft['sections'] ) - 1;

        foreach ( $draft['sections'] as $index => $section ) {
            if ( in_array( $section['id'], $ids, true ) || in_array( $section['type'], $types, true ) ) {
                return self::error( 'Section IDs and section types must be unique.' );
            }

            $ids[] = $section['id'];
            $types[] = $section['type'];

            if (
                ( 'hero' === $section['type'] && ( 0 !== $index || ! $section['enabled'] ) )
                || ( 'footer' === $section['type'] && ( $last !== $index || ! $section['enabled'] ) )
            ) {
                return self::error( 'Hero must be first, footer last, and both must be enabled.' );
            }

            $content = $section['content'];

            if ( 'venues' === $section['type'] ) {
                if ( count( $content['venueIds'] ) !== count( array_unique( $content['venueIds'] ) ) ) {
                    return self::error( 'Selected venue references must be unique.' );
                }

                foreach ( $content['venueIds'] as $venue_id ) {
                    if ( ! in_array( $venue_id, $venue_ids, true ) ) {
                        return self::error( 'Selected venue does not exist in this draft.' );
                    }
                }
            }

            foreach ( array( 'items', 'photos', 'links', 'contacts' ) as $list_key ) {
                if ( ! isset( $content[ $list_key ] ) ) {
                    continue;
                }

                $item_ids = array_column( $content[ $list_key ], 'id' );

                if ( count( $item_ids ) !== count( array_unique( $item_ids ) ) ) {
                    return self::error( 'List item IDs must be unique within their section.' );
                }

                foreach ( $content[ $list_key ] as $item_index => $item ) {
                    if ( isset( $item['url'] ) && ! self::safe_url( $item['url'] ) ) {
                        return self::error( 'Links must be absolute HTTP(S) URLs without credentials.' );
                    }

                    if ( 'schedule' !== $section['type'] ) {
                        continue;
                    }

                    if ( isset( $item['venueId'] ) && ! in_array( $item['venueId'], $venue_ids, true ) ) {
                        return self::error( 'Schedule venue does not exist in this draft.' );
                    }

                    $item_event = self::event( $item['event'] );

                    if ( is_wp_error( $item_event ) ) {
                        return $item_event;
                    }

                    $draft['sections'][ $index ]['content'][ $list_key ][ $item_index ]['event'] = $item_event;
                }
            }
        }

        if ( ! in_array( 'hero', $types, true ) || ! in_array( 'footer', $types, true ) ) {
            return self::error( 'Hero and footer are required.' );
        }

        // Project-aware asset authorization is enforced by MediaService after normalization.
        return $draft;
    }

    private static function event( array $event ): array|WP_Error {
        $normalised = EventDate::normalise( array( 'content' => array( 'event' => $event ) ) );

        if ( is_wp_error( $normalised ) ) {
            return $normalised;
        }

        return $normalised['content']['event'];
    }

    private static function safe_url( string $url ): bool {
        $parts = wp_parse_url( $url );

        return is_array( $parts )
            && in_array( strtolower( $parts['scheme'] ?? '' ), array( 'http', 'https' ), true )
            && ! empty( $parts['host'] )
            && ! isset( $parts['user'] )
            && ! isset( $parts['pass'] )
            && ! preg_match( '/[\\\\\x00-\x20\x7F]/', $url )
            && false !== filter_var( $url, FILTER_VALIDATE_URL );
    }

    private static function error( string $message ): WP_Error {
        return new WP_Error( 'microsite_wedding_invalid', $message, array( 'status' => 400 ) );
    }
}
