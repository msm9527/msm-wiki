const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../.github/openwrt/files/luci-app-msm/www/luci-static/resources/msm/telemetry.js'), 'utf8');
const telemetry = new Function('baseclass', source)({ extend: value => value });
const MIB = 1048576;
const status = (bytes = 64 * MIB, pid = 42, uptime = 10) => ({ running: true, pid, memory_bytes: bytes, uptime_seconds: uptime });

test('new series contains no invented history and a single reading remains a single point', () => {
  const series = telemetry.createSeries();
  let chart = series.chart();
  assert.equal(chart.count, 0);
  assert.deepEqual(chart.points, []);
  assert.equal(chart.linePath, '');
  assert.equal(chart.areaPath, '');
  assert.equal(chart.latestBytes, null);
  assert.equal(chart.firstAt, null);
  assert.equal(chart.lastAt, null);
  assert.deepEqual(chart.xTicks, []);
  assert.equal(series.push(status(), 1000), true);
  chart = series.chart(200, 80);
  assert.deepEqual(chart.points, [{ x: 200, y: 28.8, at: 1000, bytes: 64 * MIB }]);
  assert.equal(chart.linePath, 'M200,28.8');
  assert.equal(chart.areaPath, '');
});

test('chart uses real elapsed time and bytes, with finite axes and an unsmoothed path', () => {
  const series = telemetry.createSeries();
  series.push(status(20 * MIB), 1000);
  series.push(status(30 * MIB), 2000);
  series.push(status(40 * MIB), 11000);
  const chart = series.chart(200, 100);
  assert.deepEqual(chart.points.map(point => point.x), [0, 20, 200]);
  assert.deepEqual(chart.points.map(point => point.y), [60, 40, 20]);
  assert.deepEqual(chart.xTicks.map(tick => tick.at), [1000, 2000, 11000]);
  assert.equal(chart.linePath, 'M0,60 L20,40 L200,20');
  assert.equal(chart.areaPath, chart.linePath + ' L200,100 L0,100 Z');
  assert.equal(chart.maxBytes, 50 * MIB);
  assert.equal(chart.latestBytes, 40 * MIB);
  assert.deepEqual(chart.yTicks, [{ y: 0, bytes: 50 * MIB }, { y: 50, bytes: 25 * MIB }, { y: 100, bytes: 0 }]);
});

test('series never keeps more than 60 samples and respects a smaller configured limit', () => {
  for (const [limit, expected] of [[undefined, 60], [5000, 60], [3, 3], [1, 1], [NaN, 60]]) {
    const series = telemetry.createSeries(limit);
    for (let i = 0; i < 100; i++) series.push(status(i + 1), i * 5000);
    const chart = series.chart();
    assert.equal(chart.count, expected);
    assert.equal(chart.points[0].bytes, 101 - expected);
    assert.equal(chart.latestBytes, 100);
  }
});

test('stopped, disconnected, invalid, and unavailable RSS clear the graph without zero samples', () => {
  const invalid = [null, {}, { ...status(), running: false }, { ...status(), running: 'true' },
    ...[0, -1, NaN, Infinity, null, undefined, '64000', 0.5, Number.MAX_SAFE_INTEGER + 1].map(memory_bytes => ({ ...status(), memory_bytes })),
    ...[0, -1, '42', Infinity].map(pid => ({ ...status(), pid }))];
  for (const value of invalid) {
    const series = telemetry.createSeries();
    series.push(status(), 1000);
    assert.equal(series.push(value, 6000), false);
    assert.equal(series.chart().count, 0);
    series.push(status(), 11000);
    assert.deepEqual(series.chart().points.map(point => point.at), [11000]);
  }
});

test('new PID or decreasing process uptime starts a new series, including PID reuse', () => {
  const series = telemetry.createSeries();
  series.push(status(20 * MIB, 42, 100), 1000);
  series.push(status(30 * MIB, 43, 2), 6000);
  assert.equal(series.chart().count, 1);
  series.push(status(40 * MIB, 43, 7), 11000);
  assert.equal(series.chart().count, 2);
  series.push(status(10 * MIB, 43, 0), 16000);
  assert.equal(series.chart().count, 1);
  assert.equal(series.chart().latestBytes, 10 * MIB);
});

test('duplicate timestamps replace a point and clock rollback or polling gaps break continuity', () => {
  const series = telemetry.createSeries();
  series.push(status(20 * MIB), 1000);
  series.push(status(30 * MIB), 1000);
  assert.equal(series.chart().count, 1);
  assert.equal(series.chart().latestBytes, 30 * MIB);
  series.push(status(), 999);
  assert.equal(series.chart().count, 1);
  series.push(status(), 15999);
  assert.equal(series.chart().count, 2);
  series.push(status(), 31000);
  assert.equal(series.chart().count, 1);
  for (const now of [NaN, Infinity, -1, null, '1000', 0.5]) {
    assert.equal(series.push(status(), now), false);
    assert.equal(series.chart().count, 0);
  }
});

test('sampling defaults to the actual client clock and does not retain mutable input or output objects', () => {
  const clocked = new Function('baseclass', 'Date', source)({ extend: value => value }, { now: () => 12345 });
  const series = clocked.createSeries();
  const input = status();
  series.push(input);
  input.memory_bytes = 1;
  const chart = series.chart();
  assert.equal(chart.firstAt, 12345);
  assert.equal(chart.latestBytes, 64 * MIB);
  chart.points[0].bytes = 1;
  chart.points.push({ bytes: 2 });
  chart.xTicks[0].at = 1;
  assert.equal(series.chart().count, 1);
  assert.equal(series.chart().latestBytes, 64 * MIB);
  assert.equal(series.chart().firstAt, 12345);
});

test('chart dimensions and tiny or large measurements never create NaN or invalid SVG coordinates', () => {
  for (const bytes of [1, MIB, 100 * MIB, Number.MAX_SAFE_INTEGER]) {
    const series = telemetry.createSeries();
    series.push(status(bytes), 0);
    series.push(status(bytes), 5000);
    for (const [width, height] of [[0, -1], [NaN, Infinity], [200, 100], [200.006, 100.004], [0.001, 0.006], [1e300, 1e300]]) {
      const chart = series.chart(width, height);
      assert.doesNotMatch(chart.linePath + chart.areaPath, /NaN|Infinity|undefined/);
      for (const point of chart.points) {
        assert.ok(point.x >= 0 && point.x <= chart.width);
        assert.ok(point.y >= 0 && point.y <= chart.height);
      }
    }
  }
});

test('storage ratios handle full or empty disks and reject inconsistent or absent data', () => {
  assert.deepEqual(telemetry.storage(100, 96), { availableRatio: 0.96, usedRatio: 1 - 0.96, availablePercent: 96, usedPercent: 4 });
  assert.deepEqual(telemetry.storage(100, 0), { availableRatio: 0, usedRatio: 1, availablePercent: 0, usedPercent: 100 });
  assert.deepEqual(telemetry.storage(100, 100), { availableRatio: 1, usedRatio: 0, availablePercent: 100, usedPercent: 0 });
  for (const pair of [[0, 0], [100, 101], [100, -1], [null, 0], [100, undefined], [Infinity, 0], ['100', 10], [100, 1.5]]) {
    assert.equal(telemetry.storage(...pair), null);
  }
});
