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

    public static function style_registry( array $schema ): array {
        $options = static function ( array $identifiers, bool $implemented ): array {
            return array_map( static function ( string $id ) use ( $implemented ): array {
                return array( 'id' => $id, 'availability' => 'development', 'rendererImplemented' => $implemented );
            }, $identifiers );
        };

        return array(
            'palettes' => $options( $schema['properties']['appearance']['properties']['palette']['enum'], true ),
            'fontPairs' => $options( $schema['properties']['appearance']['properties']['fontPair']['enum'], true ),
            'entrances' => $options( $schema['properties']['entrance']['properties']['variant']['enum'], false ),
            'presets' => array(
                'modern-editorial' => array(
                    'id' => 'modern-editorial',
                    'name' => 'Modern Editorial',
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
