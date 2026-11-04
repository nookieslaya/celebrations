<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class SitePresentation {
    public static function metadata( array $snapshot ): array {
        if ( 'wedding' !== $snapshot['siteType'] ) {
            return array(
                'title' => $snapshot['content']['heading'],
                'description' => $snapshot['content']['message'] ?? $snapshot['content']['description'] ?? '',
            );
        }
        $couple = $snapshot['content']['couple'];
        $description = '';
        foreach ( $snapshot['sections'] as $section ) {
            if ( $section['enabled'] && 'invitation' === $section['type'] ) {
                $description = mb_substr( preg_replace( '/\s+/u', ' ', $section['content']['text'] ), 0, 240 );
                break;
            }
        }
        return array( 'title' => $couple['firstName'] . ' & ' . $couple['secondName'] . ' — Wedding', 'description' => $description );
    }
}
