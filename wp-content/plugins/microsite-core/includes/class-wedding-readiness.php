<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingReadiness {
    public static function check( array $draft, ?int $owner = null ): array|WP_Error {
        $fields = array();
        $required = static function ( string $path, mixed $value, string $message ) use ( &$fields ): void {
            if ( ! is_string( $value ) || '' === trim( $value ) ) {
                $fields[ $path ] = $message;
            }
        };
        $required( 'content.couple.firstName', $draft['content']['couple']['firstName'], 'Enter the first partner name.' );
        $required( 'content.couple.secondName', $draft['content']['couple']['secondName'], 'Enter the second partner name.' );
        $required( 'content.event.localDateTime', $draft['content']['event']['localDateTime'], 'Set the main event date and time.' );
        $required( 'content.event.startsAt', $draft['content']['event']['startsAt'], 'Confirm the main event time in a valid IANA zone.' );
        $registry = ( new Catalog() )->wedding_registry();
        foreach ( array( 'palette' => 'palettes', 'fontPair' => 'fontPairs' ) as $field => $group ) {
            $implemented = array_column( array_filter( $registry['styles'][ $group ], static function ( array $option ): bool {
                return ! empty( $option['rendererImplemented'] );
            } ), 'id' );
            if ( ! in_array( $draft['appearance'][ $field ], $implemented, true ) ) {
                $fields[ 'appearance.' . $field ] = 'Choose an implemented style option.';
            }
        }
        $entrances = array_column( array_filter( $registry['styles']['entrances'], static function ( array $option ): bool {
            return ! empty( $option['rendererImplemented'] );
        } ), 'id' );
        if ( ! in_array( $draft['entrance']['variant'], $entrances, true ) ) {
            $fields['entrance.variant'] = 'Choose an implemented opening.';
        }
        $venues = array_column( $draft['content']['venues'], null, 'id' );
        $venue_complete = static function ( string $id ) use ( $venues, $required ): void {
            if ( isset( $venues[ $id ] ) ) {
                $required( 'content.venues.' . $id . '.name', $venues[ $id ]['name'], 'Enter the selected venue name.' );
                $required( 'content.venues.' . $id . '.address', $venues[ $id ]['address'], 'Enter the selected venue address.' );
            }
        };
        foreach ( $draft['sections'] as $section ) {
            $base = 'sections.' . $section['id'] . '.content';
            $content = $section['content'];
            $definition = $registry['sections'][ $section['type'] ];
            $implemented = array_column( array_filter( $definition['variants'], static function ( array $option ): bool {
                return ! empty( $option['rendererImplemented'] );
            } ), 'id' );
            if ( ! in_array( $section['variant'], $implemented, true ) ) {
                $fields[ 'sections.' . $section['id'] . '.variant' ] = 'Choose an implemented section variant.';
            }
            // Asset references remain access-checked even in disabled sections.
            $photos = array();
            if ( in_array( $section['type'], array( 'hero', 'story' ), true ) && isset( $content['photo'] ) ) {
                $photos[ $base . '.photo' ] = $content['photo'];
            } elseif ( 'gallery' === $section['type'] ) {
                foreach ( $content['photos'] as $photo ) {
                    $photos[ $base . '.photos.' . $photo['id'] ] = $photo;
                }
            }
            if ( null !== $owner ) {
                foreach ( $photos as $path => $photo ) {
                    if ( is_wp_error( MediaService::resolve( $photo['attachmentId'], $owner ) ) ) {
                        $fields[ $path ] = 'Choose an available photo from the project owner library or remove its reference.';
                    }
                }
            }
            if ( ! $section['enabled'] ) {
                continue;
            }
            switch ( $section['type'] ) {
                case 'invitation':
                    $required( $base . '.text', $content['text'], 'Write the invitation text.' );
                    break;
                case 'story':
                    if ( '' === trim( $content['text'] ) && ! isset( $content['photo'] ) ) {
                        $fields[ $base . '.text' ] = 'Add a story or an available photograph.';
                    }
                    break;
                case 'venues':
                    if ( ! $content['venueIds'] ) {
                        $fields[ $base . '.venueIds' ] = 'Select at least one complete venue.';
                    }
                    foreach ( $content['venueIds'] as $id ) {
                        $venue_complete( $id );
                    }
                    break;
                case 'schedule':
                    if ( ! $content['items'] ) {
                        $fields[ $base . '.items' ] = 'Add at least one complete schedule item.';
                    }
                    foreach ( $content['items'] as $item ) {
                        $path = $base . '.items.' . $item['id'];
                        $required( $path . '.title', $item['title'], 'Enter the schedule title.' );
                        $required( $path . '.event.localDateTime', $item['event']['startsAt'], 'Set the schedule date and time.' );
                        if ( isset( $item['venueId'] ) ) {
                            $venue_complete( $item['venueId'] );
                        }
                    }
                    break;
                case 'gallery':
                    if ( ! $content['photos'] ) {
                        $fields[ $base . '.photos' ] = 'Choose at least one allowed photograph.';
                    }
                    break;
                case 'faq':
                case 'guest-info':
                    if ( ! $content['items'] ) {
                        $fields[ $base . '.items' ] = 'Add at least one complete item.';
                    }
                    $keys = 'faq' === $section['type'] ? array( 'question', 'answer' ) : array( 'title', 'text' );
                    foreach ( $content['items'] as $item ) {
                        foreach ( $keys as $key ) {
                            $required( $base . '.items.' . $item['id'] . '.' . $key, $item[ $key ], 'Complete this item or disable the section.' );
                        }
                    }
                    break;
                case 'travel':
                    if ( '' === trim( $content['description'] ) && ! $content['items'] ) {
                        $fields[ $base . '.description' ] = 'Add travel information or a complete option.';
                    }
                    foreach ( $content['items'] as $item ) {
                        foreach ( array( 'name', 'description' ) as $key ) {
                            $required( $base . '.items.' . $item['id'] . '.' . $key, $item[ $key ], 'Complete the travel option.' );
                        }
                    }
                    break;
                case 'gifts':
                    if ( '' === trim( $content['text'] ) && ! $content['links'] ) {
                        $fields[ $base . '.text' ] = 'Add gift information or a complete link.';
                    }
                    foreach ( $content['links'] as $item ) {
                        $required( $base . '.links.' . $item['id'] . '.label', $item['label'], 'Give this link a label.' );
                    }
                    break;
                case 'contact':
                    if ( ! $content['contacts'] ) {
                        $fields[ $base . '.contacts' ] = 'Add at least one contact.';
                    }
                    foreach ( $content['contacts'] as $item ) {
                        $path = $base . '.contacts.' . $item['id'];
                        $required( $path . '.name', $item['name'], 'Enter the contact name.' );
                        if ( empty( $item['email'] ) && empty( $item['phone'] ) ) {
                            $fields[ $path . '.email' ] = 'Provide an email or phone number.';
                        }
                    }
                    break;
                case 'rsvp':
                    if ( ! isset( $content['settings'] ) ) {
                        $fields[ $base . '.settings' ] = 'Enable and configure RSVP for this event, or disable its section.';
                    }
                    break;
            }
        }
        if ( $fields ) {
            return new WP_Error( 'microsite_not_ready', 'Complete the required wedding publication details.', array( 'status' => 422, 'fields' => $fields ) );
        }
        return $draft;
    }
}
