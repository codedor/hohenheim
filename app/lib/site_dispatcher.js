var Fuery     = alchemy.use('fuery'),
    child     = require('child_process'),
    httpProxy = require('http-proxy'),
    http      = require('http'),
    path      = require('path');

/**
 * The Site Dispatcher class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.create(function SiteDispatcher() {

	this.init = function init(options) {

		var that = this;

		if (!options) {
			options = {};
		}

		// Get the site model
		this.Site = Model.get('Site');

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
	};

	this.startProxy = function startProxy() {

		// Create the proxy
		this.proxy = httpProxy.createProxyServer({});

		// Create the server
		this.server = http.createServer(this.request.bind(this));

		this.server.listen(this.proxyPort);
	};

	this.request = function request(req, res) {

		var that = this,
		    domain,
		    site;

		// Get the host from the headers
		domain = req.headers.host;

		// Split it by colons
		domain = domain.split(':');

		// The first part is the domain
		domain = domain[0];

		pr('Looking for "' + domain.bold + '"');

		site = this.domains[domain];

		if (!site) {
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end('There is no such domain here!');
		} else {
			site.getAddress(function gotAddress(address) {
				pr('Redirecting to ' + String(address).bold.yellow);
				that.proxy.web(req, res, {target: address});
			});
		}
	};

	/**
	 * Get a free port number,
	 * and immediately reserve it for the given site
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.getPort = function getPort(site) {

		var port = this.firstPort;

		while (port !== this.proxyPort && typeof this.ports[port] !== 'undefined') {
			port++;
		}

		this.ports[port] = site;

		return port;
	};

	/**
	 * Update the sites
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.update = function update(sitesById) {

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
	};

});

/**
 * The Site class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.create(function Site() {

	this.init = function init(siteDispatcher, record) {

		// The parent site dispatcher
		this.parent = siteDispatcher;

		// The id in the database
		this.id = record._id;

		// The running processes
		this.processes = {};

		// The amount of running processes
		this.running = 0;

		// The redirecthost
		this.redirectHost = siteDispatcher.redirectHost;

		this.update(record);
	};

	/**
	 * Start a new process
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.start = function start(callback) {

		var process,
		    port;

		// Get an open port number
		port = this.parent.getPort();

		// Start the server
		process = child.fork(this.script, ['--port=' + port], {cwd: this.cwd});

		process.port = port;

		this.processes[process.pid] = process;

		this.running++;

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

		// @todo: implement error listeners
	};

	/**
	 * Get an adress to proxy to
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.getAddress = function getAddress(callback) {

		var that = this,
		    fnc;

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
	};


	/**
	 * Remove this site completely
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.remove = function remove() {

		this.cleanParent();


	};

	/**
	 * Remove this site from the parent entries
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.cleanParent = function cleanParent() {

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
	};

	/**
	 * Update this site,
	 * recreate the entries in the parent dispatcher
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.update = function update(record) {

		var that = this;

		pr('Updating site ' + this.id);

		// The db record itself
		this._record = record;

		this.name = record.name;
		this.domains = record.domain || [];
		this.script = record.script;
		this.cwd = path.dirname(this.script);

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
	};

});