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

        $configuration = $draft['content']['rsvp'];

        if ( '' === $configuration['deadlineLocal'] ) {
            $draft['content']['rsvp']['deadlineAt'] = '';
            return $draft;
        }

        // Reuse the event's existing calendar, IANA and DST validation.
        $deadline = $draft;
        $deadline['content']['event']['localDateTime'] = $configuration['deadlineLocal'];
        $deadline = EventDate::normalise( $deadline );

        if ( is_wp_error( $deadline ) ) {
            return self::invalid( $deadline->get_error_message() );
        }

        $deadline_at = $deadline['content']['event']['startsAt'];
        $starts_at = $draft['content']['event']['startsAt'];

        if ( '' === $starts_at || strcmp( $deadline_at, $starts_at ) > 0 ) {
            return self::invalid( 'The RSVP deadline must be on or before the event starts. Complete the event date first.' );
        }

        $draft['content']['rsvp']['deadlineAt'] = $deadline_at;
        return $draft;
    }

    private static function invalid( string $message ): WP_Error {
        return new WP_Error(
            'microsite_rsvp_deadline_invalid',
            $message,
            array( 'status' => 400, 'fields' => array( 'content.rsvp.deadlineLocal' => $message ) )
        );
    }
}
