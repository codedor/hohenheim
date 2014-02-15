var Fuery = alchemy.use('fuery'),
    sitesByName = alchemy.shared('Sites.byName'),
    sitesByDomain = alchemy.shared('Sites.byDomain'),
    sitesById = alchemy.shared('Sites.byId');

/**
 * The Site Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Model.extend(function SiteModel() {

	this.preInit = function preInit() {

		this.parent();

		this.blueprint = {
			name: {
				type: 'String'
			},
			domain: {
				type: 'String',
				array: true
			},
			script: {
				type: 'Path'
			}
		};
	};

	this.init = function init() {

		var queue,
		    that = this;

		this.parent();
	};

	/**
	 * Update the sites after a save, and pause the queue while doing so
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.afterSave = function afterSave() {

		this.parent();
		this.getSites();

	};

	/**
	 * Get all the sites in the database
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.getSites = function getSites(callback) {

		var that = this;

		that.find('all', function(err, results) {

			var byName = {},
			    byDomain = {},
			    byId = {};

			results.filter(function(value) {

				var site = value['Site'];

				// Store it by each domain name
				site.domain.filter(function(domainName) {
					byDomain[domainName] = site;
				});

				// Store it by site name
				byName[site.name] = site;

				// Store it by id
				byId[site._id] = site;
			});

			alchemy.overwrite(sitesByDomain, byDomain);
			alchemy.overwrite(sitesByName, byName);
			alchemy.overwrite(sitesById, byId);

			// Emit the siteUpdate event
			that.emit('siteUpdate', sitesById, sitesByDomain, sitesByName);

			if (callback) {
				callback(sitesById, sitesByDomain, sitesByName);
			}
		});
	};
});