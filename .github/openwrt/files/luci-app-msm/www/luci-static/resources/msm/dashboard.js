'use strict';
'require baseclass';

var zh = /^zh\b/i.test(document.documentElement.lang || '') || /lang_zh/.test(document.body.className);
function text(cn, en) { return zh ? cn : en; }

return baseclass.extend({
	t: text,
	bytes: function(value) {
		if (value == null) return '—';
		value = Number(value);
		if (!isFinite(value) || value < 0) return '—';
		var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'], index = 0;
		while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
		return value.toFixed(index > 0 ? 1 : 0) + ' ' + units[index];
	},
	uptime: function(seconds) {
		if (seconds == null || !isFinite(Number(seconds)) || Number(seconds) < 0) return '—';
		seconds = Number(seconds);
		var days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
		if (days) return days + text(' 天 ', 'd ') + hours + text(' 小时', 'h');
		if (hours) return hours + text(' 小时 ', 'h ') + minutes + text(' 分钟', 'm');
		return minutes ? minutes + text(' 分钟', 'm') : Math.floor(seconds) + text(' 秒', 's');
	},
	address: function(host, port) {
		if (!/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) return null;
		if (host.indexOf(':') !== -1 && host.charAt(0) !== '[') host = '[' + host + ']';
		return 'http://' + host + ':' + port + '/';
	},
	validDirectory: function(value) {
		return !!value && new TextEncoder().encode(value).length <= 512 && value.charAt(0) === '/' && value !== '/' && !/\/\/|(^|\/)\.{1,2}(\/|$)|[\x00-\x1f\x7f]/.test(value);
	},
	logEntry: function(line) {
		try {
			var entry = JSON.parse(line), stamp = entry.time ? new Date(entry.time) : null;
			if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
				var level = String(entry.level || 'info').toLowerCase();
				var details = Object.keys(entry).filter(function(key) { return ['time', 'level', 'msg', 'caller'].indexOf(key) === -1; })
					.map(function(key) { return key + '=' + (typeof entry[key] === 'string' ? entry[key] : JSON.stringify(entry[key])); });
				var message = String(entry.msg || '') + (details.length ? '  ·  ' + details.join('  ') : '');
				var time = stamp && !isNaN(stamp.getTime()) ? stamp : null;
				return { level: level, time: time ? time.toLocaleTimeString() : '—', timestamp: time ? time.toLocaleString() : '', message: message,
					content: (time ? time.toLocaleString() + '  ' : '') + level.toUpperCase().padEnd(5) + '  ' + message };
			}
		} catch (e) { /* Plain-text startup logs remain readable. */ }
		return { level: 'info', time: '—', timestamp: '', message: String(line), content: String(line) };
	},
	filteredEntries: function(lines, level, query) {
		query = (query || '').toLowerCase();
		return lines.map(this.logEntry).filter(function(entry) {
			return (level === 'all' || (level === 'warn' ? ['warn', 'warning', 'error', 'fatal', 'panic'].indexOf(entry.level) !== -1 : ['error', 'fatal', 'panic'].indexOf(entry.level) !== -1)) &&
				(!query || entry.content.toLowerCase().indexOf(query) !== -1);
		});
	},
	filteredLogs: function(lines, level, query) {
		return this.filteredEntries(lines, level, query).map(function(entry) { return entry.content; }).join('\n');
	},
	error: function(result) {
		var messages = {
			disabled: ['请先启用服务并保存设置，再启动 MSM。', 'Enable the service and save its settings before starting MSM.'],
			invalid_action: ['不支持此服务操作。', 'Unsupported service action.'],
			invalid_arguments: ['操作参数无效。', 'Invalid action arguments.'],
			not_installed: ['未检测到 MSM，请先安装服务包。', 'MSM is not installed. Install the service package first.'],
			invalid_config: ['服务配置无效，请检查端口和数据目录。', 'Invalid service configuration. Check the port and data directory.'],
			action_failed: ['服务操作失败，请查看运行日志。', 'The service action failed. Check the logs.'],
			action_timeout: ['服务操作超时，请查看状态与日志。', 'The action timed out. Check the service status and logs.'],
			invalid_lines: ['日志行数无效。', 'Invalid log line limit.'],
			log_unavailable: ['暂无可读取的 MSM 日志。', 'MSM logs are not available yet.'],
			unsafe_log_path: ['日志路径不符合安全要求，请检查数据目录。', 'The log path is not allowed. Check the data directory.'],
			log_read_failed: ['日志暂时无法读取，请稍后重试。', 'Unable to read the logs. Try again later.']
		};
		var message = messages[result.error_code];
		return message ? text(message[0], message[1]) : result.error || text('操作失败，请稍后重试。', 'The action failed. Try again later.');
	},
	theme: function() {
		var rgb = window.getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
		return rgb && Number(rgb[0]) * .299 + Number(rgb[1]) * .587 + Number(rgb[2]) * .114 < 128 ? 'dark' : 'light';
	}
});
