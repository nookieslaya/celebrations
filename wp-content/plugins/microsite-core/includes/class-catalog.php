<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Catalog {
    private array $types;
    private array $templates;

    public function __construct() {
        $schema = json_decode(
            file_get_contents( dirname( __DIR__ ) . '/contracts/basic-page.v1.json' ),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $birthday_schema = json_decode(
            file_get_contents( dirname( __DIR__ ) . '/contracts/birthday-invitation.v1.json' ),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $wedding_schema = json_decode(
            file_get_contents( dirname( __DIR__ ) . '/contracts/wedding.v1.json' ),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $this->types = array(
            'wedding' => array(
                'id' => 'wedding',
                'name' => 'Wedding',
                'availability' => 'development',
                'schemaVersion' => 1,
                'schema' => $wedding_schema,
                'defaults' => self::defaults_from_schema( $wedding_schema ),
                'features' => array(),
                'normalizer' => array( WeddingConfig::class, 'normalise' ),
                'publishRequired' => array(),
            ),
            'birthday-invitation' => array(
                'id'            => 'birthday-invitation',
                'name'          => 'Birthday invitation',
                'schemaVersion' => 1,
                'schema'        => $birthday_schema,
                'defaults'      => $this->defaults_from_schema( $birthday_schema ),
                'features'      => array( 'rsvp' ),
                'normalizer'    => array( RsvpConfig::class, 'normalise' ),
                'publishRequired' => array( 'content.celebrantName', 'content.heading', 'content.message', 'content.event.localDateTime', 'content.event.timeZone', 'content.event.startsAt', 'content.venueName', 'content.address' ),
            ),
            'basic-page' => array(
                'id'            => 'basic-page',
                'name'          => 'Basic page',
                'schemaVersion' => 1,
                'schema'        => $schema,
                'defaults'      => $this->defaults_from_schema( $schema ),
                'publishRequired' => array( 'content.heading' ),
                'features'      => array(),
            ),
        );

        $this->templates = array(
            'modern-editorial' => array(
                'id' => 'modern-editorial',
                'name' => 'Modern Editorial',
                'description' => 'Modern Editorial wedding renderer; administrator-only development preview.',
                'availability' => 'development',
                'version' => '1',
                'siteTypes' => array( 'wedding' ),
                'rendererKey' => 'modern-editorial',
                'rendererImplemented' => true,
                'allowedAppearance' => array(
                    'palette' => $wedding_schema['properties']['appearance']['properties']['palette']['enum'],
                    'fontPair' => $wedding_schema['properties']['appearance']['properties']['fontPair']['enum'],
                ),
            ),
            'birthday-party' => array(
                'id'                => 'birthday-party',
                'version'           => '1',
                'siteTypes'         => array( 'birthday-invitation' ),
                'rendererKey'       => 'birthday-party',
                'name'              => 'Birthday Party',
                'description'       => 'Bold typography, playful colors and a lively birthday reveal.',
                'allowedAppearance' => array(
                    'palette' => array_slice( $birthday_schema['properties']['appearance']['properties']['palette']['enum'], 0, 3 ),
                ),
            ),
            'birthday-celebration' => array(
                'id' => 'birthday-celebration',
                'name' => 'Birthday Celebration',
                'description' => 'An elegant envelope reveal with metallic accents and three evening palettes.',
                'version' => '1',
                'siteTypes' => array( 'birthday-invitation' ),
                'rendererKey' => 'birthday-celebration',
                'defaults' => array( 'appearance' => array( 'palette' => 'midnight-gold' ) ),
                'allowedAppearance' => array(
                    'palette' => array_slice( $birthday_schema['properties']['appearance']['properties']['palette']['enum'], 3 ),
                ),
            ),
            'basic' => array(
                'id'                => 'basic',
                'version'           => '1.0.0',
                'siteTypes'         => array( 'basic-page' ),
                'rendererKey'       => 'basic',
                'name'              => 'Simple Page',
                'description'       => 'A clean, focused page for a personal message or announcement.',
                'allowedAppearance' => array(
                    'accent' => $schema['properties']['appearance']['properties']['accent']['enum'],
                ),
            ),
        );
    }

    public function type( string $id ): ?array {
        return $this->types[ $id ] ?? null;
    }

    public function template( string $id ): ?array {
        return $this->templates[ $id ] ?? null;
    }

    public function public_metadata(): array {
        $types = array();
        $templates = array();

        foreach ( $this->types as $type ) {
            if ( ! $this->is_available( $type ) ) {
                continue;
            }

            $types[] = array(
                'id'            => $type['id'],
                'name'          => $type['name'],
                'schemaVersion' => $type['schemaVersion'],
                'features'      => $type['features'],
                'publishRequired' => $type['publishRequired'],
            );
        }

        $palette_labels = array(
            'electric-citrus' => 'Electric citrus', 'pink-noir' => 'Pink noir',
            'cobalt-pop' => 'Cobalt pop', 'midnight-gold' => 'Midnight Gold',
            'disco-rose' => 'Disco Rose', 'stardust-silver' => 'Stardust Silver',
            'sage' => 'Sage', 'rose' => 'Rose', 'ocean' => 'Ocean',
        );

        foreach ( $this->templates as $template ) {
            if ( ! $this->is_available( $template ) ) {
                continue;
            }

            $type = $this->types[ $template['siteTypes'][0] ];
            $defaults = array_replace_recursive( $type['defaults'], $template['defaults'] ?? array() );
            $demo = $defaults;

            if ( 'birthday-invitation' === $type['id'] ) {
                $demo['content'] = array_replace( $demo['content'], array(
                    'celebrantName' => 'Alex', 'age' => 50,
                    'heading' => 'A night worth celebrating',
                    'message' => 'Fifty years of amazing moments, incredible people and a whole lot to celebrate. Join Alex for a night of good friends, great music and even bigger memories.',
                    'event' => array( 'localDateTime' => '2030-07-18T19:00', 'timeZone' => 'Europe/London', 'startsAt' => '2030-07-18T18:00:00Z' ),
                    'venueName' => 'The Glasshouse', 'address' => 'London, United Kingdom',
                    'dressCode' => 'A little sparkle',
                ) );
                $demo['content']['rsvp']['enabled'] = false;
            } else {
                $demo['content'] = array( 'heading' => 'Good things start here.', 'description' => 'A little space for your next big idea. Share a personal message, a new beginning or something worth remembering.' );
            }

            $thumbnail_urls = array();

            foreach ( array_merge( ...array_values( $template['allowedAppearance'] ) ) as $palette ) {
                $thumbnail_urls[ $palette ] = plugins_url(
                    'assets/template-previews/' . $template['id'] . '-' . $palette . '.png',
                    dirname( __DIR__ ) . '/microsite-core.php'
                );
            }

            $templates[] = array(
                'id'                => $template['id'],
                'version'           => $template['version'],
                'siteTypes'         => $template['siteTypes'],
                'allowedAppearance' => $template['allowedAppearance'],
                'name' => $template['name'],
                'description' => $template['description'],
                'thumbnailUrls' => $thumbnail_urls,
                'thumbnailUrl' => $thumbnail_urls[ array_values( $defaults['appearance'] )[0] ],
                'paletteLabels' => array_intersect_key( $palette_labels, array_flip( array_merge( ...array_values( $template['allowedAppearance'] ) ) ) ),
                'initialDraft' => $defaults,
                'demoDraft' => $demo,
            );
        }

        return array(
            'siteTypes' => $types,
            'templates' => $templates,
        );
    }

    public function is_available( array $definition ): bool {
        return 'available' === ( $definition['availability'] ?? 'available' );
    }

    public function wedding_registry(): array {
        $schema = $this->types['wedding']['schema'];

        return array(
            'sections' => WeddingSections::definitions( $schema ),
            'styles' => WeddingSections::style_registry( $schema ),
        );
    }

    public static function defaults_from_schema( array $schema ): mixed {
        if ( array_key_exists( 'default', $schema ) ) {
            return $schema['default'];
        }

        if ( 'object' !== $schema['type'] ) {
            return $schema['default'];
        }

        $defaults = array();

        foreach ( $schema['properties'] as $key => $property ) {
            if ( 'object' === $property['type'] || array_key_exists( 'default', $property ) ) {
                $defaults[ $key ] = self::defaults_from_schema( $property );
            }
        }

        return $defaults;
    }
}
