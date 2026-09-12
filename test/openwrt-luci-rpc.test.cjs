const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const helper = path.join(root, '.github/openwrt/files/luci-app-msm/usr/libexec/rpcd/msm');
const aclFile = path.join(root, '.github/openwrt/files/luci-app-msm/usr/share/rpcd/acl.d/luci-app-msm.json');
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";

// Exercise the real shell plugin with isolated commands and files. This shim
// implements only jshn's public JSON interface, not any MSM behavior.
const jsonTool = [
  "const [op, state, key, value, array] = process.argv.slice(2);",
  "const obj = JSON.parse(state || '{}');",
  "if (op === 'load') { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) process.exit(1); }",
  "else if (op === 'keys') process.stdout.write(Object.keys(obj).join(' '));",
  "else if (op === 'get') process.stdout.write(obj[key] == null ? '' : String(obj[key]));",
  "else if (op === 'type') process.stdout.write(obj[key] === undefined ? '' : obj[key] === null ? 'null' : Number.isInteger(obj[key]) ? 'int' : typeof obj[key]);",
  "else {",
  " if (op === 'array') obj[key] = [];",
  " else if (array) obj[array].push(value);",
  " else obj[key] = op === 'int' ? Number(value) : op === 'boolean' ? value === '1' : value;",
  " process.stdout.write(JSON.stringify(obj));",
  "}"
].join('\n');
const jsonShell = [
  "json_init() { JSHN_JSON='{}'; JSHN_ARRAY=''; }",
  "json_load() { node \"$MOCK_JSON\" load \"$1\" || return 1; JSHN_JSON=\"$1\"; JSHN_ARRAY=''; }",
  "json_dump() { printf '%s\\n' \"$JSHN_JSON\"; }",
  'json_assign() { local value; value="$(node "$MOCK_JSON" "$2" "$JSHN_JSON" "$3")"; eval "$1=\\$value"; }',
  'json_get_keys() { json_assign "$1" keys; }',
  'json_get_var() { json_assign "$1" get "$2"; }',
  'json_get_type() { json_assign "$1" type "$2"; }',
  'json_add_array() { JSHN_JSON="$(node "$MOCK_JSON" array "$JSHN_JSON" "$1")"; JSHN_ARRAY="$1"; }',
  "json_close_array() { JSHN_ARRAY=''; }",
  'json_add_string() { JSHN_JSON="$(node "$MOCK_JSON" string "$JSHN_JSON" "$1" "$2" "$JSHN_ARRAY")"; }',
  'json_add_int() { JSHN_JSON="$(node "$MOCK_JSON" int "$JSHN_JSON" "$1" "$2")"; }',
  'json_add_boolean() { JSHN_JSON="$(node "$MOCK_JSON" boolean "$JSHN_JSON" "$1" "$2")"; }'
].join('\n');

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'msm-rpc-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bin = path.join(dir, 'commands');
  const configDir = path.join(dir, "MSM data ' quoted");
  const proc = path.join(dir, 'proc');
  const runtimeLogs = path.join(dir, 'runtime-logs');
  const binary = path.join(dir, 'msm-binary');
  const init = path.join(dir, 'msm-init');
  const configFile = path.join(dir, 'config.json');
  const serviceFile = path.join(dir, 'service.json');
  const trace = path.join(dir, 'trace');
  const apkDatabase = path.join(dir, 'apk-installed');
  const opkgDatabase = path.join(dir, 'opkg-status');
  for (const p of [bin, configDir, proc, runtimeLogs, path.join(configDir, 'logs'), path.join(proc, '123')]) fs.mkdirSync(p, { recursive: true });
  const executable = (p, text) => fs.writeFileSync(p, text, { mode: 0o755 });
  executable(binary, '#!/bin/sh\necho unexpected-binary-execution >> "$MOCK_TRACE"\nexit 1\n');
  executable(init, '#!/bin/sh\nprintf "action:%s\\n" "$1" >> "$MOCK_TRACE"\nexit "$MOCK_ACTION_EXIT"\n');
  fs.symlinkSync(binary, path.join(proc, '123/exe'));
  fs.writeFileSync(path.join(proc, '123/status'), 'Name:\tmsm\nVmRSS:\t2048 kB\n');
  const statFields = ['S', ...Array(18).fill('0'), '10000'];
  fs.writeFileSync(path.join(proc, '123/stat'), '123 (msm with spaces) ' + statFields.join(' ') + '\n');
  fs.writeFileSync(path.join(proc, 'uptime'), '250.99 200.00\n');
  fs.writeFileSync(apkDatabase, 'P:unrelated\nV:secret-version\n\nP:msm\nV:1.4.8_beta-r1\n\n');
  fs.writeFileSync(path.join(dir, 'json-tool.cjs'), jsonTool);
  fs.writeFileSync(path.join(dir, 'jshn.sh'), jsonShell);
  executable(path.join(bin, 'uci'), [
    '#!/usr/bin/env node',
    "const fs=require('node:fs'); const args=process.argv.slice(2);",
    "fs.appendFileSync(process.env.MOCK_TRACE, 'uci:'+JSON.stringify(args)+'\\n');",
    "if (args.length!==3 || args[0]!=='-q' || args[1]!=='get' || !/^msm\\.main\\.(enabled|port|config_dir)$/.test(args[2])) process.exit(9);",
    "const value=JSON.parse(fs.readFileSync(process.env.MOCK_CONFIG))[args[2].split('.').at(-1)];",
    "if(value===undefined)process.exit(1);process.stdout.write(String(value));"
  ].join('\n'));
  executable(path.join(bin, 'ubus'), [
    '#!/usr/bin/env node',
    "const fs=require('node:fs'); const args=process.argv.slice(2);",
    "fs.appendFileSync(process.env.MOCK_TRACE,'ubus:'+JSON.stringify(args)+'\\n');",
    "if(JSON.stringify(args)!==JSON.stringify(['call','service','list','{\"name\":\"msm\"}']))process.exit(9);",
    "process.stdout.write(fs.readFileSync(process.env.MOCK_SERVICE));"
  ].join('\n'));
  executable(path.join(bin, 'jsonfilter'), [
    '#!/usr/bin/env node',
    "const args=process.argv.slice(2);const obj=JSON.parse(args[1]||'{}');",
    "if(args[3]!=='@.msm.instances[@.running=true].pid')process.exit(9);",
    "process.stdout.write(Object.values(obj.msm?.instances||{}).filter(i=>i.running===true).map(i=>i.pid).join('\\n'));"
  ].join('\n'));
  executable(path.join(bin, 'readlink'), '#!/usr/bin/env node\ntry { process.stdout.write(require("node:fs").realpathSync(process.argv.at(-1))); } catch { process.exit(1); }\n');
  executable(path.join(bin, 'getconf'), '#!/bin/sh\nprintf "100\\n"\n');
  executable(path.join(bin, 'df'), '#!/bin/sh\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted on\\n/dev/test 8388608 2097152 6291456 25%% /\\n"\n');
  executable(path.join(bin, 'timeout'), '#!/bin/sh\nshift\nif [ -n "$MOCK_TIMEOUT_COMMAND" ] && [ "$(basename "$1")" = "$MOCK_TIMEOUT_COMMAND" ]; then exit 124; fi\nexec "$@"\n');
  let source = fs.readFileSync(helper, 'utf8');
  const replaceLine = (from, to) => { assert.ok(source.includes(from), from); source = source.replace(from, to); };
  replaceLine('PATH=/usr/sbin:/usr/bin:/sbin:/bin', 'PATH=' + quote(bin + ':' + process.env.PATH));
  replaceLine('. /usr/share/libubox/jshn.sh', '. ' + quote(path.join(dir, 'jshn.sh')));
  for (const [name, value] of Object.entries({ MSM_BINARY: binary, MSM_INIT: init, PROC_ROOT: proc, APK_DATABASE: apkDatabase, OPKG_DATABASE: opkgDatabase, RUNTIME_LOG_DIR: runtimeLogs })) {
    source = source.replace(new RegExp('^' + name + '=.*$', 'm'), name + '=' + quote(value));
  }
  const testedHelper = path.join(dir, 'helper');
  executable(testedHelper, source);
  const setConfig = config => fs.writeFileSync(configFile, JSON.stringify({ enabled: '1', port: '7777', config_dir: configDir, ...config }));
  const setService = instances => fs.writeFileSync(serviceFile, JSON.stringify({ msm: { instances } }));
  setConfig({});
  setService({ instance1: { running: true, pid: 123 } });
  const run = (method, input = {}, extraEnv = {}) => {
    const result = spawnSync('sh', [testedHelper, 'call', method], {
      input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 30_000, cwd: dir,
      env: { ...process.env, MOCK_ACTION_EXIT: '0', MOCK_JSON: path.join(dir, 'json-tool.cjs'), MOCK_CONFIG: configFile, MOCK_SERVICE: serviceFile, MOCK_TRACE: trace, ...extraEnv }
    });
    assert.equal(result.status, 0, String(result.error || '') + '\n' + result.stderr + '\n' + result.stdout);
    return JSON.parse(result.stdout);
  };
  return { dir, configDir, proc, runtimeLogs, binary, init, apkDatabase, opkgDatabase, setConfig, setService, run,
    commands: () => fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8') : '' };
}

test('rpcd signature and shell syntax expose only the three constrained methods', () => {
  assert.equal(spawnSync('sh', ['-n', helper]).status, 0);
  const source = fs.readFileSync(helper, 'utf8');
  assert.match(source, /\{"status":\{\},"action":\{"action":""\},"logs":\{"lines":0\}\}/);
  assert.doesNotMatch(source, /^\s*(eval|logread|uci (commit|apply))\b/m);
  const acl = JSON.parse(fs.readFileSync(aclFile))['luci-app-msm'];
  assert.deepEqual(acl.read, { uci: ['msm'], ubus: { msm: ['status', 'logs'] } });
  assert.deepEqual(acl.write, { uci: ['msm'], ubus: { msm: ['action'], uci: ['commit'] } });
});

test('status reports the owned process, installed version and 64-bit storage without running MSM', t => {
  const f = fixture(t);
  assert.deepEqual(f.run('status'), { running: true, pid: 123, version: '1.4.8_beta-r1', uptime_seconds: 150, memory_bytes: 2097152,
    config_dir: f.configDir, port: 7777, enabled: true, storage_total_bytes: 8589934592, storage_available_bytes: 6442450944, installed: true });
  assert.doesNotMatch(f.commands(), /unexpected-binary|action:|"apply"|"commit"/);
  assert.ok(!fs.readdirSync(f.dir).some(name => /^[0-9]+$/.test(name)), 'status must not redirect awk output into a file');
});

test('status rejects foreign executables, stopped instances and unsafe PIDs, and supports opkg', t => {
  const f = fixture(t);
  fs.unlinkSync(f.apkDatabase);
  fs.writeFileSync(f.opkgDatabase, 'Package: other\nVersion: unrelated\n\nPackage: msm\nVersion: 1.4.8~beta-r1\n');
  f.setService({ stopped: { running: false, pid: 123 }, injected: { running: true, pid: '../../etc/shadow' } });
  assert.equal(f.run('status').running, false);
  f.setService({ running: { running: true, pid: 123 } });
  fs.unlinkSync(path.join(f.proc, '123/exe'));
  fs.symlinkSync(f.init, path.join(f.proc, '123/exe'));
  const status = f.run('status');
  assert.equal(status.pid, 0);
  assert.equal(status.memory_bytes, 0);
  assert.equal(status.version, '1.4.8~beta-r1');
});

test('actions reject command and service injection without invoking any init script', t => {
  const f = fixture(t);
  for (const action of ['start; touch /tmp/injected', 'restart\nstop', '$(reboot)', '../dnsmasq', 'enable', '', 1]) {
    assert.equal(f.run('action', { action }).ok, false);
  }
  assert.equal(f.run('action', { action: 'start', service: 'dnsmasq' }).error_code, 'invalid_arguments');
  assert.equal(f.run('action', '{"action":').error_code, 'invalid_arguments');
  assert.equal(f.run('action', '[]').error_code, 'invalid_arguments');
  assert.doesNotMatch(f.commands(), /action:/);
});

test('disabled start/restart fail clearly, stop remains available, and pending UCI is untouched', t => {
  const f = fixture(t);
  f.setConfig({ enabled: '0' });
  for (const action of ['start', 'restart']) {
    const result = f.run('action', { action });
    assert.equal(result.error_code, 'disabled');
    assert.match(result.error, /Enable MSM and save/);
  }
  assert.deepEqual(f.run('action', { action: 'stop', ubus_rpc_session: 'ignored-session-metadata' }), { ok: true });
  assert.equal((f.commands().match(/action:/g) || []).length, 1);
  assert.match(f.commands(), /action:stop\n/);
  assert.doesNotMatch(f.commands(), /"commit"|"apply"|reload_config/);
});

test('actions surface init failure, timeout, missing installation and invalid config', t => {
  const f = fixture(t);
  assert.equal(f.run('action', { action: 'start' }, { MOCK_ACTION_EXIT: '1' }).error_code, 'action_failed');
  assert.equal(f.run('action', { action: 'restart' }, { MOCK_TIMEOUT_COMMAND: 'msm-init' }).error_code, 'action_timeout');
  f.setConfig({ config_dir: '/etc/../root' });
  assert.equal(f.run('action', { action: 'start' }).error_code, 'invalid_config');
  f.setConfig({ port: '7777;reboot' });
  assert.equal(f.run('action', { action: 'restart' }).error_code, 'invalid_config');
  f.setConfig({});
  fs.unlinkSync(f.binary);
  assert.equal(f.run('action', { action: 'start' }).error_code, 'not_installed');
});

test('logs preserve literal JSON lines and accept only the package runtime-directory symlink', t => {
  const f = fixture(t);
  const log = path.join(f.configDir, 'logs/msm.log');
  const lines = ['{"msg":"first"}', '{"msg":"$(do-not-run); quoted"}', '{"msg":"中文日志"}'];
  fs.writeFileSync(log, lines.join('\n') + '\n');
  assert.deepEqual(f.run('logs', { lines: 2 }), { lines: lines.slice(-2), source: 'msm.log' });
  fs.rmSync(path.join(f.configDir, 'logs'), { recursive: true });
  fs.symlinkSync(f.runtimeLogs, path.join(f.configDir, 'logs'));
  fs.writeFileSync(path.join(f.runtimeLogs, 'msm.log'), lines[0] + '\n');
  assert.deepEqual(f.run('logs').lines, lines.slice(0, 1));
});

test('logs reject arbitrary paths, invalid counts, file symlinks and directory escapes', t => {
  const f = fixture(t);
  for (const lines of [0, 201, -1, 1.5, '20', '2;cat /etc/shadow', null]) assert.equal(f.run('logs', { lines }).error_code, 'invalid_lines');
  assert.equal(f.run('logs', { lines: 1, path: '/etc/shadow' }).error_code, 'invalid_arguments');
  const outside = path.join(f.dir, 'private'); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'msm.log'), 'not an MSM log');
  fs.symlinkSync(path.join(outside, 'msm.log'), path.join(f.configDir, 'logs/msm.log'));
  assert.equal(f.run('logs').error_code, 'unsafe_log_path');
  fs.rmSync(path.join(f.configDir, 'logs'), { recursive: true });
  fs.symlinkSync(outside, path.join(f.configDir, 'logs'));
  assert.equal(f.run('logs').error_code, 'unsafe_log_path');
});

test('logs bound bytes and requested lines, and fail safely on missing files and read timeout', t => {
  const f = fixture(t);
  assert.equal(f.run('logs').error_code, 'log_unavailable');
  fs.writeFileSync(path.join(f.configDir, 'logs/msm.log'), 'x'.repeat(100_000));
  const bounded = f.run('logs', { lines: 200 });
  assert.ok(bounded.lines.length <= 200);
  assert.ok(Buffer.byteLength(bounded.lines.join('\n')) <= 32768);
  fs.writeFileSync(path.join(f.configDir, 'logs/msm.log'), Array.from({ length: 220 }, (_, i) => 'line ' + i).join('\n'));
  assert.deepEqual(f.run('logs', { lines: 3 }).lines, ['line 217', 'line 218', 'line 219']);
  assert.equal(f.run('logs', {}, { MOCK_TIMEOUT_COMMAND: 'tail' }).error_code, 'log_read_failed');
});

test('logs discard only the byte-window fragment and preserve complete UTF-8 records', t => {
  const f = fixture(t);
  const log = path.join(f.configDir, 'logs/msm.log');
  const records = Array.from({ length: 45 }, (_, i) => JSON.stringify({ seq: i, msg: '流量更新'.repeat(100) }));
  const bytes = Buffer.from(records.join('\n') + '\n');
  assert.ok(bytes.length > 32768);
  assert.ok(bytes.subarray(-32768).toString('utf8').includes('\uFFFD'), 'fixture must cut a UTF-8 character');
  fs.writeFileSync(log, bytes);
  const window = bytes.subarray(-32769);
  const expected = window.subarray(window.indexOf(10) + 1).toString('utf8').trimEnd().split('\n');
  const result = f.run('logs', { lines: 200 }).lines;
  assert.deepEqual(result, expected);
  assert.ok(result.length > 1 && result.length <= 200);
  assert.ok(Buffer.byteLength(result.join('\n')) <= 32768);
  assert.ok(result.every(line => !line.includes('\uFFFD') && records.includes(line)));

  // A complete first record in a small log must not be discarded.
  fs.writeFileSync(log, records[0] + '\n' + records[1] + '\n');
  assert.deepEqual(f.run('logs').lines, records.slice(0, 2));

  // A newline just before the window retains the complete 32 KiB record.
  const exact = '前'.repeat(10921) + '尾\n!';
  assert.equal(Buffer.byteLength(exact), 32768);
  fs.writeFileSync(log, 'older\n' + exact);
  assert.deepEqual(f.run('logs').lines, exact.split('\n'));
});
