import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = process.argv[2] ?? '.';
const TARGET_SMALLER_DIMENSION = 96;

const imageExtensions = new Set([
	'.jpg',
	'.jpeg',
	'.png',
	'.webp',
	'.avif',
	'.gif',
	'.tif',
	'.tiff',
]);

const files = await fs.readdir(directory);

for (const file of files) {
	const extension = path.extname(file).toLowerCase();

	if (!imageExtensions.has(extension)) {
		continue;
	}

	const fullPath = path.join(directory, file);
	const metadata = await sharp(fullPath).metadata();

	if (!metadata.width || !metadata.height) {
		console.warn(`Skipping ${file}: could not determine dimensions`);
		continue;
	}

	const { width, height } = metadata;

	// Don't process files that already contain our dimension suffix.
	const baseName = path.basename(file, extension);

	if (/__\d+x\d+$/.test(baseName)) {
		continue;
	}

	// Rename the original with its dimensions.
	const renamedName = `${baseName}__${width}x${height}${extension}`;
	const renamedPath = path.join(directory, renamedName);

	await fs.rename(fullPath, renamedPath);

	// Calculate the new dimensions while preserving aspect ratio.
	const scale = TARGET_SMALLER_DIMENSION / Math.min(width, height);
	const newWidth = Math.round(width * scale);
	const newHeight = Math.round(height * scale);

	const resizedName = `${baseName}__${newWidth}x${newHeight}${extension}`;

	const resizedPath = path.join(directory, resizedName);

	await sharp(renamedPath).resize(newWidth, newHeight).toFile(resizedPath);

	console.log(`${file} → ${renamedName} + ${resizedName}`);
}
