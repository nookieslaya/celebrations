<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SiteValidator {
    public function __construct( private Catalog $catalog ) {
    }

    public function payload( array $payload, bool $creating ): true|WP_Error {
        $allowed = $creating
            ? array( 'name', 'siteType', 'templateId', 'draft' )
            : array( 'name', 'draft' );

        foreach ( array_keys( $payload ) as $key ) {
            if ( ! in_array( $key, $allowed, true ) ) {
                return $this->invalid( 'Unknown or immutable field: ' . $key );
            }
        }

        if ( $creating ) {
            foreach ( array( 'name', 'siteType', 'templateId' ) as $key ) {
                if ( ! array_key_exists( $key, $payload ) ) {
                    return $this->invalid( 'Missing field: ' . $key );
                }
            }
        }

        if ( ! $creating && array() === $payload ) {
            return $this->invalid( 'Provide name or draft.' );
        }

        if ( array_key_exists( 'name', $payload ) ) {
            $result = rest_validate_value_from_schema(
                $payload['name'],
                array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 120 ),
                'name'
            );

            if ( is_wp_error( $result ) || '' === trim( (string) $payload['name'] ) ) {
                return $this->invalid( 'Project name must contain between 1 and 120 characters.' );
            }

            if ( ! $this->plain_text( $payload['name'] ) ) {
                return $this->invalid( 'Project name must be plain text.' );
            }
        }

        return true;
    }

    public function selection( mixed $site_type, mixed $template_id ): array|WP_Error {
        if ( ! is_string( $site_type ) || ! is_string( $template_id ) ) {
            return $this->invalid( 'siteType and templateId must be strings.' );
        }

        $type = $this->catalog->type( $site_type );
        $template = $this->catalog->template( $template_id );

        if ( ! $type || ! $template || ! in_array( $site_type, $template['siteTypes'], true ) ) {
            return $this->invalid( 'Unknown or incompatible site type and template.' );
        }

        return array( 'type' => $type, 'template' => $template );
    }

    public function draft( mixed $draft, array $type, array $template ): true|WP_Error {
        $valid = rest_validate_value_from_schema( $draft, $type['schema'], 'draft' );

        if ( is_wp_error( $valid ) ) {
            return $this->invalid( $valid->get_error_message() );
        }

        if ( ! $this->plain_text( $draft ) ) {
            return $this->invalid( 'Content must be plain text, without HTML, encoded HTML or control characters.' );
        }

        foreach ( $template['allowedAppearance'] as $key => $allowed_values ) {
            if ( ! in_array( $draft['appearance'][ $key ] ?? null, $allowed_values, true ) ) {
                return $this->invalid( 'Appearance is not supported by the selected template.' );
            }
        }

        return true;
    }

    public function stored_versions( array $record, array $selection ): true|WP_Error {
        if (
            $record['schemaVersion'] !== $selection['type']['schemaVersion']
            || $record['templateVersion'] !== $selection['template']['version']
        ) {
            return new WP_Error(
                'microsite_version_conflict',
                'This draft requires an explicit version migration before it can be edited.',
                array( 'status' => 409 )
            );
        }

        return true;
    }

    private function plain_text( mixed $value ): bool {
        if ( is_array( $value ) ) {
            foreach ( $value as $item ) {
                if ( ! $this->plain_text( $item ) ) {
                    return false;
                }
            }

            return true;
        }

        if ( ! is_string( $value ) ) {
            return true;
        }

        $decoded = html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

        return ! preg_match( '/[<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $decoded );
    }

    private function invalid( string $message ): WP_Error {
        return new WP_Error( 'microsite_validation_error', $message, array( 'status' => 400 ) );
    }
}
