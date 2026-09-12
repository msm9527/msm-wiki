'use strict';
'require view';
'require form';
'require uci';
'require rpc';
'require poll';

var callServiceList = rpc.declare({
	object: 'service', method: 'list', params: ['name'], expect: { '': {} }
});
var callGetPort = rpc.declare({
	object: 'uci', method: 'get', params: ['config', 'section', 'option'], expect: { value: '7777' }
});

return view.extend({
	load: function() {
		return Promise.all([uci.load('msm'), callServiceList('msm')]);
	},
	render: function(data) {
		var m = new form.Map('msm', _('MSM'),
			_('Manage the MSM service. Enable it and Save & Apply, then open the Web UI to complete setup.'));
		var s = m.section(form.NamedSection, 'main', 'msm');
		s.anonymous = true;
		s.addremove = false;
		var o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;
		o = s.option(form.Value, 'port', _('Web UI port'));
		o.datatype = 'port';
		o.default = '7777';
		o.rmempty = false;
		o = s.option(form.Value, 'config_dir', _('Data directory'),
			_('Stores configuration, database, logs and downloaded services. Use persistent storage with enough free space. Changing this path does not move existing data.'));
		o.default = '/etc/msm';
		o.rmempty = false;
		o.validate = function(section, value) {
			return value && value.charAt(0) === '/' && value !== '/' && !/\/\/|(^|\/)\.{1,2}(\/|$)|[\r\n\0]/.test(value) ? true : _('Use an absolute directory path other than / without dot components or repeated slashes.');
		};
		return m.render().then(function(map) {
			var host = window.location.hostname;
			if (host.indexOf(':') !== -1 && host.charAt(0) !== '[') host = '[' + host + ']';
			var status = E('span');
			var link = E('a', {
				'class': 'cbi-button cbi-button-action',
				'target': '_blank', 'rel': 'noopener noreferrer'
			}, _('Open MSM Web UI'));
			function update(service, port) {
				var instances = ((service || {}).msm || {}).instances || {};
				var running = Object.keys(instances).some(function(key) { return instances[key].running; });
				status.textContent = running ? _('Running') : _('Stopped');
				var validPort = /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
				link.setAttribute('href', validPort ? 'http://' + host + ':' + port + '/' : '#');
			}
			update(data[1], uci.get('msm', 'main', 'port') || '7777');
			poll.add(function() {
				// Read committed UCI through RPC without unloading form state, so
				// polling never discards edits that have not yet been saved.
				return Promise.all([callServiceList('msm'), callGetPort('msm', 'main', 'port')])
					.then(function(values) { update(values[0], values[1]); })
					.catch(function() { status.textContent = _('Unavailable'); });
			}, 5);
			return E('div', {}, [
				E('p', {}, [_('Service status: '), status]),
				E('p', {}, link), map
			]);
		});
	}
});
