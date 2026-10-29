import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [join(__dirname, 'client.jsx')],
  bundle: true,
  outfile: join(__dirname, 'dist', 'client.js'),
  format: 'iife',
  minify: true,
  sourcemap: false,
  jsx: 'automatic',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('Stub client built → stub/dist/client.js');
