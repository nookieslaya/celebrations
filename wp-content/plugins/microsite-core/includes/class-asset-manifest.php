<?php

namespace Microsite\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class AssetManifest {
    /** Include CSS owned by statically imported chunks as well as entry CSS. */
    public static function entry( array $manifest, string $key ): ?array {
        if ( ! isset( $manifest[ $key ] ) ) {
            return null;
        }

        $visited = array();
        $css = array();
        $visit = static function ( string $name ) use ( &$visit, &$visited, &$css, $manifest ): void {
            if ( isset( $visited[ $name ] ) || ! isset( $manifest[ $name ] ) ) {
                return;
            }
            $visited[ $name ] = true;
            $chunk = $manifest[ $name ];

            foreach ( $chunk['imports'] ?? array() as $import ) {
                $visit( $import );
            }

            foreach ( $chunk['css'] ?? array() as $file ) {
                $css[ $file ] = $file;
            }
        };
        $visit( $key );
        $entry = $manifest[ $key ];
        $entry['css'] = array_values( $css );
        return $entry;
    }
}
