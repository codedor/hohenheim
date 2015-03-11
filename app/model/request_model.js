/**
 * The Request Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
var Request = Function.inherits('AppModel', function RequestModel(options) {
	RequestModel.super.call(this, options);
});

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Request.constitute(function addFields() {

	// @todo: disable updated

	this.addField('host', 'String');
	this.addField('path', 'String');
	this.addField('status', 'Number');
	this.addField('request_size', 'Number');
	this.addField('response_size', 'Number');
	this.addField('referer', 'String');
	this.addField('user_agent', 'String');
	this.addField('remote_address', 'String');
	this.addField('duration', 'Number');
});

return;

Model.extend(function RequestModel() {

	this.preInit = function preInit() {

		this.parent();

		// Don't cache this model
		this.cacheDuration = false;

		this.blueprint = {
			updated: false,
			site_id: {
				type: 'ObjectId'
			},
			host: {
				type: 'String'
			},
			path: {
				type: 'String'
			},
			status: {
				type: 'Number'
			},
			request_size: {
				type: 'Number'
			},
			response_size: {
				type: 'Number'
			},
			referer: {
				type: 'String'
			},
			user_agent: {
				type: 'String'
			},
			remote_address: {
				type: 'String'
			},
			duration: {
				type: 'Number'
			}
		};
	};

	/**
	 * Save the given data in the database
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   data   The data to save
	 */
	this.registerHit = function registerHit(data) {
		// We're going to use native mongoose saving, which is faster
		var doc = new this._model(data);
		doc.save();
	};
});