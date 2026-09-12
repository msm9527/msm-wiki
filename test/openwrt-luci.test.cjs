const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../.github/openwrt/files/luci-app-msm/www/luci-static/resources');
function moduleFile(name, context) { return new Function(...Object.keys(context), fs.readFileSync(path.join(base, name), 'utf8'))(...Object.values(context)); }
function helpers(lang = 'zh-cn') {
  return moduleFile('msm/dashboard.js', { baseclass: { extend: value => value }, document: { documentElement: { lang }, body: { className: '' } }, window: { getComputedStyle: () => ({ backgroundColor: 'rgb(31, 31, 31)' }) } });
}
class Element {
  constructor(tag, attrs = {}, children = []) { this.tag = tag; this.attrs = { ...attrs }; this.children = [children].flat().filter(x => x != null); this.listeners = {}; this.style = {}; this.value = attrs.value || ''; this.hidden = !!attrs.hidden; }
  get textContent() { return this.children.map(x => typeof x === 'string' ? x : x.textContent).join(''); }
  set textContent(value) { this.children = [String(value)]; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(key, callback) { this.listeners[key] = callback; }
  appendChild(child) { this.children.push(child); }
  remove() {}
  click() { return this.attrs.click?.(); }
}
// LuCI dom.append parses a scalar string as HTML; strings in an array are text.
// Track the HTML sink so a permissive mock cannot hide unsafe log rendering.
const E = (tag, attrs, children) => {
  const node = new Element(tag, attrs, children);
  node.htmlInput = typeof children === 'string' ? children : null;
  return node;
};
function all(node) { return [node, ...node.children.filter(x => x instanceof Element).flatMap(all)]; }
async function fixture() {
  const state = { running: true, installed: true, enabled: true, pid: 42, version: '1.4.8_beta-r1', port: 7777, config_dir: '/etc/msm', uptime_seconds: 123, memory_bytes: 123456, storage_available_bytes: 1234, storage_total_bytes: 10000 };
  const values = { enabled: '1', port: '7777', config_dir: '/etc/msm' }, calls = [], fields = {};
  let poller, fail = false;
  const uci = { load: async name => calls.push(['load', name]), unload: name => calls.push(['unload', name]), get: (config, section, option) => values[option] };
  const rpc = { declare: spec => async (...args) => {
    calls.push([spec.object + '.' + spec.method, ...args]);
    if (spec.object === 'msm' && spec.method === 'status') { if (fail) throw Error('offline'); return { ...state }; }
    if (spec.method === 'action') { state.running = args[0] !== 'stop'; return { ok: true }; }
    if (spec.method === 'logs') return { lines: ['{"level":"error","msg":"safe <script>"}'] };
    if (spec.method === 'commit') return 0;
    throw Error('Unexpected RPC');
  } };
  const map = { readonly: false, section: () => ({ option: (_, name) => (fields[name] = { formvalue: () => values[name] }) }), render: async () => E('div'), save: async () => calls.push(['save']), load: async () => {}, reset: async () => {} };
  const context = { E, view: { extend: v => v }, form: { Map: function() { return map; } }, uci, rpc,
    poll: { add: callback => { poller = callback; } }, ui: { changes: { init() {} }, showModal() {}, hideModal() {} },
    dashboard: helpers(), telemetry: moduleFile('msm/telemetry.js', { baseclass: { extend: value => value } }), window: { location: { hostname: '2001:db8::1' }, setTimeout: fn => fn() }, L: { resource: x => '/resources/' + x }, document: { body: E('body'), createElementNS: (ns, tag) => E(tag) }, URL, Blob };
  const view = moduleFile('view/msm/dashboard.js', context), root = await view.render(await view.load());
  return { root, state, values, calls, fields, map, poll: () => poller(), fail: () => { fail = true; }, button: label => all(root).find(n => n.tag === 'button' && n.textContent === label) };
}

test('LuCI formatting validates ports/directories and keeps IPv6 console URLs correct', () => {
  const ui = helpers();
  assert.equal(ui.address('2001:db8::1', 7777), 'http://[2001:db8::1]:7777/');
  for (const port of ['0', '-1', '65536', '7777/path', 'nan', '0007777']) assert.equal(ui.address('router', port), null);
  for (const dir of ['/', '/etc/../root', '/etc//msm', '/etc/./msm', '/etc/msm\n', 'relative']) assert.equal(ui.validDirectory(dir), false);
  assert.equal(ui.validDirectory('/mnt/data volume/msm'), true);
  assert.equal(ui.validDirectory('/' + '中'.repeat(200)), false);
  assert.equal(ui.bytes(1048576), '1.0 MiB');
  assert.equal(ui.bytes(0), '0 B');
  assert.equal(ui.bytes(null), '—');
  assert.equal(ui.uptime(0), '0 秒');
  assert.equal(ui.uptime(null), '—');
  assert.equal(ui.uptime(90061), '1 天 1 小时');
  assert.equal(helpers('en').uptime(3660), '1h 1m');
});

test('log filters support JSON and plain text without interpreting content as markup', () => {
  const ui = helpers();
  const lines = ['{"level":"info","msg":"ready"}', '{"level":"warn","msg":"retry"}', '{"level":"error","msg":"<script>bad</script>"}', 'plain startup'];
  assert.match(ui.filteredLogs(lines, 'warn', ''), /retry/);
  assert.doesNotMatch(ui.filteredLogs(lines, 'error', ''), /retry|ready/);
  assert.match(ui.filteredLogs(lines, 'all', 'script'), /<script>bad<\/script>/);
  assert.equal(ui.filteredLogs(lines, 'all', 'missing'), '');
});

test('polling uses committed status and never reloads or discards form edits', async () => {
  const f = await fixture();
  f.values.port = '8888';
  await f.poll();
  const link = all(f.root).find(n => n.tag === 'a' && n.textContent.includes('打开 MSM'));
  assert.equal(link.getAttribute('href'), 'http://[2001:db8::1]:7777/');
  assert.equal(f.values.port, '8888');
  assert.equal(f.calls.filter(call => call[0] === 'unload').length, 0);
  assert.equal(f.button('启动').disabled, true);
  f.fail(); await f.poll();
  assert.equal(f.button('停止').disabled, true);
  assert.equal(f.button('重启服务').disabled, true);
  assert.equal(link.getAttribute('href'), undefined);
});

test('service restart uses only the bounded MSM action and verifies resulting state', async () => {
  const f = await fixture();
  await f.button('重启服务').click();
  assert.ok(f.calls.some(call => call[0] === 'msm.action' && call[1] === 'restart'));
  assert.ok(!f.calls.some(call => call[0].startsWith('uci.')));
  assert.match(f.root.textContent, /服务已重新启动/);
});

test('saving commits only msm and does not apply other pending LuCI configurations', async () => {
  const f = await fixture();
  await f.button('保存并应用').click();
  assert.deepEqual(f.calls.filter(call => call[0].startsWith('uci.')), [['uci.commit', 'msm']]);
  assert.match(f.root.textContent, /配置已保存并生效/);
});


test('saving locks the entire form and rejects concurrent actions until completion', async () => {
  const f = await fixture();
  let resolve;
  f.map.save = () => new Promise(done => { resolve = done; });
  const pending = f.button('保存并应用').click();
  assert.equal(all(f.root).find(n => n.tag === 'fieldset').disabled, true);
  await f.button('重启服务').click();
  assert.equal(f.calls.filter(call => call[0] === 'msm.action').length, 0);
  resolve(); await pending;
  assert.equal(all(f.root).find(n => n.tag === 'fieldset').disabled, false);
});

test('readonly access cannot trigger settings or service actions through handlers', async () => {
  const f = await fixture();
  f.map.readonly = true;
  await f.poll();
  assert.equal(all(f.root).find(n => n.tag === 'fieldset').disabled, true);
  await f.button('重启服务').click();
  await f.button('保存并应用').click();
  assert.ok(!f.calls.some(call => call[0] === 'msm.action' || call[0] === 'uci.commit'));
});

test('dashboard uses the official local logo and clears its live memory plot on disconnect', async () => {
  const f = await fixture();
  assert.ok(all(f.root).some(n => n.tag === 'img' && n.attrs.src === '/resources/msm/logo.svg'));
  const line = all(f.root).find(n => n.tag === 'path' && n.attrs.class === 'msm-chart-line');
  assert.match(line.attrs.d, /^M/);
  f.fail(); await f.poll();
  assert.equal(line.attrs.d, '');
});

test('log rows use text nodes and preserve the time and severity columns', async () => {
  const f = await fixture();
  await f.button('读取日志').click();
  const row = all(f.root).find(n => n.attrs.class === 'msm-log-row');
  assert.match(row.textContent, /ERRORsafe <script>/);
  assert.equal(all(row).filter(n => n.tag === 'script').length, 0);
  assert.ok(all(row).every(n => n.htmlInput === null), 'untrusted log fields must never enter LuCI’s HTML-string sink');
  assert.equal(all(row).find(n => n.attrs.class === 'msm-log-level').attrs['data-level'], 'error');
});
