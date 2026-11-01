<?php
namespace Microsite\Core;

defined( 'ABSPATH' ) || exit;

final class App {
 public static function boot(): void {
  add_action( 'init', array( self::class, 'rewrites' ) );
  add_filter( 'query_vars', static function ( array $vars ): array {
   $vars[] = 'microsite_app';
   return $vars;
  } );
  add_action( 'template_redirect', array( self::class, 'render' ), 0 );
 }
 public static function rewrites(): void {
  add_rewrite_rule( '^app(?:/.*)?/?$', 'index.php?microsite_app=1', 'top' );
 }
 public static function activate(): void {
  self::rewrites();
  flush_rewrite_rules( false );
 }
 public static function deactivate(): void {
  global $wp_rewrite;
  unset( $wp_rewrite->extra_rules_top['^app(?:/.*)?/?$'] );
  flush_rewrite_rules( false );
 }
 public static function render(): void {
  if ( ! get_query_var( 'microsite_app' ) ) {
   return;
  }
  status_header( 200 );
  nocache_headers();
  header( 'X-Robots-Tag: noindex, nofollow', true );
  $base = plugin_dir_url( dirname( __FILE__ ) ) . 'app/';
  $dev = null;
  $marker = dirname( __DIR__ ) . '/app/.vite-dev.json';
  if ( 'local' === wp_get_environment_type() && is_readable( $marker ) ) {
   $candidate = json_decode( file_get_contents( $marker ), true );
   if ( isset( $candidate['origin'] ) && preg_match( '#^https?://(localhost|127\.0\.0\.1):[0-9]+$#', $candidate['origin'] ) ) {
    $dev = $candidate['origin'];
   }
  }
  $manifest_path = dirname( __DIR__ ) . '/app/dist/.vite/manifest.json';
  $manifest = is_readable( $manifest_path ) ? json_decode( file_get_contents( $manifest_path ), true ) : array();
  $entry = $manifest['src/main.tsx'] ?? null;
  if ( ! $dev && ! $entry ) {
   status_header( 503 );
  }
  $config = array( 'appUrl' => home_url( '/app/' ), 'restUrl' => rest_url(), 'mode' => $dev ? 'development' : 'production' );
  require dirname( __DIR__ ) . '/templates/app.php';
  exit;
 }
}
