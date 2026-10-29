import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('TaGraphicpad has a repo-specific identity instead of the shared origin root',()=>{
  assert.equal(manifest.id,'/261028_gaphic-pad/');
  assert.equal(manifest.name,'TaGraphicpad');
  assert.equal(manifest.short_name,'TaGraphicpad');
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
});

test('manifest metadata belongs to the main document, outside bundled JavaScript',()=>{
  const head=html.slice(0,html.indexOf('<script'));
  assert.match(head,/<link rel="manifest" href="\.\/manifest.webmanifest">/);
  assert.match(head,/<title>TaGraphicpad<\/title>/);
  assert.equal((html.match(/rel="manifest"/g)||[]).length,1);
  assert.match(html,/document.title="TaGraphicpad"/);
  assert.doesNotMatch(html,/document.title=`\$\{this.dirty/);
});
