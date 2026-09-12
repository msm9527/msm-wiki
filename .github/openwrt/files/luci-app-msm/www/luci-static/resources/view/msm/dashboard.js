'use strict';
'require view';
'require form';
'require uci';
'require rpc';
'require poll';
'require ui';
'require msm.dashboard as dashboard';

var t = dashboard.t;
var callStatus = rpc.declare({ object: 'msm', method: 'status', expect: { '': {} }, reject: true });
var callAction = rpc.declare({ object: 'msm', method: 'action', params: ['action'], expect: { '': {} }, reject: true });
var callLogs = rpc.declare({ object: 'msm', method: 'logs', params: ['lines'], expect: { '': {} }, reject: true });
var callCommit = rpc.declare({ object: 'uci', method: 'commit', params: ['config'], reject: true });

function button(label, style, handler) {
	return E('button', { 'type': 'button', 'class': 'cbi-button msm-button ' + (style || ''), 'click': handler }, label);
}
function heading(title, caption) {
	return E('div', { 'class': 'msm-panel-header' }, [E('h3', {}, title), E('p', { 'class': 'msm-caption' }, caption)]);
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
		var status = E('span', { 'class': 'msm-status-pill', 'data-state': 'unknown' });
		var consoleLink = E('a', { 'class': 'msm-button primary', 'target': '_blank', 'rel': 'noopener noreferrer' }, t('打开 MSM 控制台 ↗', 'Open MSM console ↗'));
		var address = E('a', { 'target': '_blank', 'rel': 'noopener noreferrer' }), pid = E('dd'), startup = E('dd'), dataPath = E('dd');
		var updated = E('span', { 'class': 'msm-caption' }), saveHint = E('span', { 'class': 'msm-caption' });
		var stats = {};
		function stat(key, label, hint) {
			stats[key] = { value: E('div', { 'class': 'msm-stat-value' }, '—'), hint: E('div', { 'class': 'msm-stat-hint' }, hint) };
			return E('div', { 'class': 'msm-stat' }, [E('div', { 'class': 'msm-stat-label' }, label), stats[key].value, stats[key].hint]);
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
			status.textContent = known ? value.running ? t('运行中', 'Running') : t('已停止', 'Stopped') : t('状态不可用', 'Status unavailable');
			var url = known ? dashboard.address(window.location.hostname, value.port) : null;
			[consoleLink, address].forEach(function(link) {
				if (url) link.setAttribute('href', url); else link.removeAttribute('href');
				link.setAttribute('aria-disabled', String(!url || !value.running));
			});
			address.textContent = url || '—';
			stats.version.value.textContent = known ? value.version || '—' : '—';
			stats.version.hint.textContent = known && value.version ? /beta|rc|alpha/.test(value.version) ? t('测试版 · Beta', 'Beta channel') : t('已安装的服务版本', 'Installed service version') : t('未获取到版本信息', 'Version unavailable');
			stats.uptime.value.textContent = known && value.running ? dashboard.uptime(value.uptime_seconds) : '—';
			stats.memory.value.textContent = known && value.running ? dashboard.bytes(value.memory_bytes) : '—';
			stats.storage.value.textContent = known ? dashboard.bytes(value.storage_available_bytes) : '—';
			stats.storage.hint.textContent = known && value.storage_total_bytes ? t('所在分区共 ', 'Partition total: ') + dashboard.bytes(value.storage_total_bytes) : t('数据目录所在分区', 'Data partition');
			pid.textContent = known && value.pid ? String(value.pid) : '—';
			startup.textContent = known ? value.enabled ? t('已启用', 'Enabled') : t('未启用', 'Disabled') : '—';
			dataPath.textContent = known ? value.config_dir || '—' : '—';
			updated.textContent = known ? t('每 5 秒刷新 · ', 'Updates every 5s · ') + new Date().toLocaleTimeString() : t('连接暂不可用，请刷新重试', 'Connection unavailable. Try refreshing.');
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
		var start = button(t('启动', 'Start'), 'primary', function() { return perform('start'); });
		var restart = button(t('重启服务', 'Restart'), 'subtle', function() { return perform('restart'); });
		var stop = button(t('停止', 'Stop'), 'danger', function() {
			ui.showModal(t('停止 MSM 服务？', 'Stop MSM service?'), [E('p', {}, t('由 MSM 托管的服务会一同停止。启用状态保持不变，下次开机仍会自动启动。', 'Services managed by MSM will also stop. The enable setting stays unchanged, so MSM will start on the next boot.')),
				E('div', { 'class': 'right' }, [button(t('取消', 'Cancel'), '', ui.hideModal), button(t('确认停止', 'Stop service'), 'danger', function() { ui.hideModal(); perform('stop'); })])]);
		});
		var refresh = button(t('刷新状态', 'Refresh'), 'subtle', refreshStatus);
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
		var logOutput = E('pre', { 'class': 'msm-log-output', 'tabindex': '0', 'aria-label': t('MSM 服务日志', 'MSM service logs') }, t('点击“读取日志”查看最近的服务记录。', 'Read logs to see recent service activity.'));
		var logMeta = E('span', { 'class': 'msm-log-meta' });
		var search = E('input', { 'class': 'msm-search', 'type': 'search', 'placeholder': t('搜索日志内容…', 'Search logs…'), 'aria-label': t('搜索日志', 'Search logs'), 'input': renderLogs });
		var filter = E('select', { 'class': 'msm-filter', 'aria-label': t('日志级别', 'Log level'), 'change': renderLogs }, [E('option', { 'value': 'all' }, t('全部级别', 'All levels')), E('option', { 'value': 'warn' }, t('警告与错误', 'Warnings & errors')), E('option', { 'value': 'error' }, t('仅错误', 'Errors only'))]);
		function renderLogs() {
			var content = dashboard.filteredLogs(logLines, filter.value || 'all', search.value || '');
			logOutput.textContent = content || (logLines.length ? t('没有符合筛选条件的日志。', 'No matching log entries.') : t('暂无服务日志。启动 MSM 后可在这里查看。', 'No logs yet. Start MSM to see service activity.'));
			logMeta.textContent = t('最近 ', 'Latest ') + logLines.length + t(' 行', ' lines') + (logSource ? ' · ' + logSource : '');
		}
		function loadLogs() {
			readLogs.disabled = true;
			return callLogs(200).then(function(result) {
				if (result.error) throw new Error(dashboard.error(result));
				logLines = result.lines || []; logSource = result.source || ''; logLoaded = true;
				renderLogs();
			}).catch(function(error) { logOutput.textContent = t('读取失败：', 'Unable to read logs: ') + error.message; }).finally(function() { readLogs.disabled = false; });
		}
		var readLogs = button(t('读取日志', 'Read logs'), 'subtle', loadLogs);
		var downloadLogs = button(t('下载日志', 'Download'), 'subtle', function() {
			return (logLoaded ? Promise.resolve() : loadLogs()).then(function() {
				if (!logLoaded) return;
				var url = URL.createObjectURL(new Blob([logLines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
				var link = E('a', { 'href': url, 'download': 'msm-service.log' }); document.body.appendChild(link); link.click(); link.remove();
				window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
			});
		});
		return m.render().then(function(map) {
			formRoot = E('fieldset', { 'class': 'msm-form' }, map);
			['input', 'change'].forEach(function(event) { formRoot.addEventListener(event, function() { dirty = true; actionsState(); }); });
			var root = E('div', { 'class': 'msm-dashboard', 'data-theme': dashboard.theme() }, [
				E('link', { 'rel': 'stylesheet', 'href': L.resource('msm/dashboard.css') + '?v=2' }),
				E('header', { 'class': 'msm-hero' }, [E('div', { 'class': 'msm-brand' }, [E('div', { 'class': 'msm-monogram', 'aria-hidden': 'true' }, 'MSM'), E('div', {}, [E('div', { 'class': 'msm-kicker' }, 'OPENWRT / SERVICE MANAGER'), E('h2', { 'class': 'msm-heading' }, t('MSM 服务管理', 'MSM service manager')), E('p', { 'class': 'msm-subtitle' }, t('让 DNS 与网络服务，始终有序运行。', 'Keep your DNS and network services running smoothly.'))])]), E('div', { 'class': 'msm-hero-actions' }, [status, consoleLink])]),
				notice,
				E('div', { 'class': 'msm-stats' }, [stat('version', t('服务版本', 'Service version'), ''), stat('uptime', t('连续运行', 'Uptime'), t('本次进程启动后', 'Since the current process started')), stat('memory', t('内存占用', 'Memory usage'), t('MSM 主进程实际驻留内存', 'Resident memory of the MSM process')), stat('storage', t('可用存储', 'Available storage'), '')]),
				E('div', { 'class': 'msm-grid' }, [
					E('section', { 'class': 'msm-panel' }, [heading(t('基础设置', 'Settings'), t('调整服务启动方式、访问端口与数据存储位置。', 'Configure startup, console access and persistent storage.')), formRoot, E('div', { 'class': 'msm-footer' }, [saveHint, E('div', {}, [reset, save])])]),
					E('section', { 'class': 'msm-panel' }, [heading(t('服务操作', 'Service controls'), t('管理当前进程，运行状态会自动更新。', 'Control the service with live status updates.')), E('div', { 'class': 'msm-controls' }, [start, restart, stop]), E('dl', { 'class': 'msm-details' }, [E('dt', {}, t('控制台地址', 'Console address')), E('dd', {}, address), E('dt', {}, t('进程 PID', 'Process PID')), pid, E('dt', {}, t('开机启动', 'Start on boot')), startup, E('dt', {}, t('数据目录', 'Data directory')), dataPath]), E('p', { 'class': 'msm-help' }, t('首次使用请打开控制台完成初始化。DNS、代理内核与规则在 MSM 控制台中管理。', 'Open the console to complete initial setup. Manage DNS, proxy cores and rules inside MSM.')), E('div', { 'class': 'msm-footer' }, [updated, refresh])])
				]),
				E('section', { 'class': 'msm-panel msm-logs' }, [heading(t('运行日志', 'Service logs'), t('最近 200 行服务记录，帮助快速定位启动和运行问题。', 'The latest 200 lines to help diagnose startup and runtime issues.')), E('div', { 'class': 'msm-log-toolbar' }, [search, filter, readLogs, downloadLogs]), logOutput, logMeta])
			]);
			[consoleLink, address].forEach(function(link) { link.addEventListener('click', function(event) { if (link.getAttribute('aria-disabled') === 'true') event.preventDefault(); }); });
			update(current);
			poll.add(function() { if (!busy) return refreshStatus(); }, 5);
			return root;
		});
	}
});
