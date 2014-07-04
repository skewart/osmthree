
var Loader = require("./loader.js"),
	Parser = require("./parser.js"),
	Builder = require("./builder.js");

// makeBuildings fetches data from the Overpass API and builds three.js 3d models of buildings for everything
// found within the given bounding box.
// PARAMETERS:
//	scene 	 --> a three.js Scene object that the building models will be added into via its add method
//	bbox 	 --> a four float array specifying the min and max latitude and longitude coordinates whithin which to fetch
//				 buildings.  [ <min_lon>, <min_lat>, <max_lon>, <max_lat> ] (Note: It's lon,lat not lat,lon)
//	params 	 --> an object that contains optional parameters to further control how the buildings are created.  See the source code.
function makeBuildings( scene, bbox, params ) {
	
	var 
		buildOpts = {},
		params = params || {}, 
		origin = params.origin || [ bbox[0], bbox[1] ],  		// an array, [ lon, lat ], describing the poisition of the scene's origin
		units = params.units || 'meter', 						// 'meter', 'foot', 'inch', or 'millimeter'
		scale = params.scale || 1.0,  							// float describing how much to scale the units for the scene
		onDataReady = params.onDataReady || false;				// called when data is loaded from Overpass, before THREE objects are created

	buildOpts.mergeGeometry = params.mergeGeometry || false;  	// create one big Geometry and Mesh with all the buildings
	buildOpts.defaultColor = params.defaultColor || false;		// most buildings will be this color - default is 0xF0F0F0
	buildOpts.meshFunction = params.meshFunction || false;		// custom function for creating the THREE.Mesh objects

	var 
		builder = new Builder( scene, scale, origin, buildOpts ),
		parser = new Parser( builder.build, onDataReady ),
		loader = new Loader();
	
	loader.load( bbox, parser.parse );

}


module.exports = {
	makeBuildings: makeBuildings
}

// Maybe put this in a separte wrapper file, included in a version for use in a non-NPM context
window.OSM3 = {
	makeBuildings: makeBuildings
}
