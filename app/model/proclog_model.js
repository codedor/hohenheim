/**
 * The Proclog Model
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.2
 * @version  0.0.2
 */
Model.extend(function ProclogModel() {

	this.preInit = function preInit() {

		this.parent();

		// Don't cache this model
		this.cacheDuration = false;

		this.blueprint = {
			site_id: {
				type: 'ObjectId'
			},
			log: {
				type: 'Object',
				array: true
			}
		};
	};
});