import * as esbuild from 'esbuild';
import { cp, rm, mkdir, access } from 'node:fs/promises';

const outdir = 'dist';
const watch = process.argv.includes('--watch');

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

async function copyStatic() {
  await cp('manifest.json', `${outdir}/manifest.json`);
  await cp('icons', `${outdir}/icons`, { recursive: true });
  for (const [src, dst] of [['src/options/index.html', `${outdir}/options.html`]]) {
    try { await access(src); await cp(src, dst); } catch { /* not created yet */ }
  }
}

const ctx = await esbuild.context({
  entryPoints: {
    content: 'src/content/index.ts',
    'nav-bridge': 'src/content/nav-bridge.ts',
    background: 'src/background/index.ts',
    options: 'src/options/options.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome116',
  outdir,
  logLevel: 'info',
  // onEnd runs on every watch rebuild too, so manifest/options.html edits reach dist/.
  plugins: [{ name: 'copy-static', setup: (b) => b.onEnd(copyStatic) }],
});

await ctx.rebuild();

if (watch) {
  await ctx.watch();
  console.log('watching…');
} else {
  await ctx.dispose();
}
