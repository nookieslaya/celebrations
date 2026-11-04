<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Trusted definitions; section identifiers never resolve executable code. */
final class WeddingSections {
    public static function definitions( array $schema ): array {
        $names = array(
            'hero' => 'Hero',
            'invitation' => 'Invitation',
            'countdown' => 'Countdown',
            'venues' => 'Venues',
            'schedule' => 'Schedule',
            'story' => 'Our story',
            'gallery' => 'Gallery',
            'guest-info' => 'Guest information',
            'travel' => 'Travel and accommodation',
            'gifts' => 'Gifts',
            'faq' => 'Questions and answers',
            'rsvp' => 'RSVP',
            'contact' => 'Contact',
            'footer' => 'Footer',
        );
        $definitions = array();

        foreach ( $schema['properties']['sections']['items']['oneOf'] as $contract ) {
            $properties = $contract['properties'];
            $type = $properties['type']['enum'][0];
            $position = 'movable';

            if ( 'hero' === $type ) {
                $position = 'first';
            } elseif ( 'footer' === $type ) {
                $position = 'last';
            }

            $definitions[ $type ] = array(
                'type' => $type,
                'name' => $names[ $type ],
                'contract' => $properties['content'],
                'defaults' => array_intersect_key(
                    Catalog::defaults_from_schema( $properties['content'] ),
                    array_flip( $properties['content']['required'] )
                ),
                'variants' => array_map( static function ( string $id ): array {
                    return array( 'id' => $id, 'availability' => 'development', 'rendererImplemented' => true );
                }, $properties['variant']['enum'] ),
                'canDisable' => 'movable' === $position,
                'position' => $position,
            );
        }

        return $definitions;
    }

    public static function editor_options( array $schema ): array {
        $labels = array(
            'photo-full' => array( 'Full photograph', 'Names and date over a large photograph.' ),
            'split' => array( 'Split composition', 'A photograph beside spacious editorial typography.' ),
            'typography' => array( 'Typography', 'Names, a fine line and a quiet typographic composition.' ),
            'ivory-ink' => array( 'Ivory & Ink', 'Warm ivory with ink-black type and muted brass accents.' ),
            'sage-linen' => array( 'Sage & Linen', 'Soft linen with deep green type.' ),
            'rose-stone' => array( 'Rose & Cocoa', 'Pale rose with warm cocoa type.' ),
            'editorial-serif' => array( 'Cormorant Garamond + Manrope', 'Expressive serif with a clean everyday sans.' ),
            'modern-romantic' => array( 'Libre Baskerville + Source Sans 3', 'Quiet book typography with a humanist sans.' ),
            'timeless-classic' => array( 'Playfair Display + Inter', 'Classic contrast with a precise modern sans.' ),
            'reveal' => array( 'Quiet reveal', 'A gentle, automatic reveal in about one second.' ),
            'envelope' => array( 'An invitation to open', 'A layered envelope with Open invitation and Skip intro.' ),
        );
        $options = static function ( array $ids ) use ( $labels ): array {
            return array_map( static function ( string $id ) use ( $labels ): array {
                return array( 'id' => $id, 'name' => $labels[ $id ][0], 'description' => $labels[ $id ][1] );
            }, $ids );
        };
        $hero = self::definitions( $schema )['hero'];
        return array(
            'heroVariants' => $options( array_column( $hero['variants'], 'id' ) ),
            'palettes' => $options( $schema['properties']['appearance']['properties']['palette']['enum'] ),
            'fontPairs' => $options( $schema['properties']['appearance']['properties']['fontPair']['enum'] ),
            'entrances' => $options( $schema['properties']['entrance']['properties']['variant']['enum'] ),
        );
    }

    public static function style_registry( array $schema ): array {
        $options = static function ( array $identifiers, bool $implemented ): array {
            return array_map( static function ( string $id ) use ( $implemented ): array {
                return array( 'id' => $id, 'availability' => 'development', 'rendererImplemented' => $implemented );
            }, $identifiers );
        };

        return array(
            'palettes' => $options( $schema['properties']['appearance']['properties']['palette']['enum'], true ),
            'fontPairs' => $options( $schema['properties']['appearance']['properties']['fontPair']['enum'], true ),
            'entrances' => $options( $schema['properties']['entrance']['properties']['variant']['enum'], true ),
            'presets' => array(
                'modern-editorial' => array(
                    'id' => 'modern-editorial',
                    'name' => 'Modern Editorial',
                    'description' => 'A fresh editorial page with empty personal details.',
                    'rendererImplemented' => true,
                    'availability' => 'development',
                    'appearance' => Catalog::defaults_from_schema( $schema['properties']['appearance'] ),
                    'entrance' => Catalog::defaults_from_schema( $schema['properties']['entrance'] ),
                    // Only initial layout/style, never client content or a renderer copy.
                    'sections' => array_map( static function ( array $section ): array {
                        return array_intersect_key( $section, array_flip( array( 'id', 'type', 'variant', 'enabled' ) ) );
                    }, $schema['properties']['sections']['default'] ),
                ),
            ),
        );
    }
}
