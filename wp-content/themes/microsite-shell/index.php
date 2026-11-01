<?php defined( 'ABSPATH' ) || exit; ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo( 'charset' ); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class(); ?>><?php wp_body_open(); ?>
<main><h1><?php bloginfo( 'name' ); ?></h1>
<p><a href="<?php echo esc_url( home_url( '/app/' ) ); ?>"><?php esc_html_e( 'Open workspace', 'microsite-shell' ); ?></a></p>
<?php while ( have_posts() ) : the_post(); ?><article><h2><?php the_title(); ?></h2><?php the_content(); ?></article><?php endwhile; ?>
</main><?php wp_footer(); ?></body></html>
 