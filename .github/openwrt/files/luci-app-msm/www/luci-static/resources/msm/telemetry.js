'use strict';
'require baseclass';

var MIB = 1048576;
var MAX_SAFE_INTEGER = 9007199254740991;
var MAX_GAP_MS = 15000;

function finite(value) {
	return typeof value === 'number' && isFinite(value);
}

function integer(value) {
	return finite(value) && value >= 0 && value <= MAX_SAFE_INTEGER && Math.floor(value) === value;
}

function dimension(value, fallback) {
	return finite(value) && value > 0 ? coordinate(Math.max(1, Math.min(value, 4096))) : fallback;
}

function coordinate(value) {
	return Math.round(value * 100) / 100;
}

function axisMaximum(bytes) {
	var value = Math.max(1, bytes / MIB);
	var magnitude = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
	var normalized = value / magnitude;
	return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude * MIB;
}

return baseclass.extend({
	createSeries: function(limit) {
		limit = finite(limit) && limit >= 1 ? Math.min(60, Math.floor(limit)) : 60;
		var samples = [];

		return {
			// Only actual msm.status responses may be sampled. Pass null on RPC
			// failure; this module never persists, seeds, or interpolates history.
			push: function(status, now) {
				if (now === undefined) now = Date.now();
				if (!status || status.running !== true || !integer(status.pid) || status.pid === 0 ||
					!integer(status.memory_bytes) || status.memory_bytes === 0 || !integer(now)) {
					// rpcd reports zero RSS when /proc could not be read, not a measured
					// zero-memory process. Do not draw a misleading drop to zero.
					samples = [];
					return false;
				}
				var previous = samples[samples.length - 1];
				var uptime = integer(status.uptime_seconds) ? status.uptime_seconds : null;
				if (previous && (status.pid !== previous.pid || now < previous.at || now - previous.at > MAX_GAP_MS ||
					(uptime !== null && previous.uptime !== null && uptime < previous.uptime))) {
					samples = [];
					previous = null;
				}
				var sample = { at: now, bytes: status.memory_bytes, pid: status.pid, uptime: uptime };
				if (previous && now === previous.at) samples[samples.length - 1] = sample;
				else samples.push(sample);
				if (samples.length > limit) samples.shift();
				return true;
			},

			chart: function(width, height) {
				width = dimension(width, 360);
				height = dimension(height, 120);
				var count = samples.length;
				var first = count ? samples[0].at : null;
				var last = count ? samples[count - 1].at : null;
				var maximum = count ? axisMaximum(Math.max.apply(null, samples.map(function(sample) { return sample.bytes; }))) : MIB;
				var points = samples.map(function(sample) {
					return {
						x: coordinate(count === 1 ? width : (sample.at - first) / (last - first) * width),
						y: coordinate(height * (1 - sample.bytes / maximum)),
						at: sample.at,
						bytes: sample.bytes
					};
				});
				var line = points.map(function(point, index) { return (index ? 'L' : 'M') + point.x + ',' + point.y; }).join(' ');
				var area = count > 1 ? line + ' L' + points[count - 1].x + ',' + height + ' L' + points[0].x + ',' + height + ' Z' : '';
				var tickIndexes = count > 2 ? [0, Math.floor((count - 1) / 2), count - 1] : count === 2 ? [0, 1] : count ? [0] : [];
				return {
					width: width,
					height: height,
					count: count,
					points: points,
					linePath: line,
					areaPath: area,
					maxBytes: maximum,
					latestBytes: count ? samples[count - 1].bytes : null,
					firstAt: first,
					lastAt: last,
					yTicks: [0, 0.5, 1].map(function(fraction) { return { y: fraction * height, bytes: maximum * (1 - fraction) }; }),
					xTicks: tickIndexes.map(function(index) { return { x: points[index].x, at: points[index].at }; })
				};
			}
		};
	},

	storage: function(total, available) {
		if (!integer(total) || total === 0 || !integer(available) || available > total) return null;
		var ratio = available / total;
		var percent = Math.round(ratio * 100);
		return { availableRatio: ratio, usedRatio: 1 - ratio, availablePercent: percent, usedPercent: 100 - percent };
	}
});
