(function() {

/**
 * Update the site statistics
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {ObjectId}   siteId
 */
var updateSite = function updateSite(siteId) {

	var $this;

	if (!String(siteId).isObjectId()) {
		return;
	}

	$this = $('div[data-site-stats][data-site-id="' + siteId + '"]');

	hawkejs.getResource('sitestat', {id: siteId}, function(result) {

		var process,
		    html,
		    pid,
		    mem,
		    cpu;

		if (result.err) {
			return;
		}

		html = '<table class="table table-striped">';
		html += '<tr><th>Pid</th><th>Port</th><th>Uptime</th><th>Cpu</th><th>Memory</th><th>Actions</th></tr>';

		for (pid in result.processes) {

			// Create an alias to the process
			process = result.processes[pid];

			cpu = mem = '??';

			if (typeof process.cpu !== 'undefined') {
				cpu = process.cpu + ' %';
			}

			if (typeof process.mem !== 'undefined') {
				mem = process.mem + ' MiB';
			}

			html += '<tr>';

			html += '<td>' + pid + '</td>';
			html += '<td><a href="http://' + location.hostname + ':' + process.port + '">' + process.port + '</a></td>';

			html += '<td><span class="timeago" title="';
			html +=  (new Date(process.startTime)).toISOString() + '"></span></td>'

			// Cpu
			html += '<td>' + cpu + '</td>';

			// Memory
			html += '<td>' + mem + '</td>';

			// Actions
			html += '<td>';

			html += '<button class="btn btn-danger" data-kill-pid="' + pid + '"><i class="fa fa-crosshairs"></i> Kill</button> ';

			html += '</td>';

			html += '</tr>';
		}

		html += '</table>';

		// Set the generated table as the html
		$this.html(html);

		// Kill a process
		$this.on('click', 'button[data-kill-pid]', function(e) {

			var $this = $(this);

			e.preventDefault();

			hawkejs.getResource('sitestat-kill', {id: siteId, pid: $this.attr('data-kill-pid')}, function(data) {

				if (data.err) {
					toastr.err(data.err);
				} else {
					toastr.success('Process ' + $this.attr('data-kill-pid') + ' has been killed');
					updateSite(siteId);
				}
			});
		});
	});
};

hawkejs.spot.introduced('[data-site-control]', function(elements) {

	var $elements = $(elements);

	$('[data-site-stats]', $elements).each(function() {

		var $this  = $(this),
		    siteId = $this.attr('data-site-id');

		updateSite(siteId);
	});

	$('[data-start-process]', $elements).click(function(e) {

		var $this = $(this),
		    siteId;

		e.preventDefault();

		siteId = $this.data('site-id');

		hawkejs.getResource('sitestat-start', {id: siteId}, function(data) {

			if (data.err) {
				toastr.err(data.err);
			} else {
				toastr.success('New process has been started');
				updateSite(siteId);
			}
		});
	});
});

}());