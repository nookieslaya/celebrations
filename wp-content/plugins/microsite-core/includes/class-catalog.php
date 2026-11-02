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

        $this->types = array(
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
            'birthday-party' => array(
                'id'                => 'birthday-party',
                'version'           => '1',
                'siteTypes'         => array( 'birthday-invitation' ),
                'rendererKey'       => 'birthday-party',
                'allowedAppearance' => array(
                    'palette' => array_slice( $birthday_schema['properties']['appearance']['properties']['palette']['enum'], 0, 3 ),
                ),
            ),
            'birthday-celebration' => array(
                'id' => 'birthday-celebration',
                'name' => 'Birthday Celebration',
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
            $types[] = array(
                'id'            => $type['id'],
                'name'          => $type['name'],
                'schemaVersion' => $type['schemaVersion'],
                'features'      => $type['features'],
            );
        }

        foreach ( $this->templates as $template ) {
            $templates[] = array(
                'id'                => $template['id'],
                'version'           => $template['version'],
                'siteTypes'         => $template['siteTypes'],
                'allowedAppearance' => $template['allowedAppearance'],
            );
        }

        return array(
            'siteTypes' => $types,
            'templates' => $templates,
        );
    }

    private function defaults_from_schema( array $schema ): mixed {
        if ( 'object' !== $schema['type'] ) {
            return $schema['default'];
        }

        $defaults = array();

        foreach ( $schema['properties'] as $key => $property ) {
            if ( 'object' === $property['type'] || array_key_exists( 'default', $property ) ) {
                $defaults[ $key ] = $this->defaults_from_schema( $property );
            }
        }

        return $defaults;
    }
}
