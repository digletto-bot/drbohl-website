import sharp from 'sharp';

await sharp('assets/images/subpages/bohl100/shop-donauinsel-shirt__1008x1008.avif')
	.resize({ width: 504, height: 504 })
	.toFile('assets/images/subpages/bohl100/shop-donauinsel-shirt__504x504.avif');
