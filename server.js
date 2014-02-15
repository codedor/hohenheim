/**
 * Server
 *
 * The place where the magic starts
 *
 * Alchemy: a node.js framework
 * Copyright 2013, Jelle De Loecker
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright 2013, Jelle De Loecker
 * @link          
 * @license       MIT License (http://www.opensource.org/licenses/mit-license.php)
 */
require('alchemymvc');

// Intercept uncaught exceptions so the server won't crash
// @todo: this should be expanded and integrated into alchemy itself
process.on('uncaughtException', function(error) {

	// Try getting the render object from the arguments
	var render = alchemy.getRenderObject(error.arguments);

	// Indicate we caught an exception
	log.error('Uncaught Exception!', {err: error});
	
	// If we found a render object, we can cut the connection to the client
	if (render) {
		render.res.send(500, 'Uncaught Exception!');
	}
});

// Create the dispatcher
var Dispatcher = new alchemy.classes.SiteDispatcher({
	redirectHost: '10.20.1.1'
});

alchemy.ready(function onAlchemyReady() {

	// Do certain things when alchemy is ready

});