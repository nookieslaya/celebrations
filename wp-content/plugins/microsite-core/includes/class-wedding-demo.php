<?php

namespace Microsite\Core;

use DateTimeImmutable;
use DateTimeZone;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingDemo {
    public const ASSETS = array(
        'couple' => array( 'id' => 2000000001, 'file' => 'couple.jpg', 'alt' => 'A newlywed couple standing together in a sunlit garden.' ),
        'table' => array( 'id' => 2000000002, 'file' => 'table.jpg', 'alt' => 'An outdoor reception table under mature trees with white linen and flowers.' ),
        'bouquet' => array( 'id' => 2000000003, 'file' => 'bouquet.jpg', 'alt' => 'A softly coloured bridal bouquet with roses, peonies and greenery.' ),
    );

    public static function asset_path( string $key ): ?string {
        if ( ! isset( self::ASSETS[ $key ] ) ) {
            return null;
        }

        return dirname( __DIR__ ) . '/assets/wedding-demo/' . self::ASSETS[ $key ]['file'];
    }

    public static function draft( array $identifiers = array(), bool $fresh_ids = false ): array {
        $draft = require __DIR__ . '/data/wedding-demo.php';
        $year = (int) gmdate( 'Y' ) + 1;
        $date = new DateTimeImmutable( $year . '-07-01', new DateTimeZone( 'Europe/London' ) );
        $date = $date->modify( 'third saturday of this month' )->format( 'Y-m-d' );
        $draft['content']['event']['localDateTime'] = $date . 'T15:00';

        foreach ( $draft['content']['venues'] as &$venue ) {
            $venue['event']['localDateTime'] = $date . substr( $venue['event']['localDateTime'], 10 );
        }
        unset( $venue );

        $ids = array();
        foreach ( self::ASSETS as $key => $asset ) {
            $ids[ $key ] = $identifiers[ $key ] ?? $asset['id'];
        }

        foreach ( $draft['sections'] as &$section ) {
            if ( 'rsvp' === $section['type'] ) {
                $section['content']['settings'] = array( 'maxPartySize' => 5, 'deadlineLocal' => '', 'deadlineAt' => '' );
            }
            if ( 'hero' === $section['type'] ) {
                $section['content']['photo'] = array( 'attachmentId' => $ids['couple'], 'alt' => self::ASSETS['couple']['alt'] );
            } elseif ( 'story' === $section['type'] ) {
                $section['content']['photo'] = array( 'attachmentId' => $ids['bouquet'], 'alt' => self::ASSETS['bouquet']['alt'] );
            } elseif ( 'gallery' === $section['type'] ) {
                foreach ( array( 'table', 'bouquet', 'couple' ) as $key ) {
                    $section['content']['photos'][] = array( 'id' => 'photo-' . $key, 'attachmentId' => $ids[ $key ], 'alt' => self::ASSETS[ $key ]['alt'] );
                }
            } elseif ( 'schedule' === $section['type'] ) {
                foreach ( $section['content']['items'] as &$item ) {
                    $item['event']['localDateTime'] = $date . substr( $item['event']['localDateTime'], 10 );
                }
                unset( $item );
            }
        }
        unset( $section );

        if ( $fresh_ids ) {
            $venue_ids = array();
            foreach ( $draft['content']['venues'] as &$venue ) {
                $old = $venue['id'];
                $venue['id'] = 'venue-' . wp_generate_uuid4();
                $venue_ids[ $old ] = $venue['id'];
            }
            unset( $venue );
            foreach ( $draft['sections'] as &$section ) {
                $section['id'] = 'section-' . wp_generate_uuid4();
                if ( 'venues' === $section['type'] ) {
                    $section['content']['venueIds'] = array_map( static function ( string $id ) use ( $venue_ids ): string {
                        return $venue_ids[ $id ];
                    }, $section['content']['venueIds'] );
                }
                foreach ( array( 'items', 'photos', 'links', 'contacts' ) as $list ) {
                    if ( ! isset( $section['content'][ $list ] ) ) {
                        continue;
                    }
                    foreach ( $section['content'][ $list ] as &$item ) {
                        $item['id'] = 'item-' . wp_generate_uuid4();
                        if ( isset( $item['venueId'] ) ) {
                            $item['venueId'] = $venue_ids[ $item['venueId'] ];
                        }
                    }
                    unset( $item );
                }
            }
            unset( $section );
        }

        return $draft;
    }

    public static function media(): array {
        $media = array();
        foreach ( self::ASSETS as $key => $asset ) {
            $image = wp_getimagesize( self::asset_path( $key ) );
            if ( ! $image ) {
                continue;
            }
            $url = plugins_url( 'assets/wedding-demo/' . $asset['file'], dirname( __DIR__ ) . '/microsite-core.php' );
            $media[] = array(
                'id' => $asset['id'],
                'name' => 'Illustrative photograph by Eugenia Remark / Pexels',
                'sizes' => array( 'full' => array( 'url' => $url, 'width' => $image[0], 'height' => $image[1] ) ),
            );
        }
        return $media;
    }
}
