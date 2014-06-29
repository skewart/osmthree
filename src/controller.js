
// Implementing super simple pub-sub for now.  Can add unsubsubscribe if needed later.

var events = {}

function subscribe( eventName, callback ) {
	if (!(events[ eventName ] instanceof Array )) {
		events[ eventName ] = []
	}
	events[ eventName ].push( callback );
}

function publish( eventName, argsArray ) {
	if (!(events[ eventName ] instanceof Array )) {
		console.warn( "Published an event with no subscribers. --> " + eventName );
		return;
	}
	for ( var i = 0, eL = events[ eventName ].length; i < eL; i++ ) {
		events[ eventName ][i].apply( window, argsArray );
	}
}

module.exports = {
	subscribe: subscribe,
	publish: publish
}
