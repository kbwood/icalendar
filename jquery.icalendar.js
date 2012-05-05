/* http://keith-wood.name/icalendar.html
   iCalendar processing for jQuery v1.0.0.
   Written by Keith Wood (kbwood@virginbroadband.com.au) October 2008.
   Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and 
   MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses. 
   Please attribute the author if you use it. */

(function($) { // Hide scope, no $ conflict

var PROP_NAME = 'icalendar';
var FLASH_ID = 'icalendar-flash-copy';

/* iCalendar sharing manager. */
function iCalendar() {
	this._defaults = {
		sites: [],  // List of site IDs to use, empty for all
		icons: 'icalendar.png', // Horizontal amalgamation of all site icons
		iconSize: 16,  // The size of the individual icons
		target: '_blank',  // The name of the target window for the iCalendar links
		compact: false,  // True if a compact presentation should be used, false for full
		tipPrefix: '',  // Additional text to show in the tool tip for each icon
		echoUrl: '',  // The URL to echo back iCalendar content, or blank for clipboard
		echoField: '', // The ID of a field to copy the iCalendar definition into, or blank for clipboard
		start: null,  // The start date/time of the event
		end: null,  // The end date/time of the event
		title: '',  // The title of the event
		summary: '',  // The summary of the event
		description: '',  // The description of the event
		location: '',  // The location of the event
		url: '',  // A URL with more information about the event
		contact: '',  // An e-mail address for further contact about the event
		copyConfirm: 'The event will be copied to your clipboard. Continue?', // Confirmation message for clipboard copy
		copySucceeded: 'The event has been copied to your clipboard', // Success message during clipboard copy
		copyFailed: 'Failed to copy the event to the clipboard\n', // Failure message during clipboard copy
		copyFlash: 'clipboard.swf', // The URL for the Flash clipboard copy module
		// Clipboard not supported message
		copyUnavailable: 'The clipboard is unavailable, please copy the event details from below:\n'
	};
	this._sites = {  // The definitions of the available iCalendar sites
		'google': {display: 'Google', icon: 0,
			url: 'http://www.google.com/calendar/event?action=TEMPLATE&text={t}&dates={s}/{e}&details={d}&location={l}'},
		'icalendar': {display: 'iCalendar', icon: 1, url: 'echo'},
		'outlook': {display: 'Outlook', icon: 2, url: 'echo'},
		'yahoo': {display: 'Yahoo', icon: 3,
			url: 'http://calendar.yahoo.com/?v=60&view=d&type=20&title={t}&st={s}&dur={p}&desc={d}&in_loc={l}'}
	};
}
var FREQ_SETTINGS = [{method: 'Seconds', factor: 1},
	{method: 'Minutes', factor: 60}, {method: 'Hours', factor: 3600},
	{method: 'Date', factor: 86400}, {method: 'Month', factor: 1},
	{method: 'FullYear', factor: 12}, {method: 'Date', factor: 604800}];
var SE = 0;
var MI = 1;
var HR = 2;
var DY = 3;
var MO = 4;
var YR = 5;
var WK = 6;

$.extend(iCalendar.prototype, {
	/* Class name added to elements to indicate already configured with iCalendar. */
	markerClassName: 'hasICalendar',

	/* Override the default settings for all iCalendar instances.
	   @param  settings  (object) the new settings to use as defaults
	   @return void */
	setDefaults: function(settings) {
		extendRemove(this._defaults, settings || {});
		return this;
	},

	/* Add a new iCalendar site to the list.
	   @param  id       (string) the ID of the new site
	   @param  display  (string) the display name for this site
	   @param  icon     (url) the location of an icon for this site (16x16), or
	                    (number) the index of the icon within the combined image
	   @param  url      (url) the submission URL for this site
	                    with {t} marking where the event title should be inserted,
	                    {s} indicating the event start date/time insertion point,
	                    {e} indicating the event end date/time insertion point,
	                    {p} indicating the event period (duration) insertion point,
	                    {d} indicating the event description insertion point,
	                    {l} indicating the event location insertion point,
	                    {u} indicating the event URL insertion point,
	                    {c} indicating the event contact insertion point
	   @return void */
	addSite: function(id, display, icon, url) {
		this._sites[id] = {display: display, icon: icon, url: url};
		return this;
	},

	/* Return the list of defined sites.
	   @return  object[] - indexed by site id (string), each object contains
	            display (string) the display name,
	            icon    (string) the location of the icon, or
	                    (number) the icon's index in the combined image
	            url     (string) the submission URL for the site */
	getSites: function() {
		return this._sites;
	},

	/* Attach the iCalendar widget to a div. */
	_attachICalendar: function(target, settings) {
		target = $(target);
		if (target.hasClass(this.markerClassName)) {
			return;
		}
		target.addClass(this.markerClassName);
		this._updateICalendar(target, settings);
	},

	/* Reconfigure the settings for an iCalendar div. */
	_changeICalendar: function(target, settings) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		this._updateICalendar(target, settings);
	},

	/* Construct the requested iCalendar links. */
	_updateICalendar: function(target, settings) {
		settings = extendRemove($.extend({}, this._defaults,
			$.data(target[0], PROP_NAME) || {}), settings);
		$.data(target[0], PROP_NAME, settings);
		if (!target[0].id) {
			target[0].id = 'ic' + new Date().getTime();
		}
		var sites = settings.sites || this._defaults.sites;
		if (sites.length == 0) { // default to all sites
			$.each(this._sites, function(id) {
				sites[sites.length] = id;
			});
		}
		var addSite = function(site, calId) {
			var url = (site.url == 'echo' ? '#' : 
				site.url.replace(/{t}/, escape(settings.title)).
				replace(/{d}/, escape(settings.description)).
				replace(/{s}/, $.icalendar.formatDate(settings.start)).
				replace(/{e}/, $.icalendar.formatDate(settings.end)).
				replace(/{p}/, $.icalendar.calculateDuration(settings.start, settings.end)).
				replace(/{l}/, escape(settings.location)).
				replace(/{u}/, escape(settings.url)).
				replace(/{c}/, escape(settings.contact)));
			var html = '<li><a href="' + url + '" title="' + settings.tipPrefix + site.display + '" ' +
				(site.url == 'echo' ?
				'onclick="return jQuery.icalendar._echo(\'#' + target[0].id + '\',\'' + calId + '\')"' :
				'target="' + settings._target + '"') + '>';
			if (site.icon != null) {
				if (typeof site.icon == 'number') {
					html += '<span style="background: ' +
						'transparent url(' + settings.icons + ') no-repeat -' +
						(site.icon * settings.iconSize) + 'px 0px;' +
						($.browser.mozilla && $.browser.version.substr(0, 3) != '1.9' ?
						' padding-left: ' + settings.iconSize +
						'px; padding-bottom: 3px;' : '') + '"></span>';
				}
				else {
					html += '<img src="' + site.icon + '"/>';
				}
				html +=	(settings.compact ? '' : '&#xa0;');
			}
			html +=	(settings.compact ? '' : site.display) + '</a></li>';
			return html;
		};
		var html = '<ul class="icalendar_list' + (settings.compact ? ' icalendar_compact' : '') + '">';
		var allSites = this._sites;
		$.each(sites, function(index, id) {
			html += addSite(allSites[id], id);
		});
		html += '</ul>';
		target.html(html);
	},

	/* Remove the iCalendar widget from a div. */
	_destroyICalendar: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		target.removeClass(this.markerClassName).empty();
		$.removeData(target[0], PROP_NAME);
	},

	/* Echo the iCalendar text back to the user either as a
	   downloadable file or via the clipboard.
	   @param  id     (string) the ID of the owning division
	   @param  calId  (string) the ID of the site to send the calendar to */
	_echo: function(id, calId) {
		var settings = $.data($(id)[0], PROP_NAME);
		var event = makeICalendar(settings);
		if (settings.echoUrl) {
			window.location.href = settings.echoUrl + '?content=' + escape(event);
		}
		else if (settings.echoField) {
			$(settings.echoField).val(event);
		}
		else if (!settings.copyFlash) {
			alert(settings.copyUnavailable + event);
		}
		else if (confirm(settings.copyConfirm)) {
			var error = '';
			if (error = copyViaFlash(event, settings.copyFlash)) {
				alert(settings.copyFailed + error);
			}
			else {
				alert(settings.copySucceeded);
			}
		}
		return false; // Don't follow link
	},
	
	/* Format a date/time for iCalendar: yyyymmddThhmmss[Z].
	   @param  date   (Date) the date to format
	   @param  local  (boolean) true if this should be a local date/time
	   @return  (string) the formatted date */
	formatDate: function(date, local) {
		var ensureTwo = function(value) {
			return (value < 10 ? '0' : '') + value;
		};
		date = (date ? new Date(date.getTime()) : null);
		return (!date ? '' : (local ? '' + date.getFullYear() + ensureTwo(date.getMonth() + 1) +
			ensureTwo(date.getDate()) + 'T' + ensureTwo(date.getHours()) +
			ensureTwo(date.getMinutes()) + ensureTwo(date.getSeconds()) :
			'' + date.getUTCFullYear() + ensureTwo(date.getUTCMonth() + 1) +
			ensureTwo(date.getUTCDate()) + 'T' + ensureTwo(date.getUTCHours()) +
			ensureTwo(date.getUTCMinutes()) + ensureTwo(date.getUTCSeconds()) + 'Z'));
	},

	/* Calculate the duration between two date/times.
	   @param  start  (Date) the starting date/time
	   @param  end    (Date) the ending date/time
	   @return  (string) the formatted duration or blank if invalid parameters */
	calculateDuration: function(start, end) {
		if (!start || !end) {
			return '';
		}
		var seconds = Math.abs(end.getTime() - start.getTime()) / 1000;
		var days = Math.floor(seconds / 86400);
		seconds -= days * 86400;
		var hours = Math.floor(seconds / 3600);
		seconds -= hours * 3600;
		var minutes = Math.floor(seconds / 60);
		seconds -= minutes * 60;
		return (start.getTime() > end.getTime() ? '-' : '') +
			'P' + (days > 0 ? days + 'D' : '') +
			(hours || minutes || seconds ? 'T' + hours + 'H' : '') +
			(minutes || seconds ? minutes + 'M' : '') + (seconds ? seconds + 'S' : '');
	},

	/* Calculate the end date/time given a start and a duration.
	   @param  start     (Date) the starting date/time
	   @param  duration  (string) the description of the duration
	   @return  (Date) the ending date/time
	   @throws  error if an invalid duration is found */
	addDuration: function(start, duration) {
		if (!duration) {
			return start;
		}
		var end = new Date(start.getTime());
		var matches = DURATION.exec(duration);
		if (!matches) {
			throw 'Invalid duration';
		}
		if (matches[2] && (matches[3] || matches[5] || matches[6] || matches[7])) {
			throw 'Invalid duration - week must be on its own'; // Week must be on its own
		}
		if (!matches[4] && (matches[5] || matches[6] || matches[7])) {
			throw 'Invalid duration - missing time marker'; // Missing T with hours/minutes/seconds
		}
		var sign = (matches[1] == '-' ? -1 : +1);
		var apply = function(value, factor, method) {
			value = parseInt(value);
			if (!isNaN(value)) {
				end['setUTC' + method](end['getUTC' + method]() + sign * value * factor);
			}
		};
		if (matches[2]) {
			apply(matches[2], 7, 'Date');
		}
		else {
			apply(matches[3], 1, 'Date');
			apply(matches[5], 1, 'Hours');
			apply(matches[6], 1, 'Minutes');
			apply(matches[7], 1, 'Seconds');
		}
		return end;
	},

	/* Parse the iCalendar data into a JavaScript object model.
	   @param  content  (string) the original iCalendar data
	   @return  (object) the iCalendar JavaScript model
	   @throws  errors if the iCalendar structure is incorrect */
	parse: function(content) {
		var cal = {};
		var timezones = {};
		var lines = unfoldLines(content);
		parseGroup(lines, 0, cal, timezones);
		if (!cal.vcalendar) {
			throw 'Invalid iCalendar data';
		}
		return cal.vcalendar;
	},

	/* Calculate the week of the year for a given date
	   according to the ISO 8601 definition.
	   @param  date       (Date) the date to calculate the week for
	   @param  weekStart  (number) the day on which a week starts:
	                      0 = Sun, 1 = Mon, ... (optional, defaults to 1)
	   @return  (number) the week for these parameters (1-53) */
	getWeekOfYear: function(date, weekStart) {
		return getWeekOfYear(date, weekStart);
	}
});

/* jQuery extend now ignores nulls! */
function extendRemove(target, props) {
	$.extend(target, props);
	for (var name in props) {
		if (props[name] == null) {
			target[name] = null;
		}
	}
	return target;
}

/* Attach the iCalendar functionality to a jQuery selection.
   @param  command  (string) the command to run (optional, default 'attach')
   @param  options  (object) the new settings to use for these iCalendar instances
   @return  (jQuery object) jQuery for chaining further calls */
$.fn.icalendar = function(options) {
	var otherArgs = Array.prototype.slice.call(arguments, 1);
	return this.each(function() {
		if (typeof options == 'string') {
			$.icalendar['_' + options + 'ICalendar'].
				apply($.icalendar, [this].concat(otherArgs));
		}
		else {
			$.icalendar._attachICalendar(this, options || {});
		}
	});
};

/* Initialise the iCalendar functionality. */
$.icalendar = new iCalendar(); // singleton instance

/* Construct an iCalendar with an event object.
   @param  event  (object) the event details
   @return  (string) the iCalendar definition */
function makeICalendar(event) {
	var limit75 = function(text) {
		var out = '';
		while (text.length > 75) {
			out += text.substr(0, 75) + '\n';
			text = ' ' + text.substr(75);
		}
		out += text;
		return out;
	};
	return 'BEGIN:VCALENDAR\n' +
		'VERSION:2.0\n' +
		'PRODID:jquery.icalendar\n' +
		'BEGIN:VEVENT\n' +
		(event.url ? limit75('URL:' + event.url) + '\n' : '') +
		(event.contact ? limit75('MAILTO:' + event.contact) + '\n' : '') +
		limit75('TITLE:' + event.title) + '\n' +
		'DTSTART:' + $.icalendar.formatDate(event.start) + '\n' +
		'DTEND:' + $.icalendar.formatDate(event.end) + '\n' +
		(event.summary ? limit75('SUMMARY:' + event.summary) + '\n' : '') +
		(event.description ? limit75('DESCRIPTION:' + event.description) + '\n' : '') +
		(event.location ? limit75('LOCATION:' + event.location) + '\n' : '') +
		'END:VEVENT\n' +
		'END:VCALENDAR';
}

/* Copy the given text to the system clipboard via Flash.
   @param  text  (string) the text to copy
   @param  url   (string) the URL for the Flash clipboard copy module
   @return  (string) '' if successful, error message if not */
function copyViaFlash(text, url) {
	$('#' + FLASH_ID).remove();
	try {
		$('body').append('<div id="' + FLASH_ID + '"><embed src="' + url +
			'" FlashVars="clipboard=' + encodeURIComponent(text) +
			'" width="0" height="0" type="application/x-shockwave-flash"></embed></div>');
		return '';
	}
	catch(e) {
		return e;
	}
}

/* Pattern for folded lines: start with a whitespace character */
var FOLDED = /^\s(.*)$/;
/* Pattern for an individual entry: name:value */
var ENTRY = /^([^:]+):(.*)$/;
/* Pattern for a date only field: yyyymmdd */
var DATEONLY = /^(\d{4})(\d\d)(\d\d)$/;
/* Pattern for a date/time field: yyyymmddThhmmss[Z] */
var DATETIME = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)$/;
/* Pattern for a date/time range field: yyyymmddThhmmss[Z]/yyyymmddThhmmss[Z] */
var DATETIME_RANGE = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)\/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(Z?)$/;
/* Pattern for a timezone offset field: +hhmm */
var TZ_OFFSET = /^([+-])(\d\d)(\d\d)$/;
/* Pattern for a duration: [+-]PnnW or [+-]PnnDTnnHnnMnnS */
var DURATION = /^([+-])?P(\d+W)?(\d+D)?(T)?(\d+H)?(\d+M)?(\d+S)?$/;
/* Reserved names not suitable for attrbiute names. */
var RESERVED_NAMES = ['class'];

/* iCalendar lines are split so the max length is no more than 75.
   Split lines start with a whitespace character.
   @param  content  (string) the original iCalendar data
   @return  (string[]) the restored iCalendar data */
function unfoldLines(content) {
	var lines = content.split('\n');
	for (var i = lines.length - 1; i > 0; i--) {
		var matches = FOLDED.exec(lines[i]);
		if (matches) {
			lines[i - 1] += matches[1];
			lines[i] = '';
		}
	}
	return $.map(lines, function(line, i) { // Remove blank lines
		return (line ? line : null);
	});
}

/* Parse a group in the file, delimited by BEGIN:xxx and END:xxx.
   Recurse if an embedded group encountered.
   @param  lines      (string[]) the iCalendar data
   @param  index      (number) the current position within the data
   @param  owner      (object) the current owner for the new group
   @param  timezones  (object) collection of defined timezones
   @return  (number) the updated position after processing this group
   @throws  errors if group structure is incorrect */
function parseGroup(lines, index, owner, timezones) {
	if (index >= lines.length || lines[index].indexOf('BEGIN:') != 0) {
		throw 'Missing group start';
	}
	var group = {};
	var name = lines[index].substr(6);
	addEntry(owner, name.toLowerCase(), group);
	index++;
	while (index < lines.length && lines[index].indexOf('END:') != 0) {
		if (lines[index].indexOf('BEGIN:') == 0) { // Recurse for embedded group
			index = parseGroup(lines, index, group, timezones);
		}
		else {
			var entry = parseEntry(lines[index]);
			addEntry(group, entry._name, (entry._simple ? entry._value : entry));
		}
		index++;
	}
	if (name == 'VTIMEZONE') { // Save timezone offset
		var matches = TZ_OFFSET.exec(group.standard.tzoffsetto);
		if (matches) {
			timezones[group.tzid] = (matches[1] == '-' ? -1 : +1) *
				(parseInt(matches[2]) * 60 + parseInt(matches[3]));
		}
	}
	else {
		for (var name2 in group) {
			resolveTimezones(group[name2], timezones);
		}
	}
	if (lines[index] != 'END:' + name) {
		throw 'Missing group end ' + name;
	}
	return index;
}

/* Resolve timezone references for dates.
   @param  value  (any) the current value to check - updated if appropriate
   @param  timezones  (object) collection of defined timezones */
function resolveTimezones(value, timezones) {
	if (!value) {
		return;
	}
	if (value.tzid && value._value) {
		var offset = timezones[value.tzid];
		var offsetDate = function(date, tzid) {
			date.setMinutes(date.getMinutes() - offset);
			date._type = tzid;
		};
		if (isArray(value._value)) {
			for (var i = 0; i < value._value.length; i++) {
				offsetDate(value._value[i], value.tzid);
			}
		}
		else if (value._value.start && value._value.end) {
			offsetDate(value._value.start, value.tzid);
			offsetDate(value._value.end, value.tzid);
		}
		else {
			offsetDate(value._value, value.tzid);
		}
	}
	else if (isArray(value)) {
		for (var i = 0; i < value.length; i++) {
			resolveTimezones(value[i], timezones);
		}
	}
}

/* Add a new entry to an object, making multiple entries into an array.
   @param  owner  (object) the owning object for the new entry
   @param  name   (string) the name of the new entry
   @param  value  (string or object) the new entry value */
function addEntry(owner, name, value) {
	if (typeof value == 'string') {
		value = value.replace(/\\n/g, '\n');
	}
	if ($.inArray(name, RESERVED_NAMES) > -1) {
		name += '_';
	}
	if (owner[name]) { // Turn multiple values into an array
		if (!isArray(owner[name]) || owner['_' + name + 'IsArray']) {
			owner[name] = [owner[name]];
		}
		owner[name][owner[name].length] = value;
		if (owner['_' + name + 'IsArray']) {
			owner['_' + name + 'IsArray'] = undefined;
		}
	}
	else {
		owner[name] = value;
		if (isArray(value)) {
			owner['_' + name + 'IsArray'] = true;
		}
	}
}

/* Parse an individual entry.
   The format is: <name>[;<param>=<pvalue>]...:<value>
   @param  line  (string) the line to parse
   @return  (object) the parsed entry with _name and _value
            attributes, _simple to indicate whether or not
            other parameters, and other parameters as necessary */
function parseEntry(line) {
	var entry = {};
	var matches = ENTRY.exec(line);
	if (!matches) {
		throw 'Missing entry name: ' + line;
	}
	var params = matches[1].split(';');
	entry._name = params[0].toLowerCase();
	entry._value = checkDate(matches[2]);
	entry._simple = true;
	parseParams(entry, params.slice(1));
	return entry;
}

/* Parse parameters for an individual entry.
   The format is: <param>=<pvalue>[;...]
   @param  owner   (object) the owning object for the parameters,
                   updated with parameters as attributes, and
				   _simple to indicate whether or not other parameters
   @param  params  (string or string[]) the parameters to parse */
function parseParams(owner, params) {
	params = (isArray(params) ? params : params.split(';'));
	owner._simple = true;
	for (var i = 0; i < params.length; i++) {
		var nameValue = params[i].split('=');
		owner[nameValue[0].toLowerCase()] = checkDate(nameValue[1] || '');
		owner._simple = false;
	}
}

/* Convert a value into a Date object or array of Date objects if appropriate.
   @param  value  (string) the value to check
   @return  (string or Date) the converted value (if appropriate) */
function checkDate(value) {
	var matches = DATETIME.exec(value);
	if (matches) {
		return makeDate(matches);
	}
	matches = DATETIME_RANGE.exec(value);
	if (matches) {
		return {start: makeDate(matches), end: makeDate(matches.slice(7))};
	}
	matches = DATEONLY.exec(value);
	if (matches) {
		return makeDate(matches.concat([0, 0, 0, '']));
	}
	return value;
}

/* Create a date value from matches on a string.
   @param  matches  (string[]) the component parts of the date
   @return  (Date) the corresponding date */
function makeDate(matches) {
	var date = new Date(matches[1], matches[2] - 1, matches[3],
		matches[4], matches[5], matches[6]);
	date._type = (matches[7] ? 'UTC' : 'float');
	return utcDate(date);
}

/* Standardise a date to UTC.
   @param  date  (Date) the date to standardise
   @return  (Date) the equivalent UTC date */
function utcDate(date) {
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	return date;
}

/* Calculate the week of the year for a given date
   according to the ISO 8601 definition.
   @param  date       (Date) the date to calculate the week for
   @param  weekStart  (number) the day on which a week starts:
                      0 = Sun, 1 = Mon, ... (optional, defaults to 1)
   @return  (number) the week for these parameters (1-53) */
function getWeekOfYear(date, weekStart) {
	weekStart = (weekStart || weekStart == 0 ? weekStart : 1);
	var checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
		(date.getTimezoneOffset() / -60));
	var firstDay = new Date(checkDate.getFullYear(), 1 - 1, 4); // First week always contains 4 Jan
	var firstDOW = firstDay.getDay(); // Day of week: Sun = 0, Mon = 1, ...
	firstDay.setDate(4 + weekStart - firstDOW - (weekStart > firstDOW ? 7 : 0)); // Preceding week start
	if (checkDate < firstDay) { // Adjust first three days in year if necessary
		checkDate.setDate(checkDate.getDate() - 3); // Generate for previous year
		return getWeekOfYear(checkDate, weekStart);
	} else if (checkDate > new Date(checkDate.getFullYear(), 12 - 1, 28)) { // Check last three days in year
		var firstDay2 = new Date(checkDate.getFullYear() + 1, 1 - 1, 4); // Find first week in next year
		firstDOW = firstDay2.getDay();
		firstDay2.setDate(4 + weekStart - firstDOW - (weekStart > firstDOW ? 7 : 0));
		if (checkDate >= firstDay2) { // Adjust if necessary
			return 1;
		}
	}
	return Math.floor(((checkDate - firstDay) /
		(FREQ_SETTINGS[DY].factor * 1000)) / 7) + 1; // Weeks to given date
}

/* Determine whether an object is an array.
   @param  a  (object) the object to test
   @return  (boolean) true if it is an array, or false if not */
function isArray(a) {
	return (a && a.constructor == Array);
}

})(jQuery);
