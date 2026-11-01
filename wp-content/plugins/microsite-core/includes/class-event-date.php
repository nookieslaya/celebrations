<?php

namespace Microsite\Core;

use DateTimeImmutable;
use DateTimeZone;
use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class EventDate {
    public static function normalise( array $draft ): array|WP_Error {
        $event = $draft['content']['event'];

        if ( ! in_array( $event['timeZone'], DateTimeZone::listIdentifiers( DateTimeZone::ALL_WITH_BC ), true ) ) {
            return self::error( 'Choose a valid IANA time zone, for example Europe/London.' );
        }

        if ( '' === $event['localDateTime'] ) {
            $draft['content']['event']['startsAt'] = '';
            return $draft;
        }

        $utc = new DateTimeZone( 'UTC' );
        $wall_time = DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i', $event['localDateTime'], $utc );

        if (
            ! $wall_time
            || $wall_time->format( 'Y-m-d\TH:i' ) !== $event['localDateTime']
            || (int) $wall_time->format( 'Y' ) < 1900
            || (int) $wall_time->format( 'Y' ) > 2200
        ) {
            return self::error( 'Enter a valid local date and time between 1900 and 2200.' );
        }

        $zone = new DateTimeZone( $event['timeZone'] );
        $wall_timestamp = $wall_time->getTimestamp();
        $transitions = $zone->getTransitions( $wall_timestamp - 3 * DAY_IN_SECONDS, $wall_timestamp + 3 * DAY_IN_SECONDS );
        $offsets = array_unique( array_column( $transitions, 'offset' ) );
        $candidates = array();

        foreach ( $offsets as $offset ) {
            $candidate = $wall_time->setTimestamp( $wall_timestamp - $offset );

            if ( $candidate->setTimezone( $zone )->format( 'Y-m-d\TH:i' ) === $event['localDateTime'] ) {
                $candidates[] = $candidate;
            }
        }

        if ( 0 === count( $candidates ) ) {
            return self::error( 'This local time does not exist because the clocks move forward. Choose another time.' );
        }

        if ( count( $candidates ) > 1 ) {
            return self::error( 'This local time occurs twice because the clocks move back. Choose an unambiguous time.' );
        }

        // The browser's UTC value is never trusted; local time + IANA are authoritative.
        $draft['content']['event']['startsAt'] = $candidates[0]->format( 'Y-m-d\TH:i:s\Z' );

        return $draft;
    }

    private static function error( string $message ): WP_Error {
        return new WP_Error( 'microsite_event_time_invalid', $message, array( 'status' => 400 ) );
    }
}
