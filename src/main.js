
var Loader = require("./loader.js"),
	Parser = require("./parser.js"),
	Builder = require("./builder.js"),
	ngeo = require('ngeohash');   // TEMPORARY!  Or maybe not?

// makeBuildings fetches data from the Overpass API and builds three.js 3d models of buildings for everything
// found within the given bounding box.
// PARAMETERS:
//	callback --> a function that gets called when a building mesh is completely built and ready to be added to a scene
//	bbox 	 --> a four float array specifying the min and max latitude and longitude coordinates whithin which to fetch
//				 buildings.  [ <min_lon>, <min_lat>, <max_lon>, <max_lat> ] (Note: It's lon,lat not lat,lon)
//	params 	 --> an object that contains optional parameters to further control how the buildings are created.  See the source code.
function makeBuildings( callback, bbox, params ) {
	
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
		builder = new Builder( callback, scale, origin, buildOpts ),
		parser = new Parser( builder.build, onDataReady ),
		loader = new Loader();
	
	loader.load( bbox, parser.parse );

}


// Just gets the building data from the Overpass API and calls the callback, passing in the building data.
function fetchBldgData( callback, bbox, params ) {

	var onDataReady = params.onDataReady || false,
		parser = new Parser( callback, onDataReady ),
		loader = new Loader();

	loader.load( bbox, parser.parse );

}


// Given some building data, creates meshes and calls the callback when it's done
function buildBldgs( callback, buildingData, params ) {

	var buildOpts = {},
		scale = params.scale || 1.0,
		origin = params.origin || findDefaultOrigin( buildingData );
	
	buildOpts.mergeGeometry = params.mergeGeometry || false;
	buildOpts.defaultColor = params.defaultColor || false;
	buildOpts.meshFunction = params.meshFunction || false;
		
	var builder = new Builder( callback, scale, origin, buildOpts );

	builder.build( buildingData );

}


// 
function findDefaultOrigin( bldgs ) {
	console.log( bldgs );
	return [ 0, 0 ];
}


module.exports = {
	makeBuildings: makeBuildings,
	fetchBldgData: fetchBldgData,
	buildBldgs: buildBldgs
}

// Maybe put this in a separte wrapper file, included in a version for use in a non-NPM context
window.OSM3 = {
	makeBuildings: makeBuildings,
	fetchBldgData: fetchBldgData,
	buildBldgs: buildBldgs
}

window.ngeo = ngeo // TEMPORARY!!!!!

// TODO  Go back to making the first argument to makeBuildings a callback instead of a THREE.Scene object.
//		 Accept a THREE.Plane object as an optional argument, and then geohash from its XZ values (instead of lat-lon) to its Y values.
// 	     Export more fine-grained functions/modules within OSMthree that allow control over what happens and when, e.g. with Promises.
//		 	(should these maintain state?  Probably not, they should accept arguments, I think. ) 
