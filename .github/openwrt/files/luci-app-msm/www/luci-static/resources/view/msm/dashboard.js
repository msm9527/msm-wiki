'use strict';
'require view';
'require form';
'require uci';
'require rpc';
'require poll';
'require ui';
'require msm.dashboard as dashboard';
'require msm.telemetry as telemetry';

var t = dashboard.t;
var callStatus = rpc.declare({ object: 'msm', method: 'status', expect: { '': {} }, reject: true });
var callAction = rpc.declare({ object: 'msm', method: 'action', params: ['action'], expect: { '': {} }, reject: true });
var callLogs = rpc.declare({ object: 'msm', method: 'logs', params: ['lines'], expect: { '': {} }, reject: true });
var callCommit = rpc.declare({ object: 'uci', method: 'commit', params: ['config'], reject: true });

function svg(tag, attrs, children) {
	var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
	Object.keys(attrs || {}).forEach(function(key) { node.setAttribute(key, attrs[key]); });
	(children || []).forEach(function(child) { node.appendChild(child); });
	return node;
}
function icon(name) {
	var paths = {
		activity: 'M4 18V12M9 18V6M14 18V9M19 18V3',
		settings: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
		memory: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
		storage: 'M6 4h12l3 9v6H3v-6zM3 13h18M7 16h2M15 16h2',
		clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l4 2',
		layers: 'M12 3l10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5',
		file: 'M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h8',
		power: 'M12 2v10M6 5a9 9 0 1 0 12 0',
		restart: 'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
		arrow: 'M7 17L17 7M7 7h10v10',
		start: 'M7 4l14 8-14 8z', stop: 'M6 6h12v12H6z',
		download: 'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
		link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2'
	};
	return svg('svg', { 'class': 'msm-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [svg('path', { d: paths[name] || paths.activity })]);
}
function button(label, style, handler, symbol) {
	return E('button', { 'type': 'button', 'class': 'cbi-button msm-button ' + (style || ''), 'click': handler }, symbol ? [icon(symbol), E('span', {}, label)] : label);
}
function heading(title, caption, symbol) {
	return E('div', { 'class': 'msm-panel-header' }, [E('h3', {}, [icon(symbol || 'activity'), E('span', {}, title)]), E('p', { 'class': 'msm-caption' }, caption)]);
}

return view.extend({
	handleSave: null,
	handleSaveApply: null,
	handleReset: null,
	load: function() {
		return Promise.all([uci.load('msm'), callStatus().catch(function() { return null; })]);
	},
	render: function(data) {
		var formRoot, busy = false, dirty = false, current = data[1], logLines = [], logSource = '', logLoaded = false;
		var series = telemetry.createSeries(60);
		var m = new form.Map('msm'), section = m.section(form.NamedSection, 'main', 'msm');
		section.anonymous = true;
		section.addremove = false;
		var enabled = section.option(form.Flag, 'enabled', t('启用服务', 'Enable service'),
			t('保存后立即生效，并在设备开机时自动启动。', 'Applied when saved. Starts automatically when the router boots.'));
		enabled.rmempty = false;
		var port = section.option(form.Value, 'port', t('控制台端口', 'Console port'));
		port.datatype = 'port'; port.default = '7777'; port.rmempty = false;
		port.validate = function(sectionId, value) { return dashboard.address('localhost', value) ? true : t('端口必须介于 1 和 65535 之间。', 'The port must be between 1 and 65535.'); };
		var directory = section.option(form.Value, 'config_dir', t('数据目录', 'Data directory'),
			t('保存配置、数据库和服务内核。更换目录不会自动迁移原有数据，请使用持久化存储。', 'Stores configuration, database and service binaries. Changing this path does not migrate existing data. Use persistent storage.'));
		directory.default = '/etc/msm'; directory.rmempty = false;
		directory.validate = function(sectionId, value) {
			return dashboard.validDirectory(value) ? true : t('请输入规范的绝对路径，不能为 /，也不能包含 ..、. 或重复斜杠。', 'Use an absolute directory other than /, without dot components or repeated slashes.');
		};
		var notice = E('div', { 'class': 'msm-notice', 'role': 'status', 'aria-live': 'polite', 'hidden': true });
		var status = E('h3', { 'class': 'msm-status-title', 'data-state': 'unknown' });
		var consoleLink = E('a', { 'class': 'msm-button primary', 'target': '_blank', 'rel': 'noopener noreferrer' }, [E('span', {}, t('打开 MSM 控制台', 'Open MSM console')), icon('arrow')]);
		var address = E('a', { 'target': '_blank', 'rel': 'noopener noreferrer' }), pid = E('span', { 'class': 'msm-meta-value' }), startup = E('span', { 'class': 'msm-meta-value' }), dataPath = E('span', { 'class': 'msm-data-path' });
		var updated = E('span', { 'class': 'msm-updated' }), saveHint = E('span', { 'class': 'msm-caption' });
		var stats = {};
		['version', 'uptime', 'memory', 'storage'].forEach(function(key) { stats[key] = { value: E('span', { 'class': key === 'memory' || key === 'storage' ? 'msm-stat-value' : 'msm-meta-value' }, '—'), hint: E('span', { 'class': 'msm-caption' }) }; });
		function meta(label, value, symbol) {
			return E('div', { 'class': 'msm-meta-item' }, [icon(symbol), E('div', {}, [E('span', { 'class': 'msm-meta-label' }, label), value])]);
		}
		var chartFill = svg('path', { 'class': 'msm-chart-fill' }), chartLine = svg('path', { 'class': 'msm-chart-line' });
		var chartDot = svg('circle', { 'class': 'msm-chart-dot', r: '3' }), chartTicks = svg('g', {});
		var chart = svg('svg', { 'class': 'msm-chart', viewBox: '0 0 400 160', role: 'img', 'aria-label': t('MSM 进程内存实时趋势', 'Live MSM memory samples') }, [chartTicks, chartFill, chartLine, chartDot]);
		var chartFirst = E('span'), chartLast = E('span'), chartNote = E('span', { 'class': 'msm-chart-note' });
		var storageBar = E('span'), storageCaption = E('span', { 'class': 'msm-storage-caption' });
		function drawTelemetry(value) {
			series.push(value);
			var graph = series.chart(352, 120);
			[chartFill, chartLine, chartDot].forEach(function(node) { node.setAttribute('transform', 'translate(42 10)'); });
			chartFill.setAttribute('d', graph.areaPath); chartLine.setAttribute('d', graph.linePath);
			chartTicks.textContent = '';
			graph.yTicks.forEach(function(tick) {
				chartTicks.appendChild(svg('line', { x1: 42, x2: 394, y1: tick.y + 10, y2: tick.y + 10 }));
				var label = svg('text', { x: 34, y: tick.y + 14, 'text-anchor': 'end' }); label.textContent = Math.round(tick.bytes / 1048576); chartTicks.appendChild(label);
			});
			var point = graph.points[graph.points.length - 1];
			chartDot.setAttribute('visibility', point ? 'visible' : 'hidden');
			if (point) { chartDot.setAttribute('cx', point.x); chartDot.setAttribute('cy', point.y); }
			chartFirst.textContent = graph.firstAt == null ? '—' : new Date(graph.firstAt).toLocaleTimeString();
			chartLast.textContent = graph.lastAt == null ? '—' : new Date(graph.lastAt).toLocaleTimeString();
			chartNote.textContent = graph.count < 2 ? t('等待采样 · 启动后每 5 秒记录一次', 'Waiting for samples · records every 5s while running') : t('本页实时采样 · ', 'Live page samples · ') + graph.count + t(' 个数据点', ' points');
			var disk = value && telemetry.storage(value.storage_total_bytes, value.storage_available_bytes);
			storageBar.style.width = disk ? disk.availablePercent + '%' : '0%';
			storageCaption.textContent = disk ? disk.availablePercent.toFixed(0) + t('% 可用', '% available') : t('存储信息不可用', 'Storage unavailable');
		}
		function tell(message, kind) { notice.textContent = message; notice.setAttribute('data-kind', kind || 'info'); notice.hidden = false; }
		function actionsState() {
			var readonly = m.readonly === true, known = current && typeof current.running === 'boolean';
			start.disabled = busy || readonly || !known || !current.installed || current.running || !current.enabled;
			stop.disabled = busy || readonly || !known || !current.running;
			restart.disabled = busy || readonly || !known || !current.installed || !current.enabled;
			if (formRoot) formRoot.disabled = busy || readonly;
			save.disabled = busy || readonly; reset.disabled = busy || readonly; refresh.disabled = busy;
			saveHint.textContent = dirty ? t('有未保存的修改', 'Unsaved changes') : t('配置仅作用于 MSM 服务', 'Settings apply to MSM only');
		}
		function update(value) {
			current = value;
			var known = value && typeof value.running === 'boolean';
			status.setAttribute('data-state', known ? value.running ? 'running' : 'stopped' : 'unknown');
			status.textContent = known ? value.running ? t('服务正在运行', 'Service is running') : t('服务已停止', 'Service stopped') : t('状态暂不可用', 'Status unavailable');
			var url = known ? dashboard.address(window.location.hostname, value.port) : null;
			[consoleLink, address].forEach(function(link) {
				if (url) link.setAttribute('href', url); else link.removeAttribute('href');
				link.setAttribute('aria-disabled', String(!url || !value.running));
			});
			address.textContent = url || '—';
			stats.version.value.textContent = known ? (value.version || '—').replace(/[_~]beta-r\d+$/, ' Beta') : '—';
			stats.version.value.setAttribute('title', known ? value.version || '' : '');
			stats.version.hint.textContent = known && value.version ? /beta|rc|alpha/.test(value.version) ? t('测试版 · Beta', 'Beta channel') : t('已安装的服务版本', 'Installed service version') : t('未获取到版本信息', 'Version unavailable');
			stats.uptime.value.textContent = known && value.running ? dashboard.uptime(value.uptime_seconds) : '—';
			stats.memory.value.textContent = known && value.running ? dashboard.bytes(value.memory_bytes) : '—';
			stats.storage.value.textContent = known ? dashboard.bytes(value.storage_available_bytes) : '—';
			stats.storage.hint.textContent = known && value.storage_total_bytes ? t('所在分区共 ', 'Partition total: ') + dashboard.bytes(value.storage_total_bytes) : t('数据目录所在分区', 'Data partition');
			pid.textContent = known && value.pid ? String(value.pid) : '—';
			startup.textContent = known ? value.enabled ? t('已启用', 'Enabled') : t('未启用', 'Disabled') : '—';
			dataPath.textContent = known ? value.config_dir || '—' : '—';
			updated.textContent = known ? t('每 5 秒刷新 · ', 'Updates every 5s · ') + new Date().toLocaleTimeString() : t('连接暂不可用，请刷新重试', 'Connection unavailable. Try refreshing.');
			drawTelemetry(value);
			actionsState();
		}
		function refreshStatus() { return callStatus().then(update).catch(function() { update(null); }); }
		function waitForState(running, remaining) {
			return callStatus().then(function(value) {
				update(value);
				if (value.running === running) return;
				if (!remaining) throw new Error(t('操作已提交，但服务尚未达到预期状态，请查看日志。', 'The action was submitted, but the service has not reached the expected state. Check the logs.'));
				return new Promise(function(resolve) { window.setTimeout(resolve, 800); }).then(function() { return waitForState(running, remaining - 1); });
			});
		}
		function perform(action, saved) {
			if (busy || m.readonly === true) return Promise.resolve();
			busy = true; actionsState();
			tell(t('正在处理，请稍候…', 'Working, please wait…'));
			return callAction(action).then(function(result) {
				if (!result.ok) throw new Error(dashboard.error(result));
				return waitForState(action !== 'stop', 12);
			}).then(function() {
				tell(saved ? t('配置已保存并生效。', 'Settings saved and applied.') : action === 'stop' ? t('MSM 服务已停止。', 'MSM service stopped.') : action === 'start' ? t('MSM 服务已启动。', 'MSM service started.') : t('MSM 服务已重新启动。', 'MSM service restarted.'), 'success');
				if (logLoaded) loadLogs();
			}).catch(function(error) { tell(error.message, 'error'); }).finally(function() { busy = false; actionsState(); });
		}
		var start = button(t('启动', 'Start'), 'subtle', function() { return perform('start'); }, 'start');
		var restart = button(t('重启服务', 'Restart'), 'subtle', function() { return perform('restart'); }, 'restart');
		var stop = button(t('停止', 'Stop'), 'danger', function() {
			ui.showModal(t('停止 MSM 服务？', 'Stop MSM service?'), [E('p', {}, t('由 MSM 托管的服务会一同停止。启用状态保持不变，下次开机仍会自动启动。', 'Services managed by MSM will also stop. The enable setting stays unchanged, so MSM will start on the next boot.')),
				E('div', { 'class': 'right' }, [button(t('取消', 'Cancel'), '', ui.hideModal), button(t('确认停止', 'Stop service'), 'danger', function() { ui.hideModal(); perform('stop'); })])]);
		}, 'stop');
		var refresh = button(t('刷新状态', 'Refresh'), 'subtle', refreshStatus, 'restart');
		function saveSettings() {
			if (busy || m.readonly === true) return Promise.resolve();
			busy = true; actionsState();
			return m.save(null, true).then(function() { return callCommit('msm'); }).then(function() {
				dirty = false;
				if (ui.changes && ui.changes.init) ui.changes.init();
				busy = false;
				return perform(uci.get('msm', 'main', 'enabled') === '1' ? 'restart' : 'stop', true);
			}).catch(function(error) { tell(error.message || t('请检查配置项', 'Check the settings'), 'error'); }).finally(function() { busy = false; actionsState(); });
		}
		var save = button(t('保存并应用', 'Save & apply'), 'primary', function() {
			if (current && directory.formvalue('main') !== current.config_dir) {
				ui.showModal(t('更换数据目录', 'Change data directory'), [E('p', {}, t('现有数据不会自动迁移。请确认新目录已经准备好；空目录会进入首次初始化。', 'Existing data will not be moved. Prepare the new directory first; an empty directory starts a new setup.')),
					E('div', { 'class': 'right' }, [button(t('取消', 'Cancel'), '', ui.hideModal), button(t('确认并保存', 'Confirm & save'), 'primary', function() { ui.hideModal(); saveSettings(); })])]);
			} else return saveSettings();
		});
		var reset = button(t('放弃修改', 'Discard edits'), 'subtle', function() {
			if (busy || m.readonly === true) return Promise.resolve();
			busy = true; actionsState();
			uci.unload('msm');
			return uci.load('msm').then(function() { return m.load(); }).then(function() { return m.reset(); }).then(function() { dirty = false; notice.hidden = true; })
				.catch(function(error) { tell(error.message, 'error'); }).finally(function() { busy = false; actionsState(); });
		});
		var logOutput = E('div', { 'class': 'msm-log-output', 'tabindex': '0', 'role': 'region', 'aria-label': t('MSM 服务日志', 'MSM service logs') }, E('div', { 'class': 'msm-log-empty' }, t('点击“读取日志”查看最近的服务记录。', 'Read logs to see recent service activity.')));
		var logMeta = E('span', { 'class': 'msm-log-meta' });
		var search = E('input', { 'class': 'msm-search', 'type': 'search', 'placeholder': t('搜索日志内容…', 'Search logs…'), 'aria-label': t('搜索日志', 'Search logs'), 'input': renderLogs });
		var filter = E('select', { 'class': 'msm-filter', 'aria-label': t('日志级别', 'Log level'), 'change': renderLogs }, [E('option', { 'value': 'all' }, t('全部级别', 'All levels')), E('option', { 'value': 'warn' }, t('警告与错误', 'Warnings & errors')), E('option', { 'value': 'error' }, t('仅错误', 'Errors only'))]);
		function renderLogs() {
			var entries = dashboard.filteredEntries(logLines, filter.value || 'all', search.value || '');
			logOutput.textContent = '';
			if (!entries.length) logOutput.appendChild(E('div', { 'class': 'msm-log-empty' }, logLines.length ? t('没有符合筛选条件的日志。', 'No matching log entries.') : t('暂无服务日志。启动 MSM 后可在这里查看。', 'No logs yet. Start MSM to see service activity.')));
			entries.forEach(function(entry) {
				var level = ['debug', 'info', 'warn', 'warning', 'error', 'fatal', 'panic'].indexOf(entry.level) !== -1 ? entry.level : 'info';
				logOutput.appendChild(E('div', { 'class': 'msm-log-row' }, [E('time', { 'class': 'msm-log-time', title: entry.timestamp }, [entry.time]), E('span', { 'class': 'msm-log-level', 'data-level': level }, [level.toUpperCase()]), E('span', { 'class': 'msm-log-message' }, [entry.message])]));
			});
			logMeta.textContent = t('显示 ', 'Showing ') + entries.length + ' / ' + logLines.length + t(' 行', ' lines') + (logSource ? ' · ' + logSource : '');
		}
		function loadLogs() {
			readLogs.disabled = true;
			return callLogs(200).then(function(result) {
				if (result.error) throw new Error(dashboard.error(result));
				logLines = result.lines || []; logSource = result.source || ''; logLoaded = true;
				renderLogs();
			}).catch(function(error) { logOutput.textContent = t('读取失败：', 'Unable to read logs: ') + error.message; }).finally(function() { readLogs.disabled = false; });
		}
		var readLogs = button(t('读取日志', 'Read logs'), 'subtle', loadLogs, 'restart');
		var downloadLogs = button(t('下载日志', 'Download'), 'subtle', function() {
			return (logLoaded ? Promise.resolve() : loadLogs()).then(function() {
				if (!logLoaded) return;
				var url = URL.createObjectURL(new Blob([logLines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
				var link = E('a', { 'href': url, 'download': 'msm-service.log' }); document.body.appendChild(link); link.click(); link.remove();
				window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
			});
		}, 'download');
		return m.render().then(function(map) {
			formRoot = E('fieldset', { 'class': 'msm-form' }, map);
			['input', 'change'].forEach(function(event) { formRoot.addEventListener(event, function() { dirty = true; actionsState(); }); });
			var root = E('div', { 'class': 'msm-dashboard', 'data-theme': dashboard.theme() }, [
				E('link', { 'rel': 'stylesheet', 'href': L.resource('msm/dashboard.css') + '?v=3' }),
				E('div', { 'class': 'msm-titlebar' }, [E('div', { 'class': 'msm-breadcrumb' }, t('服务 / MSM', 'Services / MSM')), E('h2', { 'class': 'msm-heading' }, t('MSM 服务管理', 'MSM service manager')), E('p', { 'class': 'msm-subtitle' }, t('让 DNS 与网络服务，始终有序运行。', 'Keep your DNS and network services running smoothly.'))]),
				notice,
				E('section', { 'class': 'msm-hero' }, [E('div', { 'class': 'msm-emblem' }, [E('img', { src: L.resource('msm/logo.svg'), alt: 'MSM', width: 68, height: 88 }), E('span', {}, 'MSM')]), E('div', { 'class': 'msm-hero-content' }, [E('div', { 'class': 'msm-hero-top' }, [E('div', { 'class': 'msm-status-copy' }, [status, updated, E('p', { 'class': 'msm-caption' }, t('在控制台管理 DNS、代理内核与规则。', 'Manage DNS, proxy cores and rules in the console.'))]), E('div', { 'class': 'msm-hero-actions' }, [consoleLink, restart])]), E('div', { 'class': 'msm-meta' }, [meta(t('服务版本', 'Version'), stats.version.value, 'layers'), meta(t('连续运行', 'Uptime'), stats.uptime.value, 'clock'), meta(t('进程 PID', 'Process PID'), pid, 'file'), meta(t('开机启动', 'Start on boot'), startup, 'power')])])]),
				E('div', { 'class': 'msm-grid' }, [
					E('section', { 'class': 'msm-panel msm-overview' }, [heading(t('运行概览', 'Runtime overview'), t('本页打开后的实时状态与资源采样。', 'Live status and resource samples since this page was opened.'), 'activity'), E('div', { 'class': 'msm-resource-grid' }, [E('div', { 'class': 'msm-memory-card' }, [E('div', { 'class': 'msm-resource-title' }, [icon('memory'), E('span', {}, t('进程内存', 'Process memory'))]), stats.memory.value, E('div', { 'class': 'msm-chart-wrap' }, chart), E('div', { 'class': 'msm-chart-labels' }, [chartFirst, chartLast]), chartNote]), E('div', { 'class': 'msm-storage-card' }, [E('div', { 'class': 'msm-resource-title' }, [icon('storage'), E('span', {}, t('可用存储', 'Free storage'))]), stats.storage.value, stats.storage.hint, E('div', { 'class': 'msm-storage-meter', 'aria-hidden': 'true' }, storageBar), storageCaption, dataPath])]), E('div', { 'class': 'msm-resource-footer' }, [E('span', {}, t('5 秒采样 · 最多保留 60 个数据点', '5s sampling · up to 60 points')), refresh])]),
					E('section', { 'class': 'msm-panel msm-settings' }, [heading(t('服务设置', 'Service settings'), t('配置启动方式、控制台端口与存储位置。', 'Configure startup, console access and storage.'), 'settings'), formRoot, E('div', { 'class': 'msm-footer' }, [saveHint, E('div', {}, [reset, save])])])
				]),
				E('section', { 'class': 'msm-panel msm-logs' }, [E('div', { 'class': 'msm-logs-heading' }, [heading(t('运行日志', 'Service logs'), t('最近 200 行，快速定位启动与运行问题。', 'The latest 200 lines for runtime diagnostics.'), 'file'), E('div', { 'class': 'msm-log-toolbar' }, [search, filter, readLogs, downloadLogs])]), E('div', { 'class': 'msm-log-table' }, [E('div', { 'class': 'msm-log-tablehead', 'aria-hidden': 'true' }, [E('span', {}, t('时间', 'Time')), E('span', {}, t('级别', 'Level')), E('span', {}, t('内容', 'Message'))]), logOutput]), logMeta, E('div', { 'class': 'msm-console-footer' }, [E('div', { 'class': 'msm-console-address' }, [icon('link'), E('span', {}, t('控制台地址', 'Console address')), address]), E('div', { 'class': 'msm-controls' }, [start, stop])])])
			]);
			[consoleLink, address].forEach(function(link) { link.addEventListener('click', function(event) { if (link.getAttribute('aria-disabled') === 'true') event.preventDefault(); }); });
			update(current);
			poll.add(function() { if (!busy) return refreshStatus(); }, 5);
			return root;
		});
	}
});
