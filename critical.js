import { generate } from 'critical';
import fs from 'node:fs/promises';

const result = await generate({
	src: 'index.html',
	inline: true,
	base: './',
});

await fs.writeFile('index.html', result.html, 'utf8');
