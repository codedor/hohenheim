var Fuery     = alchemy.use('fuery'),
    child     = require('child_process'),
    httpProxy = require('http-proxy'),
    http      = require('http'),
    path      = require('path'),
    procmon   = require('process-monitor'),
    SiteDispatcher,
    Site;

/**
 * The Site Dispatcher class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
SiteDispatcher = Function.inherits('Informer', function SiteDispatcher(options) {

	var that = this;

	if (!options) {
		options = {};
	}

	// Get the site model
	this.Site = Model.get('Site');

	// Count the number of made hits
	this.hitCounter = 0;

	// Count the number of made connections
	this.connectionCounter = 0;

	// Store sites by id in here
	this.ids = {};

	// Store sites by domain in here
	this.domains = {};

	// Store sites by name in here
	this.names = {};

	// The ports that are in use
	this.ports = {};

	// The port the proxy runs on
	this.proxyPort = options.proxyPort || 8080;

	// Where the ports start
	this.firstPort = options.firstPort || 4701;

	// The host to redirect to
	this.redirectHost = options.redirectHost || 'localhost';

	// Create the queue
	this.queue = new Fuery();

	// Start the queue by getting the sites first
	this.queue.start(function(done) {
		that.Site.getSites(done);
	});

	// Listen to the site updat event
	this.Site.on('siteUpdate', this.update.bind(this));

	// Create the proxy server
	this.startProxy();
});

/**
 * Start the proxy server
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
SiteDispatcher.setMethod(function startProxy() {

	var that = this;

	// Create the proxy
	this.proxy = httpProxy.createProxyServer({});

	// Create the server
	this.server = http.createServer(this.request.bind(this));

	// Make the proxy server listen on the given port
	this.server.listen(this.proxyPort);

	// Listen for error events
	this.proxy.on('error', this.requestError.bind(this));

	// Intercept proxy responses
	//this.proxy.on('proxyRes', this.response.bind(this));
});

/**
 * Handle request errors
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 * 
 * @param    {Error}              error
 * @param    {IncommingMessage}   req
 * @param    {ServerResponse}     res
 */
SiteDispatcher.setMethod(function requestError(error, req, res) {

	if (!req.errorCount) {
		req.errorCount = 1;
	} else {
		req.errorCount++;
	}

	// Retry 4 times
	if (req.errorCount > 4) {
		log.error('Retried connection ' + req.connectionId + ' four times, giving up');
		res.writeHead(502, {'Content-Type': 'text/plain'});
		res.end('Failed to reach server!');
	} else {
		// Make the request again
		this.request(req, res);
	}
});

/**
 * Get the site object based on the headers
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 * 
 * @param    {Object}   headers
 */
SiteDispatcher.setMethod(function getSite(headers) {

	// Get the host (including port)
	var domain = headers.host;

	// Split it by colons
	domain = domain.split(':');

	// The first part is the domain
	domain = domain[0];

	return this.domains[domain];
});

/**
 * Handle a new proxy request
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 * 
 * @param    {IncommingMessage}   req
 * @param    {ServerResponse}     res
 */
SiteDispatcher.setMethod(function request(req, res) {

	var that = this,
	    domain,
	    read,
	    site,
	    hit;

	req.startTime = Date.now();

	// Get the hit id
	hit = ++this.hitCounter;

	if (!req.socket.connectionId) {

		req.socket.connectionId = ++this.connectionCounter;
		res.socket.connectionId = req.socket.connectionId;
	}

	req.connectionId = req.socket.connectionId;
	req.hitId = hit;

	req.headers.hitId = hit;
	req.headers.connectionId = req.connectionId;
	
	site = this.getSite(req.headers);

	if (!site) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end('There is no such domain here!');
	} else {

		// Only register this hit if the error count has not been set
		// meaning it's the first time this request has passed through here
		if (!req.errorCount) {
			site.registerHit(req, res);
		}

		site.getAddress(function gotAddress(address) {
			that.proxy.web(req, res, {target: address});
		});
	}
});

/**
 * Get a free port number,
 * and immediately reserve it for the given site
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {alchemy.classes.Site}   site   A site instance
 */
SiteDispatcher.setMethod(function getPort(site) {

	var port = this.firstPort;

	while (port !== this.proxyPort && typeof this.ports[port] !== 'undefined') {
		port++;
	}

	this.ports[port] = site;

	return port;
});

/**
 * Free up the given port number
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Number}   portNumber
 */
SiteDispatcher.setMethod(function freePort(portNumber) {
	delete this.ports[portNumber];
});

/**
 * Update the sites
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   sitesById   An object of site records by their id
 */
SiteDispatcher.setMethod(function update(sitesById) {

	var removed,
	    created,
	    shared,
	    id;

	// Pause the dispatcher queue
	this.queue.pause();

	removed = alchemy.getDifference(this.ids, sitesById);

	// Destroy all the removed id sites
	for (id in removed) {
		this.ids[id].remove();
	}

	created = alchemy.getDifference(sitesById, this.ids);

	// Create all the new sites
	for (id in created) {
		new alchemy.classes.Site(this, created[id]);
	}

	shared = alchemy.getShared(this.ids, sitesById);

	// Update all the existing sites
	for (id in shared) {
		this.ids[id].update(shared[id]);
	}

	// Resume the queue
	this.queue.start();
});

///////////////////////////////////////////////////////////////////////////////

/**
 * The Site class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param    {alchemy.classes.SiteDispatcher}   siteDispatcher
 * @param    {Object}                           record
 */
Site = Function.inherits('Informer', function Site(siteDispatcher, record) {

	// The parent site dispatcher
	this.parent = siteDispatcher;

	// The id in the database
	this.id = record._id;

	// The running processes
	this.processes = {};

	// The amount of running processes
	this.running = 0;

	// The incoming bytes
	this.incoming = 0;

	// The outgoing bytes
	this.outgoing = 0;

	// Counters per path
	this.pathCounters = {};

	// The redirecthost
	this.redirectHost = siteDispatcher.redirectHost;

	// The request log model
	this.Log = Model.get('Request');

	this.update(record);
});

/**
 * Start a new process
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   callback
 */
Site.setMethod(function start(callback) {

	var that = this,
	    processStats,
	    process,
	    port;

	// Get an open port number
	port = this.parent.getPort(this);

	// Start the server
	process = child.fork(this.script, ['--port=' + port, 'hohenchild'], {cwd: this.cwd});

	// Store the port it should be running on
	process.port = port;

	// Store the time this was started
	process.startTime = Date.now();

	this.processes[process.pid] = process;

	this.running++;

	// Handle cpu & memory information from the process
	processStats = function processStats(stats) {
		that.processStats(process, stats.cpu, stats.mem);
	};

	// Attach process monitor
	process.monitor = procmon.monitor({
		pid: process.pid,
		interval: 6000,
		technique: 'proc'
	}).start();

	// Listen for process information
	process.monitor.on('stats', processStats);

	// Listen for exit events
	process.on('exit', function(code, signal) {

		// Clean up the process
		that.processExit(process, code, signal);

		// Stop the process monitor
		process.monitor.stop();

		// Delete the monitor from the process
		delete process.monitor;
	});

	// Listen for the message that tells us the server is ready
	process.on('message', function listenForReady(message) {

		if (typeof message !== 'object') {
			return;
		}

		if (message.alchemy && message.alchemy.ready) {

			// Add this to the process object
			process.ready = true;

			// Execute the callback
			if (callback) callback();

			// Remove the event listener
			process.removeListener('message', listenForReady);
		}
	});
});

/**
 * Handle child process cpu & memory information
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {ChildProcess}   process
 * @param    {Number}         cpu       Cpu usage in percentage
 * @param    {Number}         mem       Memory usage in kilobytes
 */
Site.setMethod(function processStats(process, cpu, mem) {

	process.cpu = ~~cpu;
	process.mem = ~~(mem/1024);

	if (cpu > 50) {
		pr('Site "' + this.name.bold + '" process id ' + process.pid + ' is using ' + process.cpu + '% cpu and ' + process.mem + ' MiB memory');
	}
});

/**
 * Handle child process exits
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {ChildProcess}   process
 * @param    {Number}         code
 * @param    {String}         signal
 */
Site.setMethod(function processExit(process, code, signal) {

	// Tell the parent this port is free again
	this.parent.freePort(process.port);

	// Decrease the running counter
	this.running--;

	// Remove the process from the processes object
	delete this.processes[process.pid];

	log.warn('Process ' + String(process.pid).bold + ' for site ' + this.name.bold + ' has exited with code ' + String(code).bold + ' and signal ' + String(signal).bold);
});

/**
 * Get an adress to proxy to
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   callback
 */
Site.setMethod(function getAddress(callback) {

	var that = this,
	    fnc;

	if (this.url) {
		return callback(this.url);
	}

	fnc = function addressCreator() {
		var pid;

		// @todo: do some load balancing
		for (pid in that.processes) {
			return callback('http://' + that.redirectHost + ':' + that.processes[pid].port);
		}
	};

	if (!this.running) {
		this.start(fnc);
	} else {
		fnc();
	}
});

/**
 * Remove this site completely
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Site.setMethod(function remove() {
	this.cleanParent();
});

/**
 * Remove this site from the parent entries
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Site.setMethod(function cleanParent() {

	var domain,
	    name;

	delete this.parent.ids[this.id];

	// Remove this instance from the parent's domains
	for (domain in this.parent.domains) {
		if (this.parent.domains[domain] == this) {
			delete this.parent.domains[domain];
		}
	}

	// Remove this instance from the parent's names
	for (name in this.parent.names) {
		if (this.parent.names[name] == this) {
			delete this.parent.names[name];
		}
	}
});

/**
 * Update this site,
 * recreate the entries in the parent dispatcher
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   record
 */
Site.setMethod(function update(record) {

	var that = this;

	// The db record itself
	this._record = record;

	this.name = record.name;
	this.domains = record.domain || [];
	this.script = record.script;

	if (this.script) {
		this.cwd = path.dirname(this.script);
	}

	// We can also proxy to an existing url (apache sites)
	this.url = record.url;

	// Remove this instance from the parent
	this.remove();

	// Add by id
	this.parent.ids[this.id] = this;

	// Add by domains
	this.domains.filter(function(domain) {
		that.parent.domains[domain] = that;
	});

	// Re-add the instance by name
	this.parent.names[this.name] = this;
});

/**
 * This site has been hit,
 * register some metrics
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 * 
 * @param    {IncommingMessage}   req
 * @param    {ServerResponse}     res
 * @param    {Function}           callback
 */
Site.setMethod(function registerHit(req, res, callback) {

	var that = this,
	    bytesPrevRead,
	    remoteAddress,
	    bytesRead,
	    fullPath,
	    path,
	    read;

	fullPath = req.url;

	// Get the wanted path
	path = fullPath.split('?')[0];

	// Get the previous amount of bytes read on this socket
	bytesPrevRead = req.socket.prevRead || 0;
	bytesRead = req.socket.bytesRead;

	// The total amount of bytes read for this request
	read = bytesRead - bytesPrevRead;

	// Set the new previous read amount of bytes
	req.socket.prevRead = req.socket.bytesRead;

	// Get the remote address
	remoteAddress = req.socket.remoteAddress;

	res.on('finish', function finalizeHitRegister() {

		var bytesPrevWritten = req.socket.prevWritten || 0,
		    bytesWritten = req.socket.bytesWritten,
		    sent = bytesWritten - bytesPrevWritten;

		that.incoming += read;
		that.outgoing += sent;

		if (typeof that.pathCounters[path] === 'undefined') {
			that.pathCounters[path] = {
				incoming: 0,
				outgoing: 0
			};
		}

		that.pathCounters[path].incoming += read;
		that.pathCounters[path].outgoing += sent;

		// Set the new written amount
		req.socket.prevWritten = bytesWritten;

		that.Log.registerHit({
			site_id: that.id,
			host: req.headers.host,
			path: fullPath,
			status: res.statusCode,
			request_size: read,
			response_size: sent,
			referer: req.headers.referer,
			user_agent: req.headers['user-agent'],
			remote_address: remoteAddress,
			duration: Date.now() - req.startTime
		});

		pr(that.name.bold + ' has now received ' + ~~(that.incoming/1024) + ' KiBs and submitted ' + ~~(that.outgoing/1024) + ' KiBs');
	});
});

////////////////////////////////////////////////////////////////////////////////


/**
 * Make basic field information about a model available
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Resource.register('sitestat', function(data, callback) {

	var siteId   = alchemy.castObjectId(data.id),
	    result   = {},
	    process,
	    site,
	    pid;

	if (!siteId) {
		return callback({err: 'no id given'});
	}

	site = alchemy.dispatcher.ids[siteId];

	if (!site) {
		return callback({err: 'site does not exist'});
	}

	// Get the amount of processes running
	result.running = site.running;

	result.processes = {};

	// Get the pids
	for (pid in site.processes) {

		process = site.processes[pid];

		result.processes[pid] = {
			startTime: process.startTime,
			port: process.port,
			cpu: process.cpu,
			mem: process.mem
		};
	}

	result.incoming = site.incoming;
	result.outgoing = site.outgoing;

	callback(result);
});

return

/**
 * Kill the requested pid
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Resource.register('sitestat-kill', function(data, callback) {

	var siteId   = alchemy.castObjectId(data.id),
	    result   = {},
	    process,
	    site,
	    pid;

	if (!siteId) {
		return callback({err: 'no id given'});
	}

	site = alchemy.dispatcher.ids[siteId];

	if (!site) {
		return callback({err: 'site does not exist'});
	}

	process = site.processes[data.pid];

	if (!process) {
		return callback({err: 'pid does not exist'});
	}

	process.kill();

	callback({success: 'process killed'});
});

/**
 * Start a new process
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Resource.register('sitestat-start', function(data, callback) {

	var siteId   = alchemy.castObjectId(data.id),
	    result   = {},
	    process,
	    site,
	    pid;

	if (!siteId) {
		return callback({err: 'no id given'});
	}

	site = alchemy.dispatcher.ids[siteId];

	if (!site) {
		return callback({err: 'site does not exist'});
	}

	site.start();

	callback({success: 'process started'});
});