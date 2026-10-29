const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/form-data.ts'), 'utf8');
const api = {};
new Function('exports', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(api, () => ({ Platform: { OS: 'web' } }));

test('browser blob images become real multipart files', async () => {
  const url = URL.createObjectURL(new Blob(['image bytes'], { type: 'image/png' }));
  try {
    const form = await api.createImageFormData(url);
    assert.equal(await form.get('file').text(), 'image bytes');
    assert.equal(form.get('file').type, 'image/png');
  } finally { URL.revokeObjectURL(url); }
});

test('expired blob cannot silently become a string in multipart upload', async () => {
  const url = URL.createObjectURL(new Blob(['image']));
  URL.revokeObjectURL(url);
  await assert.rejects(api.createImageFormData(url));
});
