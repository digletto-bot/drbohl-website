import sharp from 'sharp';

await sharp(
	'assets/images/subpages/showtime/subpage-showtime-willkommen-oesterreich.avif'
)
	.resize({ width: 640, height: 360 })
	.toFile(
		'assets/images/subpages/showtime/subpage-showtime-willkommen-oesterreich__640x360.avif'
	);
await sharp('assets/images/subpages/showtime/subpage-showtime-was-gibt-es-neues.avif')
	.resize({ width: 640, height: 360 })
	.toFile(
		'assets/images/subpages/showtime/subpage-showtime-was-gibt-es-neues__640x360.avif'
	);
