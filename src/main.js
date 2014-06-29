
var Loader = require("./loader.js"),
	Parser = require("./parser.js");
	Builder = require("./builder.js");

// makeBuildings fetches data from the Overpass API and builds three.js 3d models of buildings for everything
// found within the given bounding box.
// PARAMETERS:
//	scene 	 --> a three.js Scene object that the building models will be added into via its add method
//	bbox 	 --> a four float array specifying the min and max latitude and longitude coordinates whithin which to fetch
//				 buildings.  [ <min_lon>, <min_lat>, <max_lon>, <max_lat> ] (Note: It's lon,lat not lat,lon)
//	params 	 --> an object that contains optional parameters to further control how the buildings are created. They are
//				 are as follows:
//				{
//					origin 			--> an array, [ lon, lat ], describing the poisition of the scene's origin;
//										default is to treat the min point of the bounding box as the origin,	
//					units  			--> 'meter', 'foot', 'inch', or 'millimeter'; default is meter,
//					scale  			--> float describing how much to scale the units for the scene; default is 1.0,
//					mergeGeometry 	--> boolean indicating whether to merge all of the buildings into a single Geomtetry
//										object represented by a single Mesh object, or whether to create individual objects
//										for each building in the OSM data. Merging is recommended when working with large
//										numbers of buildings;  default is false,
//					onDataReady 	--> A callback that will be called when the data is loaded, but before it is added to
//										the scene.  This can be used to bind the building data into a different context, or
//										to filter or modify it before being added to the scene,
//					onMeshReady  	--> A callback which must return either true or false that gets called before a building 
//										mesh is added to the scene. If it returns false then the mesh is not added to the scene. 
//  			} 
function makeBuildings( scene, bbox, params ) {
	
	var 
		params = params || {},
		origin = params.origin || [ bbox[0], bbox[1] ],
		units = params.units || 'meter',
		scale = params.scale || 1.0,
		mergeGeometry = params.mergeGeometry || false,
		onDataReady = params.onDataReady || function() {},
		onMeshReady = params.onMeshReady || function() {return true};

	// TODO Actually use all the params

	var builder = new Builder( scene, scale, origin ),
		parser = new Parser( builder.build ),
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
