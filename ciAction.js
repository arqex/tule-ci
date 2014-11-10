var config = require('config'),
	logger = require('winston'),
	childProcess = require('child_process'),
	Q = require('q')
;

var types = {
	spawn: function( step ) {
		var deferred = Q.defer(),
			child = childProcess.spawn( step.cmd, step.args, {stdio: 'inherit', cwd: cwd} ),
			cwd = step.cwd || '~'
		;

		child.on( 'error', function( err ){
			console.log( step );
			deferred.reject( err );
		});

		child.on( 'close', function( ){
			deferred.resolve();
		});

		return deferred.promise;
	},

	exec: function( step ) {
		var deferred = Q.defer(),
			child,
			cwd = step.cwd || '~'
		;

		child = childProcess.exec( step.cmd, {cwd: cwd}, function( err, stdout, stdin ){
			if( err ){
				console.log( step );
				return deferred.reject( err );
			}


			console.log( stdout );
			deferred.resolve();
		});

		return deferred.promise;
	},

	forceRestart: function( ) {
		return Q.reject( new Error('restart') );
	}
};

var process = function process( action ) {
	var result = Q.resolve(1),
		illegal = action.steps.filter( function( s ){
			return s.type != 'spawn' && s.type != 'exec' && s.type != 'forceRestart';
		}),
		i = 0
	;

	if( illegal.length )
		return q.reject( new Error( 'Illegal type of step in action' ) );

	action.steps.forEach( function(s){
		i++;
		result = result.then( function(){
			logger.info( s.preMsg || 'Starting step ' + i );
			return types[ s.type ]( s )
				.then( function(){
					logger.info( s.postMsg || 'Finished step ' + i );
				})
			;
		});
	});

	return result;
};

module.exports = {
	ciEvent: function( req, res ){
		var actionName = req.query.action,
			key = req.query.key
		;

		if( !actionName || !key ||
			!config.ci.actions[actionName] || config.ci.actions[actionName].actionKey != key
		) {
			logger.error(' Illegal atempt of using ci hooks, action: ' + actionName + ', key: ' + key );
			return res.send(404);
		}

		process( config.ci.actions[actionName] )
			.then( function(){
				console.log( 'CI action ' + actionName + ' finished ok.' );
				return res.send('ok');
			})
			.catch( function( err ){

				// If it is a forced restart, just throw the exception
				// and let the server restart on fail, since ctl_app command
				// it is not working
				if( err.message == 'restart' )
					throw err;

				logger.error( err.stack );
				return res.send(404);
			})
		;
	},

	errorGet: function( req, res ){
		logger.error( 'Trying to access a CI action through a get request' );
		return res.send(404);
	}

};