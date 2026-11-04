<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Type-specific interpretation only; response storage/security remain shared. */
final class RsvpContext {
    public static function resolve( ?array $snapshot ): array {
        $context = array( 'supported' => false, 'enabled' => false, 'configuration' => null, 'event' => null, 'eventName' => null );
        if ( ! $snapshot ) {
            return $context;
        }
        if ( 'birthday-invitation' === $snapshot['siteType'] ) {
            $configuration = $snapshot['content']['rsvp'] ?? null;
            return array_replace( $context, array(
                'supported' => true,
                'enabled' => $configuration && $configuration['enabled'],
                'configuration' => $configuration,
                'event' => $snapshot['content']['event'] ?? null,
            ) );
        }
        if ( 'wedding' === $snapshot['siteType'] ) {
            $section = null;
            foreach ( $snapshot['sections'] ?? array() as $candidate ) {
                if ( 'rsvp' === $candidate['type'] ) {
                    $section = $candidate;
                    break;
                }
            }
            $configuration = $section['content']['settings'] ?? null;
            $names = $snapshot['content']['couple'];
            return array_replace( $context, array(
                'supported' => true,
                'enabled' => $configuration && ! empty( $section['enabled'] ),
                'configuration' => $configuration,
                'event' => $snapshot['content']['event'],
                'eventName' => trim( $names['firstName'] . ' & ' . $names['secondName'] ),
            ) );
        }
        return $context;
    }
}
