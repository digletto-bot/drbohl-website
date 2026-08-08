import fs from 'node:fs/promises';
import path from 'node:path';
import { generate } from 'critical';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const ROOT = '.';
const DIST = './dist';

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

async function cleanDist() {
	await fs.rm(DIST, { recursive: true, force: true });
	await fs.mkdir(DIST, { recursive: true });
}

async function copyDirectory(directory) {
	await fs.cp(directory, path.join(DIST, directory), {
		recursive: true,
	});
}

async function copyStaticFiles() {
	await Promise.all([copyDirectory('css'), copyDirectory('assets')]);
}

async function minifyJavaScript() {
	const sourceDirectory = './js';
	const outputDirectory = './dist/js';

	await fs.mkdir(outputDirectory, { recursive: true });

	const files = await fs.readdir(sourceDirectory);

	for (const file of files) {
		if (!file.endsWith('.js') || file.endsWith('.min.js')) {
			continue;
		}

		const source = await fs.readFile(path.join(sourceDirectory, file), 'utf8');

		const result = await minify(source, {
			compress: true,
			mangle: true,
		});

		if (!result.code) {
			throw new Error(`Failed to minify ${file}`);
		}

		await fs.writeFile(path.join(outputDirectory, file), result.code, 'utf8');
	}
}

async function minifyCss() {
	const sourceDirectory = './css';
	const outputDirectory = './dist/css';

	await fs.mkdir(outputDirectory, { recursive: true });

	const files = await fs.readdir(sourceDirectory);

	for (const file of files) {
		if (!file.endsWith('.css')) {
			continue;
		}

		const source = await fs.readFile(path.join(sourceDirectory, file), 'utf8');

		const result = new CleanCSS().minify(source);

		if (result.errors.length > 0) {
			throw new Error(`Failed to minify ${file}:\n${result.errors.join('\n')}`);
		}

		await fs.writeFile(path.join(outputDirectory, file), result.styles, 'utf8');
	}
}

// Netlify only serves what's inside the publish directory (dist), and
// resolves _redirects relative to it — these can't stay repo-root-only
// once publish points at dist instead of ".". netlify.toml is excluded:
// it's read from the base directory (repo root), not the publish directory.
async function copyRootFiles() {
	const files = ['_redirects', 'robots.txt', '404.html'];
	await Promise.all(
		files.map((file) => fs.copyFile(path.join(ROOT, file), path.join(DIST, file)))
	);
}

async function generateCriticalHtml() {
	const result = await generate({
		src: 'index.html',
		inline: true,
		base: ROOT,
	});

	await fs.writeFile(path.join(DIST, 'index.html'), result.html, 'utf8');
}

async function build() {
	console.log('\nCleaning dist...');
	await cleanDist();

	console.log('Minifying CSS...');
	await minifyCss();

	console.log('Minifying JavaScript...');
	await minifyJavaScript();

	console.log('Copying assets...');
	await copyDirectory('assets');

	console.log('Copying root files (_redirects, robots.txt, 404.html)...');
	await copyRootFiles();

	console.log('Generating critical CSS...');
	await generateCriticalHtml();

	console.log('\x1b[1;32mBuild complete!\x1b[0m');
}
await build();
