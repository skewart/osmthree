
var loader = require("./loader.js"),
	data = require("./data.js");
	Builder = require("./builder.js");

function loadData( callback, bbox, params ) {
	
	// TODO Actually consider the params...
	// 		check and process things, etc...
	params = params || {};

	var scale = params.scale || 100000;

	var builder = new Builder( callback, scale, [ 114.15, 22.2675 ] );
	
	loader.load( bbox, data.process );

}

window.OSM3 = {
	loadData: loadData
}
