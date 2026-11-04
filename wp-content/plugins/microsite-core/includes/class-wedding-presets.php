<?php

namespace Microsite\Core;

use WP_Error;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class WeddingPresets {
    public static function create( Catalog $catalog, string $id ): array|WP_Error {
        $registry = $catalog->wedding_registry();
        $preset = $registry['styles']['presets'][ $id ] ?? null;

        if ( ! $preset ) {
            return new WP_Error( 'microsite_preset_invalid', 'Choose a registered wedding preset.', array( 'status' => 400 ) );
        }

        $draft = $catalog->type( 'wedding' )['defaults'];
        $defaults = array_column( $draft['sections'], null, 'type' );
        $draft['appearance'] = $preset['appearance'];
        $draft['entrance'] = $preset['entrance'];
        $draft['sections'] = array();

        foreach ( $preset['sections'] as $configuration ) {
            $section = $defaults[ $configuration['type'] ];
            $section['id'] = 'section-' . wp_generate_uuid4();
            $section['enabled'] = $configuration['enabled'];
            $section['variant'] = $configuration['variant'];
            $draft['sections'][] = $section;
        }

        // Blank content: no demo names, dates, venues or private attachment IDs.
        return $draft;
    }
}
