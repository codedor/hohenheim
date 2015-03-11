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
var Site = Function.inherits('AppModel', function SiteModel(options) {

	var chimera,
	    list,
	    edit;

	SiteModel.super.call(this, options);

	this.addBehaviour('revision');

	// Create the chimera behaviour
	chimera = this.addBehaviour('chimera');

	// Get the list group
	list = chimera.getActionFields('list');

	list.addField('name');
	list.addField('domain');
	list.addField('script');

	// Get the edit group
	edit = chimera.getActionFields('edit');

	edit.addField('name');
	edit.addField('domain');
	edit.addField('script');
	edit.addField('url');
});

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Site.constitute(function addFields() {

	this.addField('name', 'String');
	this.addField('domain', 'String', {array: true});
	this.addField('script', 'Path');
	this.addField('url', 'String');
});

/**
 * Get all the sites in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Site.setMethod(function getSites(callback) {

	var that = this;

	that.find('all', function(err, results) {

		var byName = {},
		    byDomain = {},
		    byId = {};

		console.log('»»»»»»»»»»', err, results)

		results.forEach(function eachSite(site) {



			// Store it by each domain name
			site.domain.forEach(function(domainName) {
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
});

return
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
			},
			url: {
				type: 'String'
			}
		};

		this.modelEdit = {
			general: {
				title: __('chimera', 'General'),
				fields: [
					'name',
					'domain',
					'script',
					'url'
				]
			},
			control: {
				title: 'Control',
				fields: [
					{
						field: '_id',
						type: 'site_stat'
					}
				]
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

	
});