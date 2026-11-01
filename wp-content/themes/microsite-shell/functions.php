<?php
namespace Microsite\Shell;
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
add_action( 'after_setup_theme', static function (): void {
    add_theme_support( 'title-tag' );
    add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
} );
add_action( 'wp_enqueue_scripts', static function (): void {
    wp_enqueue_style( 'microsite-shell', get_stylesheet_uri(), array(), '0.1.0' );
} );
