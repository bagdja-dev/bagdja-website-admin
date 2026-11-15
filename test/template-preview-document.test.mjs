import assert from 'node:assert/strict';
import test from 'node:test';

import vm from 'node:vm';

import { buildClientPreviewDocument, buildPreviewDocument } from '../studio/lib/template-preview-document.ts';

test('runs template JavaScript behind a no-network CSP and a navigation guard', () => {
  const doc = buildPreviewDocument('<main>Kumpul</main>', 'window.x = "</script><script>alert(1)</script>";', true);
  assert.match(doc, /Content-Security-Policy" content="[^"]*connect-src 'none'/);
  assert.match(doc, /form-action 'none'/);
  assert.match(doc, /worker-src 'none'/);
  const guardAt = doc.indexOf("closest('a[href], [data-bagdja-intent], [data-bagdja-action]')");
  const clientAt = doc.indexOf('window.x');
  assert.ok(guardAt > 0 && clientAt > guardAt, 'guard runs before template script');
  assert.doesNotMatch(doc.slice(clientAt), /<\/script><script>alert/);
  assert.match(doc, /<main>Kumpul<\/main>/);
});

test('renders without any script when JavaScript is switched off', () => {
  const doc = buildPreviewDocument('<main>Kumpul</main>', 'window.x = 1;', false);
  assert.doesNotMatch(doc, /<script/);
});

const BUNDLE = [
  'globalThis.BagdjaTemplate = Object.freeze({',
  '  render: (props) => "<main>" + props.title + "</main>",',
  `  clientSource: ${JSON.stringify('document.body.dataset.enhanced = "1"; // </script>')},`,
  '});',
].join('\n');

/** Jalankan skrip dokumen pratinjau berurutan di konteks DOM tiruan. */
function runPreview(doc) {
  const scripts = [...doc.matchAll(/<script(?: type="application\/json" id="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  const json = Object.fromEntries(scripts.filter(([, id]) => id).map(([, id, text]) => [id, text]));
  const appended = [];
  const body = {
    innerHTML: '',
    dataset: {},
    appendChild: (script) => appended.push(script.textContent),
  };
  const context = vm.createContext({
    document: {
      body,
      documentElement: body,
      addEventListener() {},
      createElement: () => ({}),
      getElementById: (id) => (id in json ? { textContent: json[id] } : null),
    },
    window: { addEventListener() {} },
    Element: class {},
  });
  context.globalThis = context;
  for (const [, id, source] of scripts) if (!id) vm.runInContext(source, context);
  return { body, appended };
}

test('client preview renders fixture props with browser.js behind the same no-network CSP', () => {
  const doc = buildClientPreviewDocument(BUNDLE, { title: 'Halo </script><script>alert(1)</script>' }, true);
  assert.match(doc, /connect-src 'none'/);
  assert.doesNotMatch(doc, /Halo <\/script><script>alert/);
  const { body, appended } = runPreview(doc);
  assert.equal(body.innerHTML, '<main>Halo </script><script>alert(1)</script></main>');
  assert.deepEqual(appended, ['document.body.dataset.enhanced = "1"; // </script>']);
});

test('client preview skips client.js when JavaScript is switched off', () => {
  const { body, appended } = runPreview(buildClientPreviewDocument(BUNDLE, { title: 'Halo' }, false));
  assert.equal(body.innerHTML, '<main>Halo</main>');
  assert.deepEqual(appended, []);
});

test('client preview shows a readable error when browser.js has no render', () => {
  const { body } = runPreview(buildClientPreviewDocument('globalThis.Other = 1;', {}, true));
  assert.match(body.innerHTML, /Template gagal dirender di browser/);
});
