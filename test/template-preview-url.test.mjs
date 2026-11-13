import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../studio/lib/template-preview.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildTemplatePreviewUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('builds a preview URL that carries unsaved theme and identity values', () => {
  const url = buildTemplatePreviewUrl({
    id: 'template-id',
    slug: 'store-classic',
    name: 'Store Classic',
    manifest: {
      slug: 'store-classic',
      name: 'Store Classic',
      version: '1.0.0',
      rendererApiVersion: 1,
      isBuiltin: true,
      businessProfiles: [],
      capabilities: [],
      sections: [],
      preview: { demoPath: '/templates/store-classic' },
    },
  }, {
    name: 'Toko Uji',
    theme: {
      mode: 'light',
      accent: 'teal',
      colors: { background: '#ffffff', accent: '#14b8a6' },
      components: { header: { text: '#123456' } },
      typography: { headingFont: 'Inter', bodyFont: 'Roboto' },
    },
  });

  assert.ok(url);
  const params = new URL(url).searchParams;
  assert.equal(new URL(url).pathname, '/templates/store-classic');
  assert.equal(params.get('preview'), '1');
  assert.equal(params.get('name'), 'Toko Uji');
  assert.equal(params.get('theme_mode'), 'light');
  assert.equal(params.get('theme_accent'), 'teal');
  assert.equal(params.get('c_bg'), 'ffffff');
  assert.equal(params.get('c_accent'), '14b8a6');
  assert.equal(params.get('tf_head'), 'Inter');
  assert.equal(params.get('tf_body'), 'Roboto');
  assert.deepEqual(JSON.parse(params.get('theme_x')), {
    components: { header: { text: '#123456' } },
  });
});

test('does not build a live preview URL for an external template without a demo path', () => {
  assert.equal(buildTemplatePreviewUrl({
    id: 'external-template-id',
    slug: 'external-template',
    name: 'External template',
    manifest: {
      slug: 'external-template',
      name: 'External template',
      version: '1.0.0',
      rendererApiVersion: 1,
      isBuiltin: false,
      businessProfiles: [],
      capabilities: [],
      sections: [],
    },
  }), null);
});
