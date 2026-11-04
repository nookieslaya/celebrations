<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class RsvpConfig {
    public static function normalise( array $draft ): array|WP_Error {
        $draft = EventDate::normalise( $draft );

        if ( is_wp_error( $draft ) || ! isset( $draft['content']['rsvp'] ) ) {
            return $draft;
        }

        $configuration = self::normalise_configuration( $draft['content']['event'], $draft['content']['rsvp'] );
        if ( is_wp_error( $configuration ) ) {
            return $configuration;
        }
        $draft['content']['rsvp'] = $configuration;
        return $draft;
    }

    public static function normalise_configuration( array $event, array $configuration, bool $allow_incomplete = false ): array|WP_Error {
        if ( '' === $configuration['deadlineLocal'] ) {
            $configuration['deadlineAt'] = '';
            return $configuration;
        }
        $deadline = EventDate::normalise( array( 'content' => array( 'event' => array_replace( $event, array( 'localDateTime' => $configuration['deadlineLocal'] ) ) ) ) );
        if ( is_wp_error( $deadline ) ) {
            return self::invalid( $deadline->get_error_message() );
        }
        $deadline_at = $deadline['content']['event']['startsAt'];
        $starts_at = $event['startsAt'];
        if ( ( '' === $starts_at && ! $allow_incomplete ) || ( '' !== $starts_at && strcmp( $deadline_at, $starts_at ) > 0 ) ) {
            return self::invalid( 'The RSVP deadline must be on or before the event starts. Complete the event date first.' );
        }
        $configuration['deadlineAt'] = $deadline_at;
        return $configuration;
    }

    private static function invalid( string $message ): WP_Error {
        return new WP_Error(
            'microsite_rsvp_deadline_invalid',
            $message,
            array( 'status' => 400, 'fields' => array( 'content.rsvp.deadlineLocal' => $message ) )
        );
    }
}
