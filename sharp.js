import sharp from 'sharp';

await sharp('assets/images/subpages/podcast/bohl-fragt__640x640.avif')
	.resize(132)
	.toFile('assets/images/subpages/podcast/bohl-fragt__132x132.avif');
