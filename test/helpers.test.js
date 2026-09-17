const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Load Code.gs into a sandbox with stubbed Apps Script globals so the pure
// helpers can be exercised without the Apps Script runtime.
function loadScript() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'Code.gs'), 'utf8');
  const sandbox = {
    Logger: { log() {} },
    PropertiesService: {},
    UrlFetchApp: {},
    DocumentApp: {},
    Drive: {},
    ScriptApp: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(
    `${source}\nthis.__exports = { isAddressedToBot, stripTrigger, buildContextWindow, buildUserMessage, CONFIG };`,
    sandbox
  );
  return sandbox.__exports;
}

const gs = loadScript();

test('isAddressedToBot accepts each trigger case-insensitively', () => {
  assert.equal(gs.isAddressedToBot('@AI what is this?'), true);
  assert.equal(gs.isAddressedToBot('  @bot summarize'), true);
  assert.equal(gs.isAddressedToBot('@Claude help'), true);
  assert.equal(gs.isAddressedToBot('please @ai help'), false);
  assert.equal(gs.isAddressedToBot(''), false);
  assert.equal(gs.isAddressedToBot(null), false);
});

test('stripTrigger removes the trigger and surrounding whitespace', () => {
  assert.equal(gs.stripTrigger('@AI  explain this'), 'explain this');
  assert.equal(gs.stripTrigger('@claude'), '');
  assert.equal(gs.stripTrigger('no trigger here'), 'no trigger here');
});

test('buildContextWindow returns the whole text when it fits', () => {
  assert.equal(gs.buildContextWindow('short doc', 'short', 100), 'short doc');
});

test('buildContextWindow centres on the quoted text and marks truncation', () => {
  const doc = 'a'.repeat(500) + 'NEEDLE' + 'b'.repeat(500);
  const out = gs.buildContextWindow(doc, 'NEEDLE', 106);
  assert.ok(out.startsWith('...'));
  assert.ok(out.endsWith('...'));
  assert.ok(out.includes('NEEDLE'));
  assert.ok(out.length <= 106 + 6);
});

test('buildContextWindow falls back to the document head when quote is missing', () => {
  const doc = 'x'.repeat(1000);
  const out = gs.buildContextWindow(doc, 'missing', 100);
  assert.equal(out, 'x'.repeat(100) + '...');
});

test('buildUserMessage includes highlighted text when present', () => {
  const withHighlight = gs.buildUserMessage('why?', 'ctx', 'quoted');
  assert.ok(withHighlight.includes('quoted'));
  assert.ok(withHighlight.includes('"why?"'));
  const without = gs.buildUserMessage('why?', 'ctx', null);
  assert.ok(!without.includes('highlighted this text'));
});

test('default model is a current alias, not a dated snapshot', () => {
  assert.equal(gs.CONFIG.DEFAULT_MODEL, 'claude-sonnet-5');
});
