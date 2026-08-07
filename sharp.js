import sharp from 'sharp';

await sharp('assets/images/brochure/hero-duo__1600x1000.avif')
	.resize({ width: 500, height: 312 })
	.toFile('assets/images/brochure/hero-duo__500x312.avif');
