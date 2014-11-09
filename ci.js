'use strict';

var config = require('config'),
	qdb = config.require('qdb')
;

var TuleCI = function(){};

TuleCI.prototype = {
	init: function( hooks ){
		config.load('ci');
		console.log('CIIIIIIIIIIIIIIIIIII');
		console.log( config.ci );

		hooks.addFilter('allowedUrls', function( urls ){
			urls.push( '/api' + config.ci.url );
			return urls;
		});

		hooks.addFilter('settings:get:routes:server', function(routes){
			//The splice is necessary to add the route before the default one.
			routes.splice(-1, 0,
				{route: 'get::' + config.ci.url, controller: '/tule-ci/ciAction::errorGet'}
			);
			routes.splice(-1, 0,
				{route: 'post::' + config.ci.url, controller: '/tule-ci/ciAction::ciEvent'}
			);
			return routes;
		});
	},
};

module.exports = new TuleCI();